export type BufferInput = Buffer | Uint8Array;

export type JsonObject = Record<string, unknown>;

export type ConversionInput =
  | string
  | BufferInput
  | NodeJS.ReadableStream
  | { path: string }
  | { buffer: BufferInput; filename?: string }
  | { stream: NodeJS.ReadableStream; filename?: string };

export type ConversionLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ConversionLogEvent {
  level: ConversionLogLevel;
  step: 'input' | 'validate' | 'inspect' | 'extract' | 'transform' | 'package' | 'output' | 'cleanup';
  message: string;
  details?: Record<string, unknown>;
}

export type ConversionLogger = (event: ConversionLogEvent) => void;

export interface ReaderConfiguration {
  kind?: string;
  version?: string;
  configurationId?: string;
  createdAt?: string;
  readerLabel?: string;
  questionnaireAnswers?: JsonObject;
  compactTuning?: JsonObject;
  summary?: JsonObject;
  profile: JsonObject;
}

export type ProfileInput = JsonObject | ReaderConfiguration;

export interface ProfileSource {
  type:
    | 'default'
    | 'inline-profile'
    | 'inline-reader-configuration'
    | 'file-profile'
    | 'file-reader-configuration';
  path?: string;
}

export interface ConvertBookOptions {
  outputPath?: string;
  returnBuffer?: boolean;
  deterministic?: boolean;
  dictionary?: Iterable<string>;
  dictionaryPath?: string;
  tempRootDir?: string;
  cleanupTempDirectories?: boolean;
  maxArchiveEntries?: number;
  maxExtractBytes?: number;
  optimizeImages?: boolean | ImageOptimizationOptions;
  profile?: ProfileInput;
  profilePath?: string;
  logger?: ConversionLogger;
}

export interface ImageOptimizationOptions {
  enabled?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  skipCover?: boolean;
  pngPalette?: boolean;
  stripMetadata?: boolean;
}

export interface BookInspection {
  filename: string;
  title: string;
  author: string;
  warnings: string[];
  htmlEntries: string[];
  opfPath?: string;
  coverEntryName?: string;
  hasContainerXml: boolean;
  hasMimetype: boolean;
}

export interface ConversionStats {
  processedFiles: number;
  skippedFiles: number;
  durationMs: number;
  inputBytes: number;
  outputBytes: number;
  imageOptimization?: ImageOptimizationStats;
}

export interface ImageOptimizationStats {
  processedImages: number;
  optimizedImages: number;
  skippedImages: number;
  failedImages: number;
  inputBytes: number;
  outputBytes: number;
  bytesSaved: number;
  largestInputBytes: number;
  largestOutputBytes: number;
  imagesAbove1MbAfter: number;
}

export interface ProcessingWarning {
  level: string;
  title: string;
  message: string;
}

export interface DyslibriaMetrics {
  totalWords: number;
  sentenceCount: number;
  languageSelected: string;
  averageComplexityScore: number;
  emphasisDensity: number;
  anchorsPerSentence: number;
  anchorCount: number;
  averageDistanceBetweenAnchors: number;
  clusteringScore: number;
  estimatedCognitiveLoadScore: number;
  spanCount: number;
  nestedSpanCount: number;
  epubComplexityScore: number;
  textTreatmentBreakdown: string;
  leadCueCount: number;
  performanceTiming: Record<string, number>;
  cacheHitRate: number;
  compatibilityMode: string;
}

export interface HtmlFileProcessingMetrics {
  filePath: string;
  status: 'processed' | 'skipped' | 'error';
  reason?: string;
  error?: string;
  inputCharacters: number;
  outputCharacters: number;
  processedBlockCount: number;
  metrics?: DyslibriaMetrics;
  warnings: ProcessingWarning[];
  debugData?: JsonObject;
  profileUsed?: JsonObject;
  activeCss?: string;
  spanCount?: number;
}

export interface ProcessingMetricsTotals {
  processedFiles: number;
  skippedFiles: number;
  totalWords: number;
  sentenceCount: number;
  anchorCount: number;
  leadCueCount: number;
  spanCount: number;
  nestedSpanCount: number;
  averageComplexityScore: number;
  averageEmphasisDensity: number;
  averageAnchorsPerSentence: number;
  averageEpubComplexityScore: number;
  languages: Record<string, number>;
}

export interface ProcessingMetricsReport {
  profileSource: ProfileSource;
  profileWarnings: string[];
  profileUsed: JsonObject;
  files: HtmlFileProcessingMetrics[];
  totals: ProcessingMetricsTotals;
}

export interface ConversionResult {
  inspection: BookInspection;
  stats: ConversionStats;
  processingMetrics: ProcessingMetricsReport;
  outputPath?: string;
  outputBuffer?: Buffer;
}
