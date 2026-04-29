// @ts-nocheck
import { createPerformanceContext } from './performance.js';
import { parseCognitiveDocument } from './cognitiveParser.js';

export function analyzeDocument(documentModelOrText, profile) {
  if (typeof documentModelOrText === 'string') {
    return parseCognitiveDocument(documentModelOrText, profile, createPerformanceContext(profile.performanceMode));
  }

  return documentModelOrText;
}
