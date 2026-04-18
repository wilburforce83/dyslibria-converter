import AdmZip from 'adm-zip';
import { findOpfPath, validateArchiveEntries, validateMimetype } from '../parsers/container';
import { extractOpfMetadata, normalizeArchivePath } from '../parsers/opf';
import type { BookInspection } from '../types/api';
import { ConversionStepError } from '../types/errors';

export async function inspectBookFromPath(inputPath: string, filename: string): Promise<BookInspection> {
  try {
    const zip = new AdmZip(inputPath);
    const entries = zip.getEntries();

    validateArchiveEntries(entries);
    validateMimetype(zip);

    const opfPath = findOpfPath(zip) || entries.find((entry) => entry.entryName.toLowerCase().endsWith('.opf'))?.entryName;
    const htmlEntries = entries
      .map((entry) => normalizeArchivePath(entry.entryName))
      .filter((entryName) => /\.(html|xhtml)$/i.test(entryName))
      .sort((left, right) => left.localeCompare(right));

    let title = filename.replace(/\.epub$/i, '');
    let author = '';
    let coverEntryName: string | undefined;
    const warnings: string[] = [];

    if (opfPath) {
      try {
        const opfEntry = zip.getEntry(opfPath);
        if (opfEntry) {
          const content = zip.readAsText(opfEntry);
          const metadata = extractOpfMetadata(opfPath, content);
          title = metadata.title || title;
          author = metadata.author || author;
          coverEntryName = metadata.coverEntryName;
        }
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : 'Unable to parse OPF metadata.');
      }
    } else {
      warnings.push('Unable to locate the package OPF file.');
    }

    return {
      filename,
      title,
      author,
      warnings,
      htmlEntries,
      opfPath,
      coverEntryName,
      hasContainerXml: Boolean(zip.getEntry('META-INF/container.xml')),
      hasMimetype: Boolean(zip.getEntry('mimetype'))
    };
  } catch (error) {
    throw new ConversionStepError('Unable to inspect the EPUB package.', {
      step: 'inspect',
      cause: error
    });
  }
}
