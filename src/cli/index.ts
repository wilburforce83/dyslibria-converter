#!/usr/bin/env node
import { resolvePresetId } from '../lab-engine/core/profiles';
import { runConvertCommand } from './commands/convert';
import { runInspectCommand } from './commands/inspect';

function printUsage(): void {
  console.log(`Usage:
  dyslibria-convert convert <input.epub> [-dyslibria_default|-balanced|--preset <preset>] [--output <output.epub>] [--profile <profile.json>] [--metrics-output <metrics.json>] [--optimize-images|--no-optimize-images]
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
    let presetId: string | undefined;
    let profilePath: string | undefined;
    let metricsOutputPath: string | undefined;
    let optimizeImages: boolean | undefined;

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

      if (argument === '--preset') {
        const nextPresetId = rest[index + 1];
        if (!nextPresetId) {
          throw new Error('A preset id is required after --preset.');
        }

        const resolvedPresetId = resolvePresetId(nextPresetId);
        if (!resolvedPresetId) {
          throw new Error(`Unknown Dyslibria preset: ${nextPresetId}`);
        }

        if (profilePath) {
          throw new Error('Use either a preset shorthand/--preset or --profile, not both.');
        }

        presetId = resolvedPresetId;
        index += 1;
        continue;
      }

      if (argument === '--profile') {
        profilePath = rest[index + 1];
        if (!profilePath) {
          throw new Error('A profile JSON path is required after --profile.');
        }

        if (presetId) {
          throw new Error('Use either a preset shorthand/--preset or --profile, not both.');
        }

        index += 1;
        continue;
      }

      if (argument === '--metrics-output') {
        metricsOutputPath = rest[index + 1];
        if (!metricsOutputPath) {
          throw new Error('A metrics JSON path is required after --metrics-output.');
        }

        index += 1;
        continue;
      }

      if (argument === '--optimize-images') {
        optimizeImages = true;
        continue;
      }

      if (argument === '--no-optimize-images') {
        optimizeImages = false;
        continue;
      }

      if (argument.startsWith('-')) {
        const shorthandPresetId = resolvePresetId(argument.slice(1));
        if (shorthandPresetId) {
          if (profilePath) {
            throw new Error('Use either a preset shorthand/--preset or --profile, not both.');
          }

          presetId = shorthandPresetId;
          continue;
        }

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

    await runConvertCommand({
      inputPath,
      outputPath,
      optimizeImages,
      presetId,
      profilePath,
      metricsOutputPath
    });
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
