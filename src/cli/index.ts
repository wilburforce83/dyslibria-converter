#!/usr/bin/env node
import { runConvertCommand } from './commands/convert';
import { runInspectCommand } from './commands/inspect';

function printUsage(): void {
  console.log(`Usage:
  dyslibria-convert convert <input.epub> [--output <output.epub>]
  dyslibria-convert inspect <input.epub>`);
}

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  if (command === 'convert') {
    const inputPath = rest[0];
    if (!inputPath) {
      throw new Error('An input EPUB path is required.');
    }

    let outputPath: string | undefined;
    for (let index = 1; index < rest.length; index += 1) {
      if (rest[index] === '--output' || rest[index] === '-o') {
        outputPath = rest[index + 1];
        index += 1;
      }
    }

    await runConvertCommand({ inputPath, outputPath });
    return;
  }

  if (command === 'inspect') {
    const inputPath = rest[0];
    if (!inputPath) {
      throw new Error('An input EPUB path is required.');
    }

    await runInspectCommand(inputPath);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
