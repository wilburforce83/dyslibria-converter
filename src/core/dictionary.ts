import fs from 'fs-extra';

const dictionaryCache = new Map<string, Promise<Set<string>>>();

export async function loadDictionary(filePath: string): Promise<Set<string>> {
  if (!dictionaryCache.has(filePath)) {
    dictionaryCache.set(filePath, (async () => {
      const data = await fs.readFile(filePath, 'utf-8');
      return new Set(data.split(/\r?\n/).filter(Boolean));
    })());
  }

  return dictionaryCache.get(filePath)!;
}
