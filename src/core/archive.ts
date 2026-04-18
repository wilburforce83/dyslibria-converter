import path from 'node:path';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import { ArchiveSafetyError } from '../types/errors';

export function resolveZipEntryPath(outputPath: string, entryName: string): string {
  const normalizedEntryName = entryName.replace(/\\/g, '/');

  if (!normalizedEntryName || normalizedEntryName.startsWith('/') || normalizedEntryName.includes('../')) {
    throw new ArchiveSafetyError(`Unsafe archive entry path: ${entryName}`);
  }

  const resolvedOutputPath = path.resolve(outputPath);
  const resolvedEntryPath = path.resolve(outputPath, normalizedEntryName);

  if (resolvedEntryPath !== resolvedOutputPath && !resolvedEntryPath.startsWith(`${resolvedOutputPath}${path.sep}`)) {
    throw new ArchiveSafetyError(`Archive entry escapes extraction directory: ${entryName}`);
  }

  return resolvedEntryPath;
}

export async function extractResources(
  epubPath: string,
  outputPath: string,
  options: { maxArchiveEntries: number; maxExtractBytes: number }
): Promise<void> {
  const zip = new AdmZip(epubPath);
  const entries = zip.getEntries();

  if (!entries.length) {
    throw new ArchiveSafetyError('The EPUB archive is empty.');
  }

  if (entries.length > options.maxArchiveEntries) {
    throw new ArchiveSafetyError(`The EPUB archive contains too many entries (${entries.length}).`);
  }

  let totalExtractedBytes = 0;

  for (const entry of entries) {
    const entryPath = resolveZipEntryPath(outputPath, entry.entryName);

    if (entry.isDirectory) {
      await fs.ensureDir(entryPath);
      continue;
    }

    const fileData = zip.readFile(entry);
    if (!fileData) {
      continue;
    }

    totalExtractedBytes += fileData.length;
    if (totalExtractedBytes > options.maxExtractBytes) {
      throw new ArchiveSafetyError('The EPUB archive expands beyond the configured extraction limit.');
    }

    await fs.ensureDir(path.dirname(entryPath));
    await fs.writeFile(entryPath, fileData);
  }
}
