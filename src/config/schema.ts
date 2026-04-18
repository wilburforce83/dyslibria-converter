import {
  DEFAULT_CLEANUP_TEMP,
  DEFAULT_DETERMINISTIC_OUTPUT,
  DEFAULT_DICTIONARY_PATH,
  DEFAULT_MAX_ARCHIVE_ENTRIES,
  DEFAULT_MAX_EXTRACT_BYTES,
  DEFAULT_RETURN_BUFFER
} from './defaults';
import type { ConvertBookOptions } from '../types/api';

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
  logger?: ConvertBookOptions['logger'];
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
    logger: options.logger
  };
}
