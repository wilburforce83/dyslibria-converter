import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import { describe, expect, test, vi } from 'vitest';

import {
  convertBook,
  DEFAULT_PRESET_ID,
  inspectBook,
  processHtmlFiles,
  resolvePresetId,
  resolveZipEntryPath,
  createEpubBuffer,
} from '../src';
import { DEFAULT_DICTIONARY_PATH } from '../src/config/defaults';
import { createMinimalEpub } from './helpers/epubTestUtils';

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+lmVsAAAAASUVORK5CYII=';

describe('converter parity', () => {
  test('default dictionary path resolves to an existing file', async () => {
    expect(await fs.pathExists(DEFAULT_DICTIONARY_PATH)).toBe(true);
  });

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
    expect(result.metricsReport.files[0]?.metrics?.totalWords).toBeGreaterThan(0);
    expect(content).toContain('dyslibria-engine');
    expect(content).toContain('dyslibria-paragraph');
    expect(content).toContain('dyslibria-word--emphasised');
    expect(content).toMatch(/<pre>Literal sample text<\/pre>/);
    expect(content).not.toMatch(/<pre>.*dyslibria-word/s);
  });

  test('processHtmlFiles uses the shared default preset when no profile input is provided', async () => {
    const tempDir = await makeTempDir('dyslibria-default-preset-');
    const filePath = path.join(tempDir, 'default-preset.xhtml');

    await fs.writeFile(filePath, '<p>Default preset resolution should stay aligned with the published UI default.</p>');

    const result = await processHtmlFiles(tempDir, new Set());

    expect(result.metricsReport.profileSource.type).toBe('default');
    expect(result.metricsReport.profileUsed.id).toBe(DEFAULT_PRESET_ID);
    expect(result.metricsReport.profileUsed.name).toBe('Dyslibria Default');
  });

  test('resolvePresetId supports semantic shorthand flags and legacy aliases', () => {
    expect(resolvePresetId('balanced')).toBe('dyslibria-balanced');
    expect(resolvePresetId('dyslibria_default')).toBe('intense-scaffolding');
    expect(resolvePresetId('technical-reading')).toBe('intense-scaffolding');
    expect(resolvePresetId('unknown-preset')).toBeNull();
  });

  test('processHtmlFiles accepts a presetId without requiring profile JSON', async () => {
    const tempDir = await makeTempDir('dyslibria-preset-id-');
    const filePath = path.join(tempDir, 'preset-id.xhtml');

    await fs.writeFile(filePath, '<p>Balanced preset shorthand should resolve without custom profile JSON.</p>');

    const result = await processHtmlFiles(tempDir, { presetId: 'balanced' });

    expect(result.metricsReport.profileSource.type).toBe('preset');
    expect(result.metricsReport.profileSource.presetId).toBe('dyslibria-balanced');
    expect(result.metricsReport.profileUsed.id).toBe('dyslibria-balanced');
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
    expect(content).toContain('AT&amp;T');
    expect(content).toContain('Tom &amp;');
    expect(content).toContain('&amp; Blues');
    expect(content).toMatch(/<pre>R&amp;D &amp;&amp; Co\.<\/pre>/);
    expect(content).not.toMatch(/&amp;amp;/);
    expect(result.metricsReport.files[0]?.metrics?.totalWords).toBeGreaterThan(0);
  });

  test('processHtmlFiles can handle XHTML fragments without a body wrapper', async () => {
    const tempDir = await makeTempDir('dyslibria-fragment-');
    const filePath = path.join(tempDir, 'fragment.xhtml');

    await fs.writeFile(filePath, '<p>Loose fragment text only.</p>');

    const result = await processHtmlFiles(tempDir, new Set());
    const content = await fs.readFile(filePath, 'utf-8');

    expect(result.processedFiles).toBe(1);
    expect(content).toContain('dyslibria-engine');
    expect(content).toContain('dyslibria-paragraph');
    expect(content).toContain('fragment');
  });

  test('processHtmlFiles preserves empty anchors without serializing them as self-closing tags', async () => {
    const tempDir = await makeTempDir('dyslibria-empty-anchor-');
    const filePath = path.join(tempDir, 'empty-anchor.xhtml');

    await fs.writeFile(
      filePath,
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>Before <a></a>after and <a id="marker"></a>again.</p>
  </body>
</html>`
    );

    const result = await processHtmlFiles(tempDir, new Set());
    const content = await fs.readFile(filePath, 'utf-8');

    expect(result.processedFiles).toBe(1);
    expect(result.errors).toEqual([]);
    expect(content).not.toMatch(/<a\b[^>]*\/>/i);
    expect(content).toContain('<a></a>');
    expect(content).toContain('<a id="marker"></a>');
    expect(content).toContain('dyslibria-word');
  });

  test('processHtmlFiles neutralizes class-based color spans while styling across inline fragments', async () => {
    const tempDir = await makeTempDir('dyslibria-inline-color-');
    const filePath = path.join(tempDir, 'inline-color.xhtml');

    await fs.writeFile(
      filePath,
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <style>
      .blue { color: #0066cc; }
      .red { color: #cc3300; }
    </style>
  </head>
  <body>
    <p><span class="blue">Extra</span><span class="red">ordinary</span></p>
  </body>
</html>`
    );

    const result = await processHtmlFiles(tempDir, {
      profile: {
        emphasisDensity: 1,
        maxEmphasisPerSentence: 6,
        maxEmphasisPerParagraph: 1
      }
    });
    const content = await fs.readFile(filePath, 'utf-8');

    expect(result.processedFiles).toBe(1);
    expect(result.errors).toEqual([]);
    expect(content).not.toContain('color: #0066cc');
    expect(content).not.toContain('color: #cc3300');
    expect(content).toMatch(
      /<span class="blue"><span class="dyslibria-word [^>]*dyslibria-word--emphasised[^>]*>Extra<\/span><\/span><span class="red"><span class="dyslibria-word [^>]*dyslibria-word--emphasised[^>]*>ordinary<\/span><\/span>/
    );
    expect(
      (
        result.metricsReport.files[0]?.debugData?.sourceStyleSanitization as {
          presentationDeclarationsRemoved?: number;
        }
      )?.presentationDeclarationsRemoved
    ).toBe(2);
    expect(result.metricsReport.files[0]?.metrics?.anchorCount).toBeGreaterThan(0);
  });

  test('processHtmlFiles strips source color/background rules, stale !important text rules, and HTML colour attributes', async () => {
    const tempDir = await makeTempDir('dyslibria-style-sanitize-');
    const filePath = path.join(tempDir, 'important-styles.xhtml');

    await fs.writeFile(
      filePath,
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <style>
      body { line-height: 1.05 !important; background-color: #fff; }
      p.note { font: italic 1em/1.1 Georgia !important; color: #c00 !important; }
      img.hero { display: block !important; }
    </style>
  </head>
  <body bgcolor="#fff" text="#111111">
    <p class="note" style="line-height: 1 !important; color: #c00 !important; background: #fff;">Source styling should be sanitized.</p>
  </body>
</html>`
    );

    const result = await processHtmlFiles(tempDir, {
      profile: {
        visual: {
          lineHeight: 1.9
        }
      }
    });
    const content = await fs.readFile(filePath, 'utf-8');
    const fileMetrics = result.metricsReport.files[0];

    expect(content).toContain('body { line-height: 1.05; }');
    expect(content).toContain('p.note { font: italic 1em/1.1 Georgia; }');
    expect(content).toContain('img.hero { display: block !important; }');
    expect(content).toContain('style="line-height: 1;"');
    expect(content).not.toContain('color: #c00');
    expect(content).not.toContain('background: #fff');
    expect(content).not.toContain('background-color: #fff');
    expect(content).not.toContain('bgcolor=');
    expect(content).not.toContain('text=');
    expect(fileMetrics?.warnings.some((warning) => warning.title === 'Source text style overrides sanitized')).toBe(true);
    expect(
      (
        fileMetrics?.debugData?.sourceStyleSanitization as {
          declarationsSanitized?: number;
          importanceDirectivesRemoved?: number;
          presentationDeclarationsRemoved?: number;
          presentationalAttributesRemoved?: number;
        }
      )?.declarationsSanitized
    ).toBe(7);
    expect(
      (
        fileMetrics?.debugData?.sourceStyleSanitization as {
          importanceDirectivesRemoved?: number;
        }
      )?.importanceDirectivesRemoved
    ).toBe(3);
    expect(
      (
        fileMetrics?.debugData?.sourceStyleSanitization as {
          presentationDeclarationsRemoved?: number;
        }
      )?.presentationDeclarationsRemoved
    ).toBe(4);
    expect(
      (
        fileMetrics?.debugData?.sourceStyleSanitization as {
          presentationalAttributesRemoved?: number;
        }
      )?.presentationalAttributesRemoved
    ).toBe(2);
  });

  test('processHtmlFiles strips source color and background rules from linked stylesheet files', async () => {
    const tempDir = await makeTempDir('dyslibria-linked-style-sanitize-');
    const stylesDir = path.join(tempDir, 'styles');
    const filePath = path.join(tempDir, 'chapter.xhtml');
    const cssPath = path.join(stylesDir, 'book.css');
    const logger = vi.fn();

    await fs.ensureDir(stylesDir);
    await fs.writeFile(
      filePath,
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <link rel="stylesheet" type="text/css" href="styles/book.css"/>
  </head>
  <body>
    <p class="note">Linked stylesheet text should still convert cleanly.</p>
  </body>
</html>`
    );
    await fs.writeFile(
      cssPath,
      `body { color: #111111; background: #fef1e7; }
p.note { line-height: 1.1 !important; }
a { text-decoration: underline; }`
    );

    const result = await processHtmlFiles(tempDir, { logger });
    const css = await fs.readFile(cssPath, 'utf-8');

    expect(result.processedFiles).toBe(1);
    expect(result.errors).toEqual([]);
    expect(css).not.toContain('color: #111111');
    expect(css).not.toContain('background: #fef1e7');
    expect(css).toContain('p.note { line-height: 1.1; }');
    expect(css).toContain('a { text-decoration: underline; }');
    expect(logger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        step: 'transform',
        message: 'Sanitized source presentation rules in source EPUB stylesheets'
      })
    );
  });

  test('processHtmlFiles force-applies relaxed line spacing for EPUB output when above baseline', async () => {
    const tempDir = await makeTempDir('dyslibria-line-height-force-');
    const filePath = path.join(tempDir, 'line-height.xhtml');

    await fs.writeFile(
      filePath,
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p><a href="#note">Relaxed spacing should survive stubborn readers.</a></p>
  </body>
</html>`
    );

    await processHtmlFiles(tempDir, {
      profile: {
        visual: {
          lineHeight: 1.86
        }
      }
    });
    const content = await fs.readFile(filePath, 'utf-8');

    expect(content).toContain('line-height: 1.86 !important;');
    expect(content).toContain('.dyslibria-paragraph *');
    expect(content).toContain('line-height: inherit !important;');
  });

  test('processHtmlFiles keeps compact line spacing lightweight at or below baseline', async () => {
    const tempDir = await makeTempDir('dyslibria-line-height-normal-');
    const filePath = path.join(tempDir, 'line-height.xhtml');

    await fs.writeFile(
      filePath,
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>Compact spacing should not emit forced line-height rules.</p>
  </body>
</html>`
    );

    await processHtmlFiles(tempDir, {
      profile: {
        visual: {
          lineHeight: 1.6
        }
      }
    });
    const content = await fs.readFile(filePath, 'utf-8');

    expect(content).toContain('line-height: 1.6;');
    expect(content).not.toContain('line-height: 1.6 !important;');
    expect(content).not.toContain('.dyslibria-paragraph *');
  });

  test('processHtmlFiles normalizes paragraph whitespace so source hard-wraps do not render as forced line breaks', async () => {
    const tempDir = await makeTempDir('dyslibria-whitespace-normal-');
    const filePath = path.join(tempDir, 'hard-wraps.xhtml');

    await fs.writeFile(
      filePath,
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>Wrapped source text
should still reflow naturally inside the reader.</p>
  </body>
</html>`
    );

    await processHtmlFiles(tempDir, new Set());
    const content = await fs.readFile(filePath, 'utf-8');

    expect(content).toContain('white-space: normal;');
    expect(content).not.toContain('white-space: pre-wrap;');
  });

  test('processHtmlFiles neutralizes root page colour and background so reader themes can take over', async () => {
    const tempDir = await makeTempDir('dyslibria-root-theme-');
    const filePath = path.join(tempDir, 'themeable.xhtml');

    await fs.writeFile(
      filePath,
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <style>
      body { background: #ffffff; color: #111111; }
    </style>
  </head>
  <body>
    <p>Reader themes should be able to recolour this page.</p>
  </body>
</html>`
    );

    await processHtmlFiles(tempDir, {
      profile: {
        emphasisDensity: 0.2
      }
    });
    const content = await fs.readFile(filePath, 'utf-8');

    expect(content).toMatch(/<html[^>]*style="[^"]*color: inherit !important;[^"]*background: transparent !important;[^"]*background-color: transparent !important[^"]*"/);
    expect(content).toMatch(/<body[^>]*style="[^"]*color: inherit !important;[^"]*background: transparent !important;[^"]*background-color: transparent !important[^"]*"/);
  });

  test('processHtmlFiles accepts a reader configuration file and reports per-file metrics', async () => {
    const tempDir = await makeTempDir('dyslibria-reader-config-');
    const filePath = path.join(tempDir, 'chapter.xhtml');
    const profilePath = path.join(tempDir, 'reader-config.json');

    await fs.writeFile(filePath, '<p>Configured output should still report metrics.</p>');
    await fs.writeJson(
      profilePath,
      {
        kind: 'dyslibria-reader-configuration',
        version: '1.0.0',
        configurationId: 'reader-123',
        profile: {
          emphasisDensity: 1,
          maxEmphasisPerSentence: 6,
          maxEmphasisPerParagraph: 1
        }
      },
      { spaces: 2 }
    );

    const result = await processHtmlFiles(tempDir, { profilePath });
    const [fileMetrics] = result.metricsReport.files;

    expect(result.metricsReport.profileSource.type).toBe('file-reader-configuration');
    expect(result.metricsReport.profileUsed.emphasisDensity).toBe(1);
    expect(fileMetrics?.filePath).toBe('chapter.xhtml');
    expect(fileMetrics?.metrics?.totalWords).toBeGreaterThan(0);
    expect(fileMetrics?.metrics?.anchorCount).toBeGreaterThan(0);
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
    expect(result.processingMetrics.files[0]?.filePath).toBe('OEBPS/chapter1.xhtml');
    expect(result.processingMetrics.totals.totalWords).toBeGreaterThan(0);
    expect(result.outputBuffer).toBeInstanceOf(Buffer);

    const chapterEntry = new AdmZip(outputPath).getEntry('OEBPS/chapter1.xhtml');
    const chapterContent = new AdmZip(outputPath).readAsText(chapterEntry!);

    expect(chapterContent).toContain('dyslibria-engine');
    expect(chapterContent).toContain('dyslibria-word--emphasised');
    expect(logger).toHaveBeenCalled();
  });

  test('convertBook strips conflicting text !important rules from external EPUB stylesheets', async () => {
    const tempDir = await makeTempDir('dyslibria-external-css-');
    const inputPath = path.join(tempDir, 'book.epub');
    const outputPath = path.join(tempDir, 'book-dyslibria.epub');

    await createMinimalEpub(inputPath, {
      title: 'External CSS Book',
      author: 'Codex',
      chapterMarkup: `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>External CSS Book</title>
    <link rel="stylesheet" type="text/css" href="styles/book.css"/>
  </head>
  <body>
    <p class="chapter-copy">Relaxed spacing should win.</p>
  </body>
</html>`,
      assets: [
        {
          fileName: 'styles/book.css',
          mediaType: 'text/css',
          contentBuffer: Buffer.from(
            `body { line-height: 1.05 !important; }
p.chapter-copy { font: italic 1em/1.08 Georgia !important; }
img.cover { display: block !important; }`,
            'utf-8'
          )
        }
      ]
    });

    await convertBook(inputPath, {
      outputPath,
      profile: {
        visual: {
          lineHeight: 1.9
        }
      }
    });

    const zip = new AdmZip(outputPath);
    const stylesheet = zip.readAsText(zip.getEntry('OEBPS/styles/book.css')!);

    expect(stylesheet).toContain('body { line-height: 1.05; }');
    expect(stylesheet).toContain('p.chapter-copy { font: italic 1em/1.08 Georgia; }');
    expect(stylesheet).toContain('img.cover { display: block !important; }');
  });
});
