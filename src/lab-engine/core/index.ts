// @ts-nocheck
export { analyzeDocument } from './analysis.js';
export { validateCompatibility } from './compatibilityValidator.js';
export { parseCognitiveDocument } from './cognitiveParser.js';
export { applyDyslibriaProfile, createEngineModel } from './engine.js';
export { planEmphasis } from './emphasisPlanner.js';
export { calculateMetrics } from './metrics.js';
export { createPerformanceContext, summarizePerformance } from './performance.js';
export {
  DEFAULT_PRESET_ID,
  createProfile,
  createProfileFromPreset,
  DEFAULT_PROFILE,
  normalizeProfile,
  parseProfile,
  PROFILE_PRESETS,
  PROFILE_VERSION,
  resolvePresetId,
  serializeProfile,
  validateAndNormalizeProfile,
} from './profiles.js';
export { renderEngineOutput } from './renderer.js';
export { parseSentences } from './sentenceParser.js';
export { tokenizeText } from './tokenizer.js';
export { analyzeWords } from './wordAnalyzer.js';
