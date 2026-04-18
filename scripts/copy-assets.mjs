import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(rootDir, 'data', 'dictionary.txt');
const targetDir = path.join(rootDir, 'dist', 'data');
const targetPath = path.join(targetDir, 'dictionary.txt');

await fs.mkdir(targetDir, { recursive: true });
await fs.copyFile(sourcePath, targetPath);
