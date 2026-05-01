export { convertBook } from './core/convert-book';
export { inspectBook } from './core/inspector';
export { createConverter } from './core/pipeline';
export { processHtmlFiles } from './transforms/html';
export { createEpubBuffer } from './output/epub-writer';
export { resolveZipEntryPath } from './core/archive';
export { applyDyslibriaProfile, createEngineModel } from './lab-engine/core/engine.js';
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
  validateAndNormalizeProfile
} from './lab-engine/core/profiles.js';
export * from './types/api';
export * from './types/errors';
