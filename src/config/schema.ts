import {
  DEFAULT_CLEANUP_TEMP,
  DEFAULT_DETERMINISTIC_OUTPUT,
  DEFAULT_DICTIONARY_PATH,
  DEFAULT_IMAGE_OPTIMIZATION_OPTIONS,
  DEFAULT_MAX_ARCHIVE_ENTRIES,
  DEFAULT_MAX_EXTRACT_BYTES,
  DEFAULT_OPTIMIZE_IMAGES,
  DEFAULT_RETURN_BUFFER
} from './defaults';
import type { ConvertBookOptions, ImageOptimizationOptions, ProfileInput } from '../types/api';

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalizedValue = Math.floor(Number(value));
  return normalizedValue > 0 ? normalizedValue : fallback;
}

function normalizeQuality(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_IMAGE_OPTIMIZATION_OPTIONS.quality;
  }

  const normalizedValue = Math.round(Number(value));
  return Math.min(100, Math.max(1, normalizedValue));
}

export interface NormalizedImageOptimizationOptions {
  enabled: boolean;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  skipCover: boolean;
  pngPalette: boolean;
  stripMetadata: boolean;
}

export interface NormalizedConvertBookOptions {
  outputPath?: string;
  returnBuffer: boolean;
  deterministic: boolean;
  dictionary?: Iterable<string>;
  dictionaryPath: string;
  tempRootDir?: string;
  cleanupTempDirectories: boolean;
  maxArchiveEntries: number;
  maxExtractBytes: number;
  optimizeImages: NormalizedImageOptimizationOptions;
  presetId?: string;
  profile?: ProfileInput;
  profilePath?: string;
  logger?: ConvertBookOptions['logger'];
}

export function normalizeImageOptimizationOptions(
  options: boolean | ImageOptimizationOptions | undefined
): NormalizedImageOptimizationOptions {
  if (options === undefined) {
    return { ...DEFAULT_IMAGE_OPTIMIZATION_OPTIONS };
  }

  if (options === false) {
    return {
      ...DEFAULT_IMAGE_OPTIMIZATION_OPTIONS,
      enabled: false
    };
  }

  if (options === true) {
    return { ...DEFAULT_IMAGE_OPTIMIZATION_OPTIONS };
  }

  return {
    enabled: options.enabled ?? true,
    maxWidth: normalizePositiveInteger(options.maxWidth, DEFAULT_IMAGE_OPTIMIZATION_OPTIONS.maxWidth),
    maxHeight: normalizePositiveInteger(options.maxHeight, DEFAULT_IMAGE_OPTIMIZATION_OPTIONS.maxHeight),
    quality: normalizeQuality(options.quality),
    skipCover: options.skipCover ?? DEFAULT_IMAGE_OPTIMIZATION_OPTIONS.skipCover,
    pngPalette: options.pngPalette ?? DEFAULT_IMAGE_OPTIMIZATION_OPTIONS.pngPalette,
    stripMetadata: options.stripMetadata ?? DEFAULT_IMAGE_OPTIMIZATION_OPTIONS.stripMetadata
  };
}

export function normalizeConvertBookOptions(options: ConvertBookOptions = {}): NormalizedConvertBookOptions {
  return {
    outputPath: options.outputPath,
    returnBuffer: options.returnBuffer ?? DEFAULT_RETURN_BUFFER,
    deterministic: options.deterministic ?? DEFAULT_DETERMINISTIC_OUTPUT,
    dictionary: options.dictionary,
    dictionaryPath: options.dictionaryPath || DEFAULT_DICTIONARY_PATH,
    tempRootDir: options.tempRootDir,
    cleanupTempDirectories: options.cleanupTempDirectories ?? DEFAULT_CLEANUP_TEMP,
    maxArchiveEntries: options.maxArchiveEntries ?? DEFAULT_MAX_ARCHIVE_ENTRIES,
    maxExtractBytes: options.maxExtractBytes ?? DEFAULT_MAX_EXTRACT_BYTES,
    optimizeImages: normalizeImageOptimizationOptions(
      options.optimizeImages ?? DEFAULT_OPTIMIZE_IMAGES
    ),
    presetId: options.presetId,
    profile: options.profile,
    profilePath: options.profilePath,
    logger: options.logger
  };
}
