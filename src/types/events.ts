export interface ConversionProgressEvent {
  step: 'input' | 'validate' | 'inspect' | 'extract' | 'transform' | 'package' | 'output' | 'cleanup';
  progress: number;
  message: string;
}
