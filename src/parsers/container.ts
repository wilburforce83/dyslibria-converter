import AdmZip from 'adm-zip';
import { load } from 'cheerio';
import { InvalidEpubError } from '../types/errors';

export function validateArchiveEntries(entries: AdmZip.IZipEntry[]): void {
  if (!entries.length) {
    throw new InvalidEpubError('The EPUB archive is empty.');
  }

  if (!entries.some((entry) => entry.entryName === 'mimetype')) {
    throw new InvalidEpubError('The EPUB archive is missing the mimetype file.');
  }

  if (!entries.some((entry) => entry.entryName === 'META-INF/container.xml')) {
    throw new InvalidEpubError('The EPUB archive is missing META-INF/container.xml.');
  }
}

export function validateMimetype(zip: AdmZip): void {
  const mimetypeEntry = zip.getEntry('mimetype');
  if (!mimetypeEntry) {
    throw new InvalidEpubError('The EPUB archive is missing the mimetype file.');
  }

  const mimetype = zip.readAsText(mimetypeEntry).trim();
  if (mimetype !== 'application/epub+zip') {
    throw new InvalidEpubError('The uploaded archive does not look like a valid EPUB.');
  }
}

export function findOpfPath(zip: AdmZip): string | undefined {
  const containerEntry = zip.getEntry('META-INF/container.xml');
  if (!containerEntry) {
    return undefined;
  }

  const content = zip.readAsText(containerEntry);
  const $ = load(content, { xmlMode: true });

  const rootFilePath =
    $('rootfile').first().attr('full-path') ||
    $('container rootfiles rootfile').first().attr('full-path');

  return rootFilePath || undefined;
}
