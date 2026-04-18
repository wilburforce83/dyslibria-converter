import path from 'node:path';
import fs from 'fs-extra';
import JSZip from 'jszip';

const DETERMINISTIC_DATE = new Date('2000-01-01T00:00:00.000Z');

async function collectFiles(rootDir: string, currentDir = rootDir): Promise<string[]> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(rootDir, entryPath)));
    } else {
      files.push(path.relative(rootDir, entryPath));
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

export async function createEpubBuffer(resourcesPath: string, deterministic = true): Promise<Buffer> {
  const zip = new JSZip();

  zip.file('mimetype', 'application/epub+zip', {
    compression: 'STORE',
    date: deterministic ? DETERMINISTIC_DATE : undefined
  });

  const files = await collectFiles(resourcesPath);

  for (const relativePath of files) {
    if (relativePath === 'mimetype') {
      continue;
    }

    const filePath = path.join(resourcesPath, relativePath);
    const fileData = await fs.readFile(filePath);
    const zipPath = relativePath.split(path.sep).join(path.posix.sep);

    zip.file(zipPath, fileData, {
      binary: true,
      date: deterministic ? DETERMINISTIC_DATE : undefined
    });
  }

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9
    }
  });
}
