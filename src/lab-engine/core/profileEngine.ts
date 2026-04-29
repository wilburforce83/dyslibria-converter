// @ts-nocheck
import {
  DEFAULT_PROFILES,
  INTERNAL_PRESET_PROFILES,
  PRESET_ALIASES,
  buildProfile,
  mergeDeep,
} from '../profiles/defaultProfiles.js';
import { DEFAULT_PROFILE, PROFILE_VERSION } from '../profiles/profileSchema.js';
import { sanitizeProfile, validateProfile } from '../profiles/profileValidator.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mapCompatibilityModeToEpubMode(mode) {
  switch (mode) {
    case 'kindleSafe':
      return 'kindle-safe';
    case 'enhancedEpub':
      return 'enhanced-epub';
    case 'experimental':
      return 'experimental';
    default:
      return 'standard-epub';
  }
}

function syncDerivedProfileState(profile) {
  const syncedProfile = clone(profile);

  syncedProfile.version = PROFILE_VERSION;
  syncedProfile.output.epubMode = mapCompatibilityModeToEpubMode(syncedProfile.outputCompatibilityMode);
  syncedProfile.attentionMapping.anchorDensity = syncedProfile.emphasisDensity;
  syncedProfile.attentionMapping.maxAnchorsPerSentence = syncedProfile.maxEmphasisPerSentence;
  syncedProfile.cognitiveLoad.emphasisBudgetPerParagraph = syncedProfile.maxEmphasisPerParagraph;
  syncedProfile.flowControl.maxConsecutiveEmphasisedWords = syncedProfile.maxConsecutiveEmphasisedWords;
  syncedProfile.flowControl.cooldownAfterEmphasis = syncedProfile.cooldownBetweenAnchors;
  syncedProfile.frontLoad.frontLoadPrefixMinChars = syncedProfile.frontLoad.frontLoadPrefixMinChars ?? syncedProfile.frontLoad.frontLoadMinChars;
  syncedProfile.frontLoad.frontLoadPrefixMaxChars = syncedProfile.frontLoad.frontLoadPrefixMaxChars ?? syncedProfile.frontLoad.frontLoadMaxChars;
  syncedProfile.frontLoad.frontLoadMinChars = syncedProfile.frontLoad.frontLoadPrefixMinChars;
  syncedProfile.frontLoad.frontLoadMaxChars = syncedProfile.frontLoad.frontLoadPrefixMaxChars;
  syncedProfile.frontLoad.frontLoadOnlyComplexWords =
    syncedProfile.frontLoad.frontLoadStrategy === 'complexWordsOnly';
  syncedProfile.frontLoad.frontLoadOnlyLongWords =
    syncedProfile.frontLoad.frontLoadStrategy === 'longWordsOnly';
  syncedProfile.experimental.multiWeightFade =
    syncedProfile.experimental.enableWeightFade || syncedProfile.experimental.multiWeightFade;
  syncedProfile.experimental.chunkBasedSplitting =
    syncedProfile.experimental.enableChunkMarkers || syncedProfile.experimental.chunkBasedSplitting;
  syncedProfile.experimental.anchorMarkers =
    syncedProfile.experimental.enableCompoundBoundaryMarkers || syncedProfile.experimental.anchorMarkers;

  return syncedProfile;
}

export function normalizeProfile(rawProfile) {
  const mergedProfile = mergeDeep(clone(DEFAULT_PROFILE), rawProfile || {});
  const sanitizedProfile = sanitizeProfile(mergedProfile);
  const hasExplicitFrontLoadStrategy = Object.prototype.hasOwnProperty.call(
    rawProfile?.frontLoad || {},
    'frontLoadStrategy',
  );

  if (!hasExplicitFrontLoadStrategy && sanitizedProfile.frontLoad.frontLoadOnlyComplexWords) {
    sanitizedProfile.frontLoad.frontLoadStrategy = 'complexWordsOnly';
  } else if (!hasExplicitFrontLoadStrategy && sanitizedProfile.frontLoad.frontLoadOnlyLongWords) {
    sanitizedProfile.frontLoad.frontLoadStrategy = 'longWordsOnly';
  }

  return syncDerivedProfileState(sanitizedProfile);
}

export function createProfileFromPreset(presetId) {
  const resolvedPresetId = PRESET_ALIASES[presetId] || presetId;
  const preset =
    DEFAULT_PROFILES.find((profile) => profile.id === resolvedPresetId) ||
    INTERNAL_PRESET_PROFILES.find((profile) => profile.id === resolvedPresetId) ||
    DEFAULT_PROFILE;
  return normalizeProfile(preset);
}

export function serializeProfile(profile) {
  return JSON.stringify(normalizeProfile(profile), null, 2);
}

export function parseProfile(serializedProfile) {
  return normalizeProfile(JSON.parse(serializedProfile));
}

export function createProfile(name, overrides) {
  return normalizeProfile(buildProfile(name.toLowerCase().replace(/\s+/g, '-'), name, '', overrides));
}

export function validateAndNormalizeProfile(rawProfile) {
  const normalizedProfile = normalizeProfile(rawProfile);

  return {
    profile: normalizedProfile,
    warnings: validateProfile(normalizedProfile),
  };
}

export { DEFAULT_PROFILE, DEFAULT_PROFILES as PROFILE_PRESETS, PROFILE_VERSION };
