// @ts-nocheck
import { DEFAULT_PROFILE } from './profileSchema.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function validateProfile(profile) {
  const warnings = [];

  if (!profile.name?.trim()) {
    warnings.push('Profile name is empty.');
  }

  if (!['fast', 'balanced', 'deep'].includes(profile.performanceMode)) {
    warnings.push('Invalid performanceMode; falling back to balanced.');
  }

  if (!['wholeWord', 'blended', 'languageZones'].includes(profile.emphasisMethod)) {
    warnings.push('Invalid emphasisMethod; falling back to wholeWord.');
  }

  if (!['kindleSafe', 'standardEpub', 'enhancedEpub', 'experimental'].includes(profile.outputCompatibilityMode)) {
    warnings.push('Invalid outputCompatibilityMode; falling back to standardEpub.');
  }

  if (profile.frontLoad.frontLoadPrefixMinChars > profile.frontLoad.frontLoadPrefixMaxChars) {
    warnings.push('Front-load prefix min chars exceeded max chars and was clamped.');
  }

  if (
    !['everyWord', 'longWordsOnly', 'complexWordsOnly', 'everyNthWord', 'contentWordsOnly'].includes(
      profile.frontLoad.frontLoadStrategy,
    )
  ) {
    warnings.push('Invalid frontLoadStrategy; falling back to contentWordsOnly.');
  }

  if (
    profile.outputCompatibilityMode === 'kindleSafe' &&
    (profile.visual.secondaryWeight > 600 || profile.visual.tertiaryWeight > 500)
  ) {
    warnings.push('Kindle Safe may flatten intermediate font weights.');
  }

  return warnings;
}

export function sanitizeProfile(profile) {
  const sanitized = JSON.parse(JSON.stringify(profile || DEFAULT_PROFILE));

  sanitized.performanceMode = ['fast', 'balanced', 'deep'].includes(sanitized.performanceMode)
    ? sanitized.performanceMode
    : 'balanced';
  sanitized.emphasisMethod = ['wholeWord', 'blended', 'languageZones'].includes(
    sanitized.emphasisMethod,
  )
    ? sanitized.emphasisMethod
    : 'wholeWord';
  sanitized.outputCompatibilityMode = ['kindleSafe', 'standardEpub', 'enhancedEpub', 'experimental'].includes(
    sanitized.outputCompatibilityMode,
  )
    ? sanitized.outputCompatibilityMode
    : 'standardEpub';
  sanitized.emphasisDensity = clamp(Number(sanitized.emphasisDensity) || 0.22, 0, 1);
  sanitized.maxEmphasisPerSentence = clamp(
    Math.round(Number(sanitized.maxEmphasisPerSentence) || 4),
    1,
    6,
  );
  sanitized.maxEmphasisPerParagraph = clamp(Number(sanitized.maxEmphasisPerParagraph) || 0.28, 0.05, 0.6);
  sanitized.maxConsecutiveEmphasisedWords = clamp(
    Math.round(Number(sanitized.maxConsecutiveEmphasisedWords) || 1),
    1,
    3,
  );
  sanitized.cooldownBetweenAnchors = clamp(Math.round(Number(sanitized.cooldownBetweenAnchors) || 1), 0, 4);
  sanitized.frontLoad.frontLoadPrefixMinChars = clamp(
    Math.round(Number(sanitized.frontLoad.frontLoadPrefixMinChars ?? sanitized.frontLoad.frontLoadMinChars) || 2),
    1,
    6,
  );
  sanitized.frontLoad.frontLoadPrefixMaxChars = clamp(
    Math.round(Number(sanitized.frontLoad.frontLoadPrefixMaxChars ?? sanitized.frontLoad.frontLoadMaxChars) || 4),
    sanitized.frontLoad.frontLoadPrefixMinChars + 1,
    8,
  );
  sanitized.frontLoad.frontLoadMinChars = sanitized.frontLoad.frontLoadPrefixMinChars;
  sanitized.frontLoad.frontLoadMaxChars = sanitized.frontLoad.frontLoadPrefixMaxChars;
  sanitized.frontLoad.frontLoadStrategy = [
    'everyWord',
    'longWordsOnly',
    'complexWordsOnly',
    'everyNthWord',
    'contentWordsOnly',
  ].includes(sanitized.frontLoad.frontLoadStrategy)
    ? sanitized.frontLoad.frontLoadStrategy
    : DEFAULT_PROFILE.frontLoad.frontLoadStrategy;
  sanitized.frontLoad.frontLoadDensity = clamp(Number(sanitized.frontLoad.frontLoadDensity) || 0, 0, 1);
  sanitized.frontLoad.frontLoadWordCoverage = clamp(
    Number(sanitized.frontLoad.frontLoadWordCoverage) || DEFAULT_PROFILE.frontLoad.frontLoadWordCoverage,
    0.15,
    1,
  );
  sanitized.frontLoad.frontLoadMinWordLength = clamp(
    Math.round(
      Number(sanitized.frontLoad.frontLoadMinWordLength) || DEFAULT_PROFILE.frontLoad.frontLoadMinWordLength,
    ),
    2,
    12,
  );
  sanitized.visual.primaryWeight = clamp(Math.round(Number(sanitized.visual.primaryWeight) || 700), 500, 800);
  sanitized.visual.secondaryWeight = clamp(Math.round(Number(sanitized.visual.secondaryWeight) || 600), 500, 760);
  sanitized.visual.tertiaryWeight = clamp(Math.round(Number(sanitized.visual.tertiaryWeight) || 500), 400, 700);
  sanitized.visual.lineHeight = clamp(Number(sanitized.visual.lineHeight) || 1.72, 1.2, 2.2);
  sanitized.visual.fontFamily = String(sanitized.visual.fontFamily || DEFAULT_PROFILE.visual.fontFamily);
  sanitized.visual.letterSpacing = String(sanitized.visual.letterSpacing || DEFAULT_PROFILE.visual.letterSpacing);
  sanitized.visual.wordSpacing = String(sanitized.visual.wordSpacing || DEFAULT_PROFILE.visual.wordSpacing);
  sanitized.visual.paragraphSpacing = String(
    sanitized.visual.paragraphSpacing || DEFAULT_PROFILE.visual.paragraphSpacing,
  );
  sanitized.visual.maxLineWidth = String(sanitized.visual.maxLineWidth || DEFAULT_PROFILE.visual.maxLineWidth);
  sanitized.visual.embeddedFontMode = ['system', 'embedded', 'disabled'].includes(
    sanitized.visual.embeddedFontMode,
  )
    ? sanitized.visual.embeddedFontMode
    : DEFAULT_PROFILE.visual.embeddedFontMode;

  return sanitized;
}
