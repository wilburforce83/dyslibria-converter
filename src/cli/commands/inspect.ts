import { inspectBook } from '../../core/inspector';

export async function runInspectCommand(inputPath: string): Promise<void> {
  const inspection = await inspectBook(inputPath);

  console.log(JSON.stringify(inspection, null, 2));
}
