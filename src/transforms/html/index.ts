import path from 'node:path';
import fs from 'fs-extra';
import { processDocument } from './process-document';

export interface HtmlProcessingError {
  filePath: string;
  message: string;
}

export interface HtmlProcessingResult {
  processedFiles: number;
  skippedFiles: number;
  errors: HtmlProcessingError[];
}

export async function processHtmlFiles(dir: string, dictionary: Set<string>): Promise<HtmlProcessingResult> {
  const result: HtmlProcessingResult = {
    processedFiles: 0,
    skippedFiles: 0,
    errors: []
  };

  const files = await fs.readdir(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      const nestedResult = await processHtmlFiles(filePath, dictionary);
      result.processedFiles += nestedResult.processedFiles;
      result.skippedFiles += nestedResult.skippedFiles;
      result.errors.push(...nestedResult.errors);
    } else if (/\.(html|xhtml)$/i.test(file.name)) {
      try {
        const processedResult = await processDocument(filePath, dictionary);
        if (processedResult.processed) {
          result.processedFiles += 1;
        } else {
          result.skippedFiles += 1;
        }
      } catch (error) {
        result.errors.push({
          filePath,
          message: error instanceof Error ? error.message : 'Unknown HTML processing error.'
        });
      }
    }
  }

  return result;
}
