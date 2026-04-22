import path from 'node:path';
import { convertBook } from '../../core/convert-book';

interface ConvertCommandOptions {
  inputPath: string;
  outputPath?: string;
  optimizeImages?: boolean;
}

export async function runConvertCommand(options: ConvertCommandOptions): Promise<void> {
  const outputPath = options.outputPath || defaultOutputPath(options.inputPath);

  const result = await convertBook(options.inputPath, {
    outputPath,
    optimizeImages: options.optimizeImages,
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

  if (result.stats.imageOptimization) {
    console.log(`Optimized images: ${result.stats.imageOptimization.optimizedImages}/${result.stats.imageOptimization.processedImages}`);
    console.log(`Image bytes saved: ${result.stats.imageOptimization.bytesSaved}`);
  }
}

function defaultOutputPath(inputPath: string): string {
  const extension = path.extname(inputPath);
  const baseName = path.basename(inputPath, extension);

  return path.join(path.dirname(inputPath), `${baseName}.dyslibria${extension || '.epub'}`);
}
