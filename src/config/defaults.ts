import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_MAX_ARCHIVE_ENTRIES = 5000;
export const DEFAULT_MAX_EXTRACT_BYTES = 300 * 1024 * 1024;
export const DEFAULT_RETURN_BUFFER = true;
export const DEFAULT_DETERMINISTIC_OUTPUT = true;
export const DEFAULT_CLEANUP_TEMP = true;
function resolveDefaultDictionaryPath(): string {
  const candidates = [
    path.resolve(__dirname, './data/dictionary.txt'),
    path.resolve(__dirname, '../data/dictionary.txt'),
    path.resolve(__dirname, '../../data/dictionary.txt'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

export const DEFAULT_DICTIONARY_PATH = resolveDefaultDictionaryPath();
