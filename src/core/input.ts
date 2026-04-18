import path from 'node:path';
import fs from 'fs-extra';
import { pipeline } from 'node:stream/promises';
import type { ConversionInput } from '../types/api';
import type { Workspace } from './workspace';
import { ConversionStepError } from '../types/errors';

export interface MaterializedInput {
  inputPath: string;
  filename: string;
  inputBytes: number;
}

function isReadableStream(value: unknown): value is NodeJS.ReadableStream {
  return Boolean(value && typeof value === 'object' && typeof (value as NodeJS.ReadableStream).pipe === 'function');
}

function getFilenameFromInput(input: ConversionInput): string {
  if (typeof input === 'string') {
    return path.basename(input);
  }

  if ('path' in (input as Record<string, unknown>) && typeof (input as { path: string }).path === 'string') {
    return path.basename((input as { path: string }).path);
  }

  if ('filename' in (input as Record<string, unknown>) && typeof (input as { filename?: string }).filename === 'string') {
    return (input as { filename: string }).filename;
  }

  return 'book.epub';
}

export async function materializeInput(
  input: ConversionInput,
  workspace: Workspace
): Promise<MaterializedInput> {
  const filename = getFilenameFromInput(input) || 'book.epub';

  try {
    if (typeof input === 'string') {
      await fs.copy(input, workspace.inputPath, { overwrite: true });
    } else if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
      await fs.writeFile(workspace.inputPath, input);
    } else if (isReadableStream(input)) {
      await pipeline(input, fs.createWriteStream(workspace.inputPath));
    } else if ('path' in input) {
      await fs.copy(input.path, workspace.inputPath, { overwrite: true });
    } else if ('buffer' in input) {
      await fs.writeFile(workspace.inputPath, input.buffer);
    } else if ('stream' in input) {
      await pipeline(input.stream, fs.createWriteStream(workspace.inputPath));
    } else {
      throw new Error('Unsupported conversion input type.');
    }
  } catch (error) {
    throw new ConversionStepError('Unable to materialize the EPUB input.', {
      step: 'input',
      cause: error
    });
  }

  const stat = await fs.stat(workspace.inputPath);

  return {
    inputPath: workspace.inputPath,
    filename,
    inputBytes: stat.size
  };
}
