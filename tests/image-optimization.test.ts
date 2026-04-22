import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import sharp from 'sharp';
import { describe, expect, test, vi } from 'vitest';

import { convertBook, inspectBook } from '../src';
import { createMinimalEpub } from './helpers/epubTestUtils';

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function createPatternBuffer(width: number, height: number, channels: 3 | 4, useAlpha = false): Buffer {
  const buffer = Buffer.alloc(width * height * channels);
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      buffer[offset] = (x * 17 + y * 13) % 256;
      buffer[offset + 1] = (x * 9 + y * 23 + 64) % 256;
      buffer[offset + 2] = (x * 31 + y * 7 + 128) % 256;

      if (channels === 4) {
        buffer[offset + 3] = useAlpha ? (x * 11 + y * 5) % 256 : 255;
      }

      offset += channels;
    }
  }

  return buffer;
}

async function createPatternedJpegBuffer(width = 2200, height = 1800): Promise<Buffer> {
  return sharp(createPatternBuffer(width, height, 3), {
    raw: { width, height, channels: 3 }
  }).jpeg({
    quality: 97
  }).withMetadata().toBuffer();
}

async function createPatternedPngBuffer(width = 1700, height = 1700, useAlpha = false): Promise<Buffer> {
  const channels = useAlpha ? 4 : 3;

  return sharp(createPatternBuffer(width, height, channels, useAlpha), {
    raw: { width, height, channels }
  }).png({
    compressionLevel: 0,
    palette: false
  }).withMetadata().toBuffer();
}

function readZipEntryBuffer(zip: AdmZip, entryName: string): Buffer {
  const entry = zip.getEntry(entryName);
  expect(entry).toBeTruthy();

  const content = zip.readFile(entry!);
  expect(content).toBeTruthy();

  return content!;
}

describe('image optimization', () => {
  test('convertBook leaves image assets unchanged when image optimization is disabled', async () => {
    const tempDir = await makeTempDir('dyslibria-images-disabled-');
    const inputPath = path.join(tempDir, 'book.epub');
    const jpegBuffer = await createPatternedJpegBuffer();

    await createMinimalEpub(inputPath, {
      chapterMarkup: `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>This image should stay byte-for-byte identical.</p>
    <img src="images/photo.jpg" alt="Photo"/>
  </body>
</html>`,
      assets: [
        {
          fileName: 'images/photo.jpg',
          contentBuffer: jpegBuffer
        }
      ]
    });

    const result = await convertBook(inputPath, {
      optimizeImages: false
    });

    const outputZip = new AdmZip(result.outputBuffer!);
    const outputJpegBuffer = readZipEntryBuffer(outputZip, 'OEBPS/images/photo.jpg');

    expect(outputJpegBuffer.equals(jpegBuffer)).toBe(true);
    expect(result.stats.imageOptimization).toBeUndefined();
  });

  test('convertBook reduces large JPEG images with the default optimization profile', async () => {
    const tempDir = await makeTempDir('dyslibria-jpeg-optimize-');
    const inputPath = path.join(tempDir, 'book.epub');
    const jpegBuffer = await createPatternedJpegBuffer();

    await createMinimalEpub(inputPath, {
      chapterMarkup: `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>This JPEG should be shrunk for ebook use.</p>
    <img src="images/photo.jpg" alt="Photo"/>
  </body>
</html>`,
      assets: [
        {
          fileName: 'images/photo.jpg',
          contentBuffer: jpegBuffer
        }
      ]
    });

    const result = await convertBook(inputPath, {
      optimizeImages: true
    });

    const outputZip = new AdmZip(result.outputBuffer!);
    const outputJpegBuffer = readZipEntryBuffer(outputZip, 'OEBPS/images/photo.jpg');
    const metadata = await sharp(outputJpegBuffer).metadata();
    const inspection = await inspectBook({
      buffer: result.outputBuffer!,
      filename: 'optimized.epub'
    });

    expect(outputJpegBuffer.length).toBeLessThan(jpegBuffer.length);
    expect(metadata.width).toBeLessThanOrEqual(1600);
    expect(metadata.height).toBeLessThanOrEqual(1600);
    expect(result.stats.imageOptimization).toMatchObject({
      processedImages: 1,
      optimizedImages: 1,
      failedImages: 0
    });
    expect(result.stats.imageOptimization?.bytesSaved).toBeGreaterThan(0);
    expect(inspection.htmlEntries).toContain('OEBPS/chapter1.xhtml');
  });

  test('convertBook reduces large PNG images with the default optimization profile', async () => {
    const tempDir = await makeTempDir('dyslibria-png-optimize-');
    const inputPath = path.join(tempDir, 'book.epub');
    const pngBuffer = await createPatternedPngBuffer();

    await createMinimalEpub(inputPath, {
      chapterMarkup: `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>This PNG should compress well.</p>
    <img src="images/diagram.png" alt="Diagram"/>
  </body>
</html>`,
      assets: [
        {
          fileName: 'images/diagram.png',
          contentBuffer: pngBuffer
        }
      ]
    });

    const result = await convertBook(inputPath, {
      optimizeImages: true
    });

    const outputPngBuffer = readZipEntryBuffer(new AdmZip(result.outputBuffer!), 'OEBPS/images/diagram.png');
    const metadata = await sharp(outputPngBuffer).metadata();

    expect(outputPngBuffer.length).toBeLessThan(pngBuffer.length);
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBeLessThanOrEqual(1600);
    expect(metadata.height).toBeLessThanOrEqual(1600);
  });

  test('convertBook preserves transparency while optimizing transparent PNGs', async () => {
    const tempDir = await makeTempDir('dyslibria-png-alpha-');
    const inputPath = path.join(tempDir, 'book.epub');
    const transparentPngBuffer = await createPatternedPngBuffer(1700, 1700, true);

    await createMinimalEpub(inputPath, {
      chapterMarkup: `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>This transparent PNG should stay transparent.</p>
    <img src="images/overlay.png" alt="Overlay"/>
  </body>
</html>`,
      assets: [
        {
          fileName: 'images/overlay.png',
          contentBuffer: transparentPngBuffer
        }
      ]
    });

    const result = await convertBook(inputPath, {
      optimizeImages: true
    });

    const outputPngBuffer = readZipEntryBuffer(new AdmZip(result.outputBuffer!), 'OEBPS/images/overlay.png');
    const metadata = await sharp(outputPngBuffer).metadata();
    const alphaSample = await sharp(outputPngBuffer)
      .ensureAlpha()
      .extract({ left: 10, top: 10, width: 1, height: 1 })
      .raw()
      .toBuffer();

    expect(outputPngBuffer.length).toBeLessThan(transparentPngBuffer.length);
    expect(metadata.format).toBe('png');
    expect(metadata.hasAlpha).toBe(true);
    expect(alphaSample[3]).toBeLessThan(255);
  }, 10000);

  test('convertBook does not upscale small images when optimization is enabled', async () => {
    const tempDir = await makeTempDir('dyslibria-no-upscale-');
    const inputPath = path.join(tempDir, 'book.epub');
    const smallJpegBuffer = await createPatternedJpegBuffer(400, 300);

    await createMinimalEpub(inputPath, {
      chapterMarkup: `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>This JPEG should not be enlarged.</p>
    <img src="images/photo.jpg" alt="Photo"/>
  </body>
</html>`,
      assets: [
        {
          fileName: 'images/photo.jpg',
          contentBuffer: smallJpegBuffer
        }
      ]
    });

    const result = await convertBook(inputPath, {
      optimizeImages: true
    });

    const outputJpegBuffer = readZipEntryBuffer(new AdmZip(result.outputBuffer!), 'OEBPS/images/photo.jpg');
    const metadata = await sharp(outputJpegBuffer).metadata();

    expect(metadata.width).toBe(400);
    expect(metadata.height).toBe(300);
  });

  test('convertBook skips the detected cover image by default', async () => {
    const tempDir = await makeTempDir('dyslibria-cover-skip-');
    const inputPath = path.join(tempDir, 'book.epub');
    const coverBuffer = await createPatternedPngBuffer();
    const inlineBuffer = coverBuffer;

    await createMinimalEpub(inputPath, {
      coverFileName: 'images/cover.png',
      coverImageBase64: coverBuffer.toString('base64'),
      chapterMarkup: `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>The inline PNG should shrink, but the cover should stay untouched.</p>
    <img src="images/inline.png" alt="Inline"/>
  </body>
</html>`,
      assets: [
        {
          fileName: 'images/inline.png',
          contentBuffer: inlineBuffer
        }
      ]
    });

    const result = await convertBook(inputPath, {
      optimizeImages: true
    });

    const outputZip = new AdmZip(result.outputBuffer!);
    const outputCoverBuffer = readZipEntryBuffer(outputZip, 'OEBPS/images/cover.png');
    const outputInlineBuffer = readZipEntryBuffer(outputZip, 'OEBPS/images/inline.png');

    expect(outputCoverBuffer.equals(coverBuffer)).toBe(true);
    expect(outputInlineBuffer.length).toBeLessThan(inlineBuffer.length);
    expect(result.stats.imageOptimization).toMatchObject({
      processedImages: 2,
      optimizedImages: 1,
      skippedImages: 1
    });
  }, 10000);

  test('convertBook continues when one image cannot be optimized', async () => {
    const tempDir = await makeTempDir('dyslibria-image-failure-');
    const inputPath = path.join(tempDir, 'book.epub');
    const brokenJpegBuffer = Buffer.from('not-a-real-jpeg');
    const validPngBuffer = await createPatternedPngBuffer();
    const logger = vi.fn();

    await createMinimalEpub(inputPath, {
      chapterMarkup: `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>The invalid image should not break the whole conversion.</p>
    <img src="images/broken.jpg" alt="Broken"/>
    <img src="images/valid.png" alt="Valid"/>
  </body>
</html>`,
      assets: [
        {
          fileName: 'images/broken.jpg',
          contentBuffer: brokenJpegBuffer
        },
        {
          fileName: 'images/valid.png',
          contentBuffer: validPngBuffer
        }
      ]
    });

    const result = await convertBook(inputPath, {
      optimizeImages: true,
      logger
    });

    const outputZip = new AdmZip(result.outputBuffer!);
    const outputBrokenBuffer = readZipEntryBuffer(outputZip, 'OEBPS/images/broken.jpg');
    const outputValidBuffer = readZipEntryBuffer(outputZip, 'OEBPS/images/valid.png');
    const warningEvents = logger.mock.calls
      .map(([event]) => event)
      .filter((event) => event.level === 'warn');

    expect(outputBrokenBuffer.equals(brokenJpegBuffer)).toBe(true);
    expect(outputValidBuffer.length).toBeLessThan(validPngBuffer.length);
    expect(result.stats.imageOptimization).toMatchObject({
      processedImages: 2,
      optimizedImages: 1,
      failedImages: 1
    });
    expect(warningEvents.some((event) => String(event.message).includes('broken.jpg'))).toBe(true);
  }, 10000);
});
