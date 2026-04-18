export type BufferInput = Buffer | Uint8Array;

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
  logger?: ConversionLogger;
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
}

export interface ConversionResult {
  inspection: BookInspection;
  stats: ConversionStats;
  outputPath?: string;
  outputBuffer?: Buffer;
}
