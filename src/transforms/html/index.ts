import path from 'node:path';
import fs from 'fs-extra';
import { resolveProfile } from '../../config/profile';
import type {
  ConversionLogger,
  HtmlFileProcessingMetrics,
  ProcessingMetricsReport,
  ProcessingMetricsTotals,
  ProfileInput
} from '../../types/api';
import { processDocument } from './process-document';
import { sanitizeStylesheetFiles } from '../styles/sanitize-source-styles';

export interface HtmlProcessingError {
  filePath: string;
  message: string;
}

export interface HtmlProcessingOptions {
  profile?: ProfileInput;
  profilePath?: string;
  logger?: ConversionLogger;
}

export interface HtmlProcessingResult {
  processedFiles: number;
  skippedFiles: number;
  errors: HtmlProcessingError[];
  files: HtmlFileProcessingMetrics[];
  metricsReport: ProcessingMetricsReport;
}

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}

function createEmptyTotals(): ProcessingMetricsTotals {
  return {
    processedFiles: 0,
    skippedFiles: 0,
    totalWords: 0,
    sentenceCount: 0,
    anchorCount: 0,
    leadCueCount: 0,
    spanCount: 0,
    nestedSpanCount: 0,
    averageComplexityScore: 0,
    averageEmphasisDensity: 0,
    averageAnchorsPerSentence: 0,
    averageEpubComplexityScore: 0,
    languages: {}
  };
}

function buildMetricsReport(
  files: HtmlFileProcessingMetrics[],
  profileSource: ProcessingMetricsReport['profileSource'],
  profileWarnings: string[],
  profileUsed: ProcessingMetricsReport['profileUsed']
): ProcessingMetricsReport {
  const totals = createEmptyTotals();
  let weightedComplexity = 0;
  let totalCompatibilityScore = 0;
  let processedMetricFiles = 0;

  for (const file of files) {
    if (file.status === 'processed') {
      totals.processedFiles += 1;
    }

    if (file.status === 'skipped') {
      totals.skippedFiles += 1;
    }

    if (!file.metrics) {
      continue;
    }

    processedMetricFiles += 1;
    totals.totalWords += file.metrics.totalWords;
    totals.sentenceCount += file.metrics.sentenceCount;
    totals.anchorCount += file.metrics.anchorCount;
    totals.leadCueCount += file.metrics.leadCueCount;
    totals.spanCount += file.metrics.spanCount;
    totals.nestedSpanCount += file.metrics.nestedSpanCount;
    totals.languages[file.metrics.languageSelected] =
      (totals.languages[file.metrics.languageSelected] || 0) + 1;
    weightedComplexity += file.metrics.averageComplexityScore * file.metrics.totalWords;
    totalCompatibilityScore += file.metrics.epubComplexityScore;
  }

  totals.averageComplexityScore = totals.totalWords
    ? round(weightedComplexity / totals.totalWords, 3)
    : 0;
  totals.averageEmphasisDensity = totals.totalWords
    ? round((totals.anchorCount / totals.totalWords) * 100, 1)
    : 0;
  totals.averageAnchorsPerSentence = totals.sentenceCount
    ? round(totals.anchorCount / totals.sentenceCount, 2)
    : 0;
  totals.averageEpubComplexityScore = processedMetricFiles
    ? round(totalCompatibilityScore / processedMetricFiles, 1)
    : 0;

  return {
    profileSource,
    profileWarnings,
    profileUsed,
    files,
    totals
  };
}

function normalizeOptions(
  optionsOrLegacy: HtmlProcessingOptions | Set<string> | undefined
): HtmlProcessingOptions {
  if (!optionsOrLegacy || optionsOrLegacy instanceof Set) {
    return {};
  }

  return optionsOrLegacy;
}

async function walkHtmlFiles(
  dir: string,
  rootDir: string,
  files: HtmlFileProcessingMetrics[],
  errors: HtmlProcessingError[],
  resolvedProfile: Awaited<ReturnType<typeof resolveProfile>>,
  logger?: ConversionLogger
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkHtmlFiles(filePath, rootDir, files, errors, resolvedProfile, logger);
      continue;
    }

    if (!/\.(html|xhtml)$/i.test(entry.name)) {
      continue;
    }

    try {
      logger?.({
        level: 'debug',
        step: 'transform',
        message: `Processing HTML content file: ${path.relative(rootDir, filePath)}`
      });
      const result = await processDocument(filePath, rootDir, resolvedProfile);
      files.push(result.file);
    } catch (error) {
      const relativePath = path.relative(rootDir, filePath).split(path.sep).join('/');
      const message =
        error instanceof Error ? error.message : 'Unknown HTML processing error.';

      files.push({
        filePath: relativePath,
        status: 'error',
        error: message,
        inputCharacters: 0,
        outputCharacters: 0,
        processedBlockCount: 0,
        warnings: []
      });
      errors.push({
        filePath,
        message
      });
    }
  }
}

export async function processHtmlFiles(
  dir: string,
  optionsOrLegacy?: HtmlProcessingOptions | Set<string>
): Promise<HtmlProcessingResult> {
  const options = normalizeOptions(optionsOrLegacy);
  const resolvedProfile = await resolveProfile(options.profile, options.profilePath);
  const files: HtmlFileProcessingMetrics[] = [];
  const errors: HtmlProcessingError[] = [];
  const stylesheetSanitization = await sanitizeStylesheetFiles(dir, options.logger);

  if (stylesheetSanitization.declarationsSanitized > 0) {
    options.logger?.({
      level: 'info',
      step: 'transform',
      message: 'Sanitized conflicting text !important rules in source EPUB stylesheets',
      details: {
        stylesheetFilesUpdated: stylesheetSanitization.stylesheetFilesUpdated,
        declarationsSanitized: stylesheetSanitization.declarationsSanitized
      }
    });
  }

  await walkHtmlFiles(dir, dir, files, errors, resolvedProfile, options.logger);

  const metricsReport = buildMetricsReport(
    files,
    resolvedProfile.profileSource,
    resolvedProfile.profileWarnings,
    resolvedProfile.profileUsed
  );

  return {
    processedFiles: metricsReport.totals.processedFiles,
    skippedFiles: metricsReport.totals.skippedFiles,
    errors,
    files,
    metricsReport
  };
}
