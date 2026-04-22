import path from 'node:path';
import fs from 'fs-extra';
import sharp from 'sharp';
import type { NormalizedImageOptimizationOptions } from '../../config/schema';
import { normalizeArchivePath } from '../../parsers/opf';
import type { BookInspection, ConversionLogger, ImageOptimizationStats } from '../../types/api';

const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);
const COVER_FALLBACK_BASENAME_PATTERN = /^(cover|cover-image|titlepage|title-page)$/i;
const ONE_MEGABYTE = 1024 * 1024;

interface OptimizeEpubImagesInput {
  resourcesPath: string;
  options: NormalizedImageOptimizationOptions;
  inspection: Pick<BookInspection, 'coverEntryName'>;
  logger?: ConversionLogger;
}

function isSupportedImagePath(filePath: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isLikelyCoverImage(entryName: string): boolean {
  const normalizedEntryName = normalizeArchivePath(entryName);
  const baseName = path.posix.basename(normalizedEntryName, path.posix.extname(normalizedEntryName));

  return COVER_FALLBACK_BASENAME_PATTERN.test(baseName);
}

async function collectFilePaths(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  const filePaths: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      filePaths.push(...(await collectFilePaths(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      filePaths.push(fullPath);
    }
  }

  return filePaths;
}

function createEmptyImageOptimizationStats(): ImageOptimizationStats {
  return {
    processedImages: 0,
    optimizedImages: 0,
    skippedImages: 0,
    failedImages: 0,
    inputBytes: 0,
    outputBytes: 0,
    bytesSaved: 0,
    largestInputBytes: 0,
    largestOutputBytes: 0,
    imagesAbove1MbAfter: 0
  };
}

function shouldSkipCoverImage(
  archiveEntryName: string,
  coverEntryName: string | undefined,
  options: NormalizedImageOptimizationOptions
): boolean {
  if (!options.skipCover) {
    return false;
  }

  const normalizedEntryName = normalizeArchivePath(archiveEntryName);
  const normalizedCoverEntryName = normalizeArchivePath(coverEntryName || '');

  if (normalizedCoverEntryName && normalizedEntryName === normalizedCoverEntryName) {
    return true;
  }

  return !normalizedCoverEntryName && isLikelyCoverImage(normalizedEntryName);
}

async function optimizeRasterImage(
  inputBuffer: Buffer,
  archiveEntryName: string,
  options: NormalizedImageOptimizationOptions
): Promise<Buffer | null> {
  const image = sharp(inputBuffer, {
    failOn: 'warning',
    limitInputPixels: false,
    sequentialRead: true
  });
  const metadata = await image.metadata();
  const extension = path.extname(archiveEntryName).toLowerCase();
  const format = metadata.format;

  if (!metadata.width || !metadata.height) {
    return null;
  }

  if (metadata.pages && metadata.pages > 1) {
    return null;
  }

  if ((extension === '.jpg' || extension === '.jpeg') && format !== 'jpeg') {
    return null;
  }

  if (extension === '.png' && format !== 'png') {
    return null;
  }

  let pipeline = sharp(inputBuffer, {
    failOn: 'warning',
    limitInputPixels: false,
    sequentialRead: true
  }).rotate();

  pipeline = pipeline.resize({
    width: options.maxWidth,
    height: options.maxHeight,
    fit: 'inside',
    withoutEnlargement: true
  });

  if (!options.stripMetadata) {
    pipeline = pipeline.withMetadata();
  }

  if (extension === '.jpg' || extension === '.jpeg') {
    const outputBuffer = await pipeline.jpeg({
      force: true,
      mozjpeg: true,
      quality: options.quality
    }).toBuffer();

    return outputBuffer.length < inputBuffer.length ? outputBuffer : null;
  }

  if (extension === '.png') {
    const outputBuffer = await pipeline.png({
      force: true,
      palette: options.pngPalette,
      quality: options.quality,
      compressionLevel: 9,
      effort: 8,
      adaptiveFiltering: true
    }).toBuffer();

    return outputBuffer.length < inputBuffer.length ? outputBuffer : null;
  }

  return null;
}

function recordImageSizes(stats: ImageOptimizationStats, inputBytes: number, outputBytes: number): void {
  stats.inputBytes += inputBytes;
  stats.outputBytes += outputBytes;
  stats.largestInputBytes = Math.max(stats.largestInputBytes, inputBytes);
  stats.largestOutputBytes = Math.max(stats.largestOutputBytes, outputBytes);

  if (outputBytes > ONE_MEGABYTE) {
    stats.imagesAbove1MbAfter += 1;
  }
}

function logImageWarning(logger: ConversionLogger | undefined, archiveEntryName: string, error: unknown): void {
  if (!logger) {
    return;
  }

  logger({
    level: 'warn',
    step: 'transform',
    message: `Skipped image optimization for ${archiveEntryName}`,
    details: {
      error: error instanceof Error ? error.message : String(error)
    }
  });
}

export async function optimizeEpubImages(input: OptimizeEpubImagesInput): Promise<ImageOptimizationStats> {
  const stats = createEmptyImageOptimizationStats();

  if (!input.options.enabled) {
    return stats;
  }

  const filePaths = await collectFilePaths(input.resourcesPath);

  for (const filePath of filePaths) {
    const archiveEntryName = normalizeArchivePath(path.relative(input.resourcesPath, filePath));
    if (!isSupportedImagePath(archiveEntryName)) {
      continue;
    }

    const originalBuffer = await fs.readFile(filePath);
    const originalBytes = originalBuffer.length;

    stats.processedImages += 1;

    if (shouldSkipCoverImage(archiveEntryName, input.inspection.coverEntryName, input.options)) {
      stats.skippedImages += 1;
      recordImageSizes(stats, originalBytes, originalBytes);
      continue;
    }

    try {
      const optimizedBuffer = await optimizeRasterImage(originalBuffer, archiveEntryName, input.options);

      if (!optimizedBuffer) {
        stats.skippedImages += 1;
        recordImageSizes(stats, originalBytes, originalBytes);
        continue;
      }

      await fs.writeFile(filePath, optimizedBuffer);
      stats.optimizedImages += 1;
      recordImageSizes(stats, originalBytes, optimizedBuffer.length);
    } catch (error) {
      stats.failedImages += 1;
      recordImageSizes(stats, originalBytes, originalBytes);
      logImageWarning(input.logger, archiveEntryName, error);
    }
  }

  stats.bytesSaved = stats.inputBytes - stats.outputBytes;
  return stats;
}
