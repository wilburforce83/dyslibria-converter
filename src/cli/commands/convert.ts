import path from 'node:path';
import fs from 'fs-extra';
import { convertBook } from '../../core/convert-book';

interface ConvertCommandOptions {
  inputPath: string;
  outputPath?: string;
  optimizeImages?: boolean;
  presetId?: string;
  profilePath?: string;
  metricsOutputPath?: string;
}

export async function runConvertCommand(options: ConvertCommandOptions): Promise<void> {
  const outputPath = options.outputPath || defaultOutputPath(options.inputPath);

  const result = await convertBook(options.inputPath, {
    outputPath,
    optimizeImages: options.optimizeImages,
    presetId: options.presetId,
    profilePath: options.profilePath,
    returnBuffer: false,
    logger: (event) => {
      if (event.level !== 'debug') {
        console.log(`[${event.step}] ${event.message}`);
      }
    }
  });

  console.log(`Converted ${result.inspection.filename}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Processed files: ${result.stats.processedFiles}`);
  console.log(`Words processed: ${result.processingMetrics.totals.totalWords}`);
  console.log(`Anchors planned: ${result.processingMetrics.totals.anchorCount}`);

  if (result.stats.imageOptimization) {
    console.log(`Optimized images: ${result.stats.imageOptimization.optimizedImages}/${result.stats.imageOptimization.processedImages}`);
    console.log(`Image bytes saved: ${result.stats.imageOptimization.bytesSaved}`);
  }

  if (options.metricsOutputPath) {
    await fs.ensureDir(path.dirname(options.metricsOutputPath));
    await fs.writeJson(options.metricsOutputPath, result.processingMetrics, { spaces: 2 });
    console.log(`Metrics: ${options.metricsOutputPath}`);
  }
}

function defaultOutputPath(inputPath: string): string {
  const extension = path.extname(inputPath);
  const baseName = path.basename(inputPath, extension);

  return path.join(path.dirname(inputPath), `${baseName}.dyslibria${extension || '.epub'}`);
}
