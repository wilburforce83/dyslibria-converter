import { readdirSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsup';

function collectEntries(relativeDir: string): Record<string, string> {
  const absoluteDir = path.resolve(__dirname, relativeDir);
  const outputDir = relativeDir.replace(/^src\//, '');
  const entries = readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .reduce<Record<string, string>>((accumulator, entry) => {
      const stem = entry.name.replace(/\.ts$/, '');
      accumulator[`${outputDir}/${stem}`] = path.join(relativeDir, entry.name);
      return accumulator;
    }, {});

  return entries;
}

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
    ...collectEntries('src/lab-engine/core'),
    ...collectEntries('src/lab-engine/language'),
    ...collectEntries('src/lab-engine/profiles'),
  },
  format: ['cjs'],
  dts: true,
  clean: true,
  outDir: 'dist',
  splitting: false,
});
