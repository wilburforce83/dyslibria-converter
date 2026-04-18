import path from 'node:path';
import { load } from 'cheerio';

export interface OpfMetadata {
  title: string;
  author: string;
  coverEntryName?: string;
}

interface ManifestItem {
  id: string;
  href: string;
  properties: string[];
}

function isImageEntry(entryName: string): boolean {
  const normalizedEntryName = entryName.toLowerCase();

  return normalizedEntryName.endsWith('.jpg') ||
    normalizedEntryName.endsWith('.jpeg') ||
    normalizedEntryName.endsWith('.png') ||
    normalizedEntryName.endsWith('.gif') ||
    normalizedEntryName.endsWith('.svg');
}

export function normalizeArchivePath(entryName: string): string {
  return String(entryName || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
}

export function resolveManifestHref(opfEntryName: string, href: string): string {
  if (!href) {
    return '';
  }

  const normalizedHref = normalizeArchivePath(href);
  const opfDirectory = path.posix.dirname(normalizeArchivePath(opfEntryName));
  const resolvedPath = opfDirectory && opfDirectory !== '.'
    ? path.posix.normalize(path.posix.join(opfDirectory, normalizedHref))
    : path.posix.normalize(normalizedHref);

  return normalizeArchivePath(resolvedPath);
}

export function extractOpfMetadata(opfEntryName: string, content: string): OpfMetadata {
  const metaData: OpfMetadata = {
    title: '',
    author: ''
  };

  try {
    const $ = load(content, { xmlMode: true });
    const manifestItems: ManifestItem[] = $('manifest > item').toArray().map((item) => {
      const element = $(item);

      return {
        id: element.attr('id') || '',
        href: element.attr('href') || '',
        properties: String(element.attr('properties') || '')
          .split(/\s+/)
          .filter(Boolean)
      };
    });

    metaData.title = $('metadata > dc\\:title, metadata > title').first().text().trim();
    metaData.author = $('metadata > dc\\:creator, metadata > creator').first().text().trim();

    const coverItemId = $('metadata > meta[name="cover"]').attr('content');
    let coverItem: ManifestItem | undefined;

    if (coverItemId) {
      coverItem = manifestItems.find((item) => item.id === coverItemId);
    }

    if (!coverItem) {
      coverItem = manifestItems.find((item) => item.properties.includes('cover-image'));
    }

    if (!coverItem) {
      coverItem = manifestItems.find((item) => {
        const entryName = `${item.id} ${item.href}`.toLowerCase();
        return isImageEntry(item.href) && entryName.includes('cover');
      });
    }

    if (coverItem?.href) {
      metaData.coverEntryName = resolveManifestHref(opfEntryName, coverItem.href);
    }
  } catch {
    return metaData;
  }

  return metaData;
}
