import path from 'node:path';
import fs from 'fs-extra';
import {
  DEFAULT_PRESET_ID,
  createProfileFromPreset,
  normalizeProfile,
  resolvePresetId,
  validateAndNormalizeProfile
} from '../lab-engine/core/profiles.js';
import type {
  JsonObject,
  ProfileInput,
  ProfileSource,
  ReaderConfiguration
} from '../types/api';

export interface ResolvedProfile {
  profileSource: ProfileSource;
  profileWarnings: string[];
  rawProfile: JsonObject;
  profileUsed: JsonObject;
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isReaderConfiguration(value: unknown): value is ReaderConfiguration {
  if (!isObject(value) || !isObject(value.profile)) {
    return false;
  }

  return (
    value.kind === 'dyslibria-reader-configuration' ||
    'configurationId' in value ||
    'questionnaireAnswers' in value ||
    'compactTuning' in value ||
    'readerLabel' in value
  );
}

function extractProfile(
  input: ProfileInput | undefined,
  source: ProfileSource
): { profileSource: ProfileSource; rawProfile: JsonObject } {
  if (!input) {
    const defaultProfile = createProfileFromPreset(DEFAULT_PRESET_ID) as JsonObject;

    return {
      profileSource: source,
      rawProfile: defaultProfile
    };
  }

  if (isReaderConfiguration(input)) {
    return {
      profileSource: {
        ...source,
        type: source.type.includes('file')
          ? 'file-reader-configuration'
          : 'inline-reader-configuration'
      },
      rawProfile: input.profile
    };
  }

  if (!isObject(input)) {
    throw new Error('Profile input must be a JSON object or reader configuration wrapper.');
  }

  return {
    profileSource: {
      ...source,
      type: source.type.includes('file') ? 'file-profile' : 'inline-profile'
    },
    rawProfile: input
  };
}

export async function resolveProfile(
  input?: ProfileInput,
  profilePath?: string,
  presetId?: string
): Promise<ResolvedProfile> {
  if (presetId && (input || profilePath)) {
    throw new Error('Specify either a presetId or a custom profile/profilePath, not both.');
  }

  if (!input && !profilePath) {
    if (presetId) {
      const resolvedPresetId = resolvePresetId(presetId);

      if (!resolvedPresetId) {
        throw new Error(`Unknown Dyslibria preset: ${presetId}`);
      }

      const presetProfile = createProfileFromPreset(resolvedPresetId) as JsonObject;
      const validation = validateAndNormalizeProfile(presetProfile);

      return {
        profileSource: { type: 'preset', presetId: resolvedPresetId },
        profileWarnings: validation.warnings,
        rawProfile: presetProfile,
        profileUsed: validation.profile as JsonObject
      };
    }

    const defaultProfile = createProfileFromPreset(DEFAULT_PRESET_ID) as JsonObject;
    const validation = validateAndNormalizeProfile(defaultProfile);

    return {
      profileSource: { type: 'default' },
      profileWarnings: validation.warnings,
      rawProfile: defaultProfile,
      profileUsed: validation.profile as JsonObject
    };
  }

  if (profilePath) {
    const resolvedPath = path.resolve(process.cwd(), profilePath);
    const fileContent = await fs.readFile(resolvedPath, 'utf-8');
    const parsedContent = JSON.parse(fileContent) as ProfileInput;
    const extractedProfile = extractProfile(parsedContent, {
      type: 'file-profile',
      path: resolvedPath
    });
    const validation = validateAndNormalizeProfile(extractedProfile.rawProfile);

    return {
      profileSource: extractedProfile.profileSource,
      profileWarnings: validation.warnings,
      rawProfile: extractedProfile.rawProfile,
      profileUsed: validation.profile as JsonObject
    };
  }

  const extractedProfile = extractProfile(input, { type: 'inline-profile' });
  const profileUsed = normalizeProfile(extractedProfile.rawProfile);
  const validation = validateAndNormalizeProfile(extractedProfile.rawProfile);

  return {
    profileSource: extractedProfile.profileSource,
    profileWarnings: validation.warnings,
    rawProfile: extractedProfile.rawProfile,
    profileUsed: profileUsed as JsonObject
  };
}
