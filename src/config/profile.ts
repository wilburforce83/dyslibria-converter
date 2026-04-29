import path from 'node:path';
import fs from 'fs-extra';
import {
  DEFAULT_PROFILE,
  normalizeProfile,
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
    return {
      profileSource: source,
      rawProfile: DEFAULT_PROFILE as JsonObject
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
  profilePath?: string
): Promise<ResolvedProfile> {
  if (!input && !profilePath) {
    const validation = validateAndNormalizeProfile(DEFAULT_PROFILE);

    return {
      profileSource: { type: 'default' },
      profileWarnings: validation.warnings,
      rawProfile: DEFAULT_PROFILE as JsonObject,
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
