import type { ConvertBookOptions, ConversionInput } from '../types/api';
import { convertBook } from './convert-book';

export interface Converter {
  convertBook(input: ConversionInput, options?: ConvertBookOptions): ReturnType<typeof convertBook>;
}

export function createConverter(): Converter {
  return {
    convertBook
  };
}
