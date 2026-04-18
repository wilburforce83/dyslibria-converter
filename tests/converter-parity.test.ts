import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import { describe, expect, test, vi } from 'vitest';

import { convertBook, inspectBook, processHtmlFiles, resolveZipEntryPath, createEpubBuffer } from '../src';
import { createMinimalEpub } from './helpers/epubTestUtils';

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+lmVsAAAAASUVORK5CYII=';

describe('converter parity', () => {
  test('resolveZipEntryPath rejects zip-slip style archive entries', async () => {
    const tempDir = await makeTempDir('dyslibria-zip-slip-');
    const outputPath = path.join(tempDir, 'extracted');

    expect(() => resolveZipEntryPath(outputPath, '../escape.txt')).toThrow(/Unsafe archive entry path|escapes extraction directory/);
    expect(await fs.pathExists(path.join(tempDir, 'escape.txt'))).toBe(false);
  });

  test('processHtmlFiles converts readable text but leaves preformatted blocks alone', async () => {
    const tempDir = await makeTempDir('dyslibria-html-');
    const filePath = path.join(tempDir, 'chapter.xhtml');

    await fs.writeFile(
      filePath,
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>This smoke test should be converted.</p>
    <pre>Literal sample text</pre>
  </body>
</html>`
    );

    const result = await processHtmlFiles(tempDir, new Set());
    const content = await fs.readFile(filePath, 'utf-8');

    expect(result.processedFiles).toBe(1);
    expect(result.errors).toEqual([]);
    expect(content).toMatch(/<p><b>Th<\/b>is <b>sm<\/b>oke <b>te<\/b>st/);
    expect(content).toMatch(/<pre>Literal sample text<\/pre>/);
    expect(content).not.toMatch(/<pre><b>/);
  });

  test('processHtmlFiles escapes stray ampersands without double-escaping valid entities', async () => {
    const tempDir = await makeTempDir('dyslibria-entities-');
    const filePath = path.join(tempDir, 'entities.xhtml');

    await fs.writeFile(
      filePath,
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>AT&T and Tom &amp; Jerry & Blues</p>
    <pre>R&D && Co.</pre>
  </body>
</html>`
    );

    const result = await processHtmlFiles(tempDir, new Set());
    const content = await fs.readFile(filePath, 'utf-8');

    expect(result.processedFiles).toBe(1);
    expect(result.errors).toEqual([]);
    expect(content).toMatch(/<b>A<\/b>T&amp;<b>T<\/b>/);
    expect(content).toMatch(/<b>T<\/b>om &amp; <b>Je<\/b>rry &amp; <b>Bl<\/b>ues/);
    expect(content).toMatch(/<pre>R&amp;D &amp;&amp; Co\.<\/pre>/);
    expect(content).not.toMatch(/&amp;amp;/);
    expect(content).not.toMatch(/&amp;<b>a<\/b>mp;/);
  });

  test('processHtmlFiles can handle XHTML fragments without a body wrapper', async () => {
    const tempDir = await makeTempDir('dyslibria-fragment-');
    const filePath = path.join(tempDir, 'fragment.xhtml');

    await fs.writeFile(filePath, '<p>Loose fragment text only.</p>');

    const result = await processHtmlFiles(tempDir, new Set());
    const content = await fs.readFile(filePath, 'utf-8');

    expect(result.processedFiles).toBe(1);
    expect(content).toMatch(/<p><b>Lo<\/b>ose <b>frag<\/b>ment <b>te<\/b>xt <b>on<\/b>ly\.<\/p>/);
  });

  test('createEpubBuffer writes EPUB entry paths using forward slashes', async () => {
    const tempDir = await makeTempDir('dyslibria-create-');
    const resourcesPath = path.join(tempDir, 'resources');

    await fs.ensureDir(path.join(resourcesPath, 'META-INF'));
    await fs.ensureDir(path.join(resourcesPath, 'OEBPS', 'Text'));
    await fs.writeFile(path.join(resourcesPath, 'mimetype'), 'application/epub+zip');
    await fs.writeFile(
      path.join(resourcesPath, 'META-INF', 'container.xml'),
      '<?xml version="1.0" encoding="UTF-8"?><container></container>'
    );
    await fs.writeFile(path.join(resourcesPath, 'OEBPS', 'Text', 'chapter.xhtml'), '<p>hello world</p>');

    const buffer = await createEpubBuffer(resourcesPath);
    const entryNames = new AdmZip(buffer).getEntries().map((entry) => entry.entryName);

    expect(entryNames).toContain('OEBPS/Text/chapter.xhtml');
    expect(entryNames.some((entryName) => entryName.includes('\\'))).toBe(false);
  });

  test('inspectBook reads title, author, and keeps explicit OPF cover declarations', async () => {
    const tempDir = await makeTempDir('dyslibria-inspect-');
    const inputPath = path.join(tempDir, 'with-cover.epub');

    await createMinimalEpub(inputPath, {
      title: 'Cover Book',
      author: 'Codex',
      coverFileName: 'images/cover.png',
      coverImageBase64: tinyPngBase64
    });

    const inspection = await inspectBook(inputPath);

    expect(inspection.title).toBe('Cover Book');
    expect(inspection.author).toBe('Codex');
    expect(inspection.coverEntryName).toBe('OEBPS/images/cover.png');
    expect(inspection.htmlEntries).toContain('OEBPS/chapter1.xhtml');
  });

  test('convertBook writes a converted EPUB and reports stats', async () => {
    const tempDir = await makeTempDir('dyslibria-convert-');
    const inputPath = path.join(tempDir, 'book.epub');
    const outputPath = path.join(tempDir, 'book-dyslibria.epub');

    await createMinimalEpub(inputPath, {
      title: 'Valid Book',
      author: 'Codex',
      chapterText: 'This smoke test should be converted.'
    });

    const logger = vi.fn();
    const result = await convertBook(inputPath, {
      outputPath,
      logger
    });

    expect(await fs.pathExists(outputPath)).toBe(true);
    expect(result.inspection.title).toBe('Valid Book');
    expect(result.stats.processedFiles).toBe(1);
    expect(result.outputBuffer).toBeInstanceOf(Buffer);

    const chapterEntry = new AdmZip(outputPath).getEntry('OEBPS/chapter1.xhtml');
    const chapterContent = new AdmZip(outputPath).readAsText(chapterEntry!);

    expect(chapterContent).toMatch(/<b>Th<\/b>is <b>sm<\/b>oke <b>te<\/b>st/);
    expect(logger).toHaveBeenCalled();
  });
});
