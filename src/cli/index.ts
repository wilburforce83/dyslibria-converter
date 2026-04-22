#!/usr/bin/env node
import { runConvertCommand } from './commands/convert';
import { runInspectCommand } from './commands/inspect';

function printUsage(): void {
  console.log(`Usage:
  dyslibria-convert convert <input.epub> [--output <output.epub>] [--optimize-images]
  dyslibria-convert inspect <input.epub>`);
}

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  if (command === 'convert') {
    let inputPath: string | undefined;
    let outputPath: string | undefined;
    let optimizeImages = false;

    for (let index = 0; index < rest.length; index += 1) {
      const argument = rest[index];

      if (argument === '--output' || argument === '-o') {
        outputPath = rest[index + 1];
        if (!outputPath) {
          throw new Error('An output EPUB path is required after --output.');
        }

        index += 1;
        continue;
      }

      if (argument === '--optimize-images') {
        optimizeImages = true;
        continue;
      }

      if (argument.startsWith('-')) {
        throw new Error(`Unknown option: ${argument}`);
      }

      if (!inputPath) {
        inputPath = argument;
        continue;
      }

      throw new Error(`Unexpected argument: ${argument}`);
    }

    if (!inputPath) {
      throw new Error('An input EPUB path is required.');
    }

    await runConvertCommand({ inputPath, outputPath, optimizeImages });
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
