import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const distEntryPath = path.resolve(repoRoot, 'dist', 'index.js');
const packageJsonPath = path.resolve(repoRoot, 'package.json');

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function ensureBuiltPackage() {
  if (!(await fileExists(distEntryPath))) {
    throw new Error('dist/index.js was not found. Run `npm run build` before `npm run qa:real-world`.');
  }

  const moduleUrl = pathToFileURL(distEntryPath).href;
  return import(moduleUrl);
}

async function collectEpubs(dirPath, rootDir = dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectEpubs(fullPath, rootDir)));
      continue;
    }

    if (!entry.name.toLowerCase().endsWith('.epub')) {
      continue;
    }

    results.push({
      file: path.relative(rootDir, fullPath),
      tags: [],
      notes: '',
    });
  }

  return results.sort((a, b) => a.file.localeCompare(b.file, undefined, { sensitivity: 'base' }));
}

function normaliseManifestBooks(manifest) {
  if (!manifest || !Array.isArray(manifest.books)) {
    throw new Error('Manifest must be a JSON object with a `books` array.');
  }

  return manifest.books.map((book) => {
    if (!book || typeof book.file !== 'string' || book.file.trim() === '') {
      throw new Error('Each manifest entry must include a non-empty `file` string.');
    }

    return {
      file: book.file,
      tags: Array.isArray(book.tags) ? book.tags : [],
      notes: typeof book.notes === 'string' ? book.notes : '',
    };
  });
}

function safeOutputRelativePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function printUsage() {
  console.log(`Usage:
  npm run qa:real-world -- --input-dir <dir> [--output-dir <dir>] [--report <file>] [--manifest <file>] [--sample <n>]

Options:
  --input-dir   Directory containing source EPUBs.
  --output-dir  Directory for converted EPUB output. Default: reports/real-world-output
  --report      JSON report path. Default: reports/real-world-regression.json
  --manifest    Optional JSON manifest listing a trusted regression subset.
  --sample      Optional limit for quick spot runs.
  --help        Show this help text.
`);
}

const { values } = parseArgs({
  options: {
    'input-dir': { type: 'string' },
    'output-dir': { type: 'string' },
    report: { type: 'string' },
    manifest: { type: 'string' },
    sample: { type: 'string' },
    help: { type: 'boolean' },
  },
});

if (values.help || !values['input-dir']) {
  printUsage();
  process.exit(values.help ? 0 : 1);
}

const inputDir = path.resolve(process.cwd(), values['input-dir']);
const outputDir = path.resolve(process.cwd(), values['output-dir'] ?? 'reports/real-world-output');
const reportPath = path.resolve(process.cwd(), values.report ?? 'reports/real-world-regression.json');
const manifestPath = values.manifest ? path.resolve(process.cwd(), values.manifest) : undefined;
const sampleSize = values.sample ? Number.parseInt(values.sample, 10) : undefined;

if (sampleSize !== undefined && (!Number.isInteger(sampleSize) || sampleSize <= 0)) {
  throw new Error('--sample must be a positive integer.');
}

if (!(await fileExists(inputDir))) {
  throw new Error(`Input directory does not exist: ${inputDir}`);
}

const { inspectBook, convertBook } = await ensureBuiltPackage();
const packageJson = await readJson(packageJsonPath);

let books = manifestPath
  ? normaliseManifestBooks(await readJson(manifestPath))
  : await collectEpubs(inputDir);

if (sampleSize) {
  books = books.slice(0, sampleSize);
}

if (books.length === 0) {
  throw new Error('No EPUBs found for regression run.');
}

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(path.dirname(reportPath), { recursive: true });

const results = [];
const startedAt = Date.now();

for (const [index, book] of books.entries()) {
  const inputPath = path.resolve(inputDir, book.file);
  const outputPath = path.join(outputDir, safeOutputRelativePath(book.file));
  const runStarted = Date.now();

  console.log(`[${index + 1}/${books.length}] ${book.file}`);

  try {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const inspection = await inspectBook(inputPath);
    const result = await convertBook(inputPath, { outputPath });
    const outputStat = await fs.stat(outputPath);

    results.push({
      file: book.file,
      tags: book.tags,
      notes: book.notes,
      status: 'ok',
      title: inspection.title,
      author: inspection.author,
      warnings: inspection.warnings,
      processedFiles: result.stats.processedFiles,
      skippedFiles: result.stats.skippedFiles,
      inputBytes: result.stats.inputBytes,
      outputBytes: outputStat.size,
      durationMs: Date.now() - runStarted,
      outputPath: path.relative(process.cwd(), outputPath),
    });
  } catch (error) {
    results.push({
      file: book.file,
      tags: book.tags,
      notes: book.notes,
      status: 'failed',
      durationMs: Date.now() - runStarted,
      error: {
        name: error?.name,
        code: error?.code,
        message: error?.message,
        context: error?.context,
        cause: error?.cause
          ? {
              name: error.cause.name,
              code: error.cause.code,
              message: error.cause.message,
              path: error.cause.path,
            }
          : undefined,
      },
    });
    console.log(`  FAILED: ${error?.message ?? error}`);
  }
}

const report = {
  package: packageJson.version,
  inputDir,
  outputDir,
  manifestPath,
  startedAt: new Date(startedAt).toISOString(),
  finishedAt: new Date().toISOString(),
  totalDurationMs: Date.now() - startedAt,
  total: results.length,
  succeeded: results.filter((result) => result.status === 'ok').length,
  failed: results.filter((result) => result.status === 'failed').length,
  results,
};

await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

console.log(`\nReport written to ${reportPath}`);
console.log(JSON.stringify({
  total: report.total,
  succeeded: report.succeeded,
  failed: report.failed,
  totalDurationMs: report.totalDurationMs,
}, null, 2));
