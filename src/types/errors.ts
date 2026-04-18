export class ConverterError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, options: { code: string; cause?: unknown; context?: Record<string, unknown> }) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = options.code;
    this.context = options.context;
  }
}

export class InvalidEpubError extends ConverterError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { code: 'INVALID_EPUB', context });
  }
}

export class ArchiveSafetyError extends ConverterError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { code: 'ARCHIVE_SAFETY', context });
  }
}

export class NoContentFilesError extends ConverterError {
  constructor(message = 'No HTML or XHTML content files were found to convert.') {
    super(message, { code: 'NO_CONTENT_FILES' });
  }
}

export class ConversionStepError extends ConverterError {
  constructor(message: string, options: { step: string; cause?: unknown; context?: Record<string, unknown> }) {
    super(message, {
      code: 'CONVERSION_STEP_FAILED',
      cause: options.cause,
      context: {
        step: options.step,
        ...(options.context || {})
      }
    });
  }
}
