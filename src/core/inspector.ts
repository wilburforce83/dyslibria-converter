import { createWorkspace, cleanupWorkspace } from './workspace';
import { materializeInput } from './input';
import { inspectBookFromPath } from './inspect-book';
import type { BookInspection, ConversionInput } from '../types/api';

export async function inspectBook(input: ConversionInput): Promise<BookInspection> {
  const workspace = await createWorkspace();

  try {
    const materializedInput = await materializeInput(input, workspace);
    return inspectBookFromPath(materializedInput.inputPath, materializedInput.filename);
  } finally {
    await cleanupWorkspace(workspace);
  }
}
