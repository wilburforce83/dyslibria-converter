import path from 'node:path';
import fs from 'fs-extra';
import { normalizeConvertBookOptions } from '../config/schema';
import { createWorkspace, cleanupWorkspace } from './workspace';
import { materializeInput } from './input';
import { inspectBookFromPath } from './inspect-book';
import { extractResources } from './archive';
import { processHtmlFiles } from '../transforms/html';
import { optimizeEpubImages } from '../transforms/images';
import { createEpubBuffer } from '../output/epub-writer';
import type {
  ConversionInput,
  ConversionResult,
  ConvertBookOptions,
  ConversionLogEvent,
  ImageOptimizationStats
} from '../types/api';
import { ConversionStepError, NoContentFilesError } from '../types/errors';

function logEvent(logger: ConvertBookOptions['logger'], event: ConversionLogEvent): void {
  if (logger) {
    logger(event);
  }
}

export async function convertBook(input: ConversionInput, options: ConvertBookOptions = {}): Promise<ConversionResult> {
  const startedAt = Date.now();
  const normalizedOptions = normalizeConvertBookOptions(options);
  const workspace = await createWorkspace(normalizedOptions.tempRootDir);

  try {
    logEvent(normalizedOptions.logger, {
      level: 'info',
      step: 'input',
      message: 'Materializing EPUB input'
    });
    const materializedInput = await materializeInput(input, workspace);

    logEvent(normalizedOptions.logger, {
      level: 'info',
      step: 'inspect',
      message: 'Inspecting EPUB package'
    });
    const inspection = await inspectBookFromPath(materializedInput.inputPath, materializedInput.filename);

    logEvent(normalizedOptions.logger, {
      level: 'info',
      step: 'extract',
      message: 'Extracting EPUB resources'
    });
    await extractResources(materializedInput.inputPath, workspace.extractedDir, {
      maxArchiveEntries: normalizedOptions.maxArchiveEntries,
      maxExtractBytes: normalizedOptions.maxExtractBytes
    });

    let imageOptimizationStats: ImageOptimizationStats | undefined;
    if (normalizedOptions.optimizeImages.enabled) {
      logEvent(normalizedOptions.logger, {
        level: 'info',
        step: 'transform',
        message: 'Optimizing embedded EPUB images'
      });

      imageOptimizationStats = await optimizeEpubImages({
        resourcesPath: workspace.extractedDir,
        options: normalizedOptions.optimizeImages,
        inspection,
        logger: normalizedOptions.logger
      });

      logEvent(normalizedOptions.logger, {
        level: 'info',
        step: 'transform',
        message: 'Image optimization complete',
        details: {
          processedImages: imageOptimizationStats.processedImages,
          optimizedImages: imageOptimizationStats.optimizedImages,
          bytesSaved: imageOptimizationStats.bytesSaved
        }
      });
    }

    logEvent(normalizedOptions.logger, {
      level: 'info',
      step: 'transform',
      message: 'Applying Dyslibria text transformation'
    });
    const processingResult = await processHtmlFiles(workspace.extractedDir, {
      profile: normalizedOptions.profile,
      profilePath: normalizedOptions.profilePath,
      logger: normalizedOptions.logger
    });

    if (processingResult.errors.length > 0) {
      const firstError = processingResult.errors[0];
      throw new ConversionStepError(
        `HTML processing failed in ${firstError.filePath}: ${firstError.message}`,
        {
          step: 'transform',
          context: {
            filePath: firstError.filePath
          }
        }
      );
    }

    if (processingResult.processedFiles === 0) {
      throw new NoContentFilesError();
    }

    logEvent(normalizedOptions.logger, {
      level: 'info',
      step: 'package',
      message: 'Repackaging EPUB output'
    });
    const outputBuffer = await createEpubBuffer(workspace.extractedDir, normalizedOptions.deterministic);
    await fs.writeFile(workspace.outputPath, outputBuffer);

    let finalOutputPath: string | undefined;
    if (normalizedOptions.outputPath) {
      await fs.ensureDir(path.dirname(normalizedOptions.outputPath));
    }
    if (normalizedOptions.outputPath) {
      await fs.copy(workspace.outputPath, normalizedOptions.outputPath, { overwrite: true });
      finalOutputPath = normalizedOptions.outputPath;
    }

    logEvent(normalizedOptions.logger, {
      level: 'info',
      step: 'output',
      message: 'Conversion complete'
    });

    return {
      inspection,
      stats: {
        processedFiles: processingResult.processedFiles,
        skippedFiles: processingResult.skippedFiles,
        durationMs: Date.now() - startedAt,
        inputBytes: materializedInput.inputBytes,
        outputBytes: outputBuffer.length,
        imageOptimization: imageOptimizationStats
      },
      processingMetrics: processingResult.metricsReport,
      outputPath: finalOutputPath,
      outputBuffer: normalizedOptions.returnBuffer ? outputBuffer : undefined
    };
  } catch (error) {
    if (error instanceof ConversionStepError || error instanceof NoContentFilesError) {
      throw error;
    }

    throw new ConversionStepError('The EPUB conversion pipeline failed.', {
      step: 'output',
      cause: error
    });
  } finally {
    if (normalizedOptions.cleanupTempDirectories) {
      logEvent(normalizedOptions.logger, {
        level: 'debug',
        step: 'cleanup',
        message: 'Cleaning temporary workspace'
      });
      await cleanupWorkspace(workspace);
    }
  }
}
