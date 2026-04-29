// @ts-nocheck
import { withCachedResult } from './performance.js';

function cloneAnalysis(analysis) {
  return JSON.parse(JSON.stringify(analysis));
}

function pickRecommendedTier(complexityScore) {
  if (complexityScore >= 0.72) {
    return 'primary';
  }

  if (complexityScore >= 0.48) {
    return 'secondary';
  }

  if (complexityScore >= 0.24) {
    return 'tertiary';
  }

  return 'none';
}

function buildEmphasisCandidates(analysis) {
  const candidates = [];

  if (analysis.detectedPrefixes.length) {
    candidates.push('prefix');
  }

  if (analysis.significantSuffixes.length) {
    candidates.push('suffix');
  }

  if (analysis.detectedClusters.length) {
    candidates.push('cluster');
  }

  if (analysis.detectedVowelGroups.length) {
    candidates.push('vowelGroup');
  }

  if (analysis.significantSilentPatterns.length) {
    candidates.push('silentEnding');
  }

  if (analysis.detectedStressMarkers.length) {
    candidates.push('stressMarker');
  }

  if (analysis.possibleChunks.length > 1) {
    candidates.push('syllableChunk');
  }

  if (analysis.possibleCompoundParts.length > 1) {
    candidates.push('compoundBoundary');
  }

  if (analysis.isLongWord) {
    candidates.push('longWord');
  }

  return candidates;
}

function createAnalysis(token, languageModel, profile) {
  const normalized = token.normalized;
  const isFastMode = profile.performanceMode === 'fast';
  const allowCompoundDetection =
    !isFastMode &&
    languageModel.parsingRules.enableCompoundDetection &&
    profile.languageAware.enableCompoundSplitting;
  const allowChunking =
    languageModel.parsingRules.enableSyllableApproximation &&
    profile.languageAware.enableSyllableChunking;

  const detectedPrefixes = languageModel.methods.detectPrefixes(token.value);
  const detectedSuffixes = languageModel.methods.detectSuffixes(token.value);
  const detectedClusters = languageModel.methods.detectClusters(token.value);
  const detectedVowelGroups = languageModel.methods.detectVowelGroups(token.value);
  const detectedSilentPatterns =
    !isFastMode && languageModel.parsingRules.enableSilentPatternDetection
      ? languageModel.methods.detectSilentFeatures(token.value)
      : [];
  const detectedStressMarkers =
    languageModel.parsingRules.enableStressDetection && profile.languageAware.enableStressHighlighting
      ? languageModel.methods.detectStressFeatures(token.value)
      : [];
  const possibleChunks = allowChunking ? languageModel.methods.splitIntoChunks(token.value) : [normalized];
  const possibleCompoundParts = allowCompoundDetection
    ? languageModel.methods.detectCompounds(token.value)
    : [];
  const wordRole = languageModel.methods.classifyWordRole(token.value);
  const isFunctionWord = wordRole === 'function';
  const isHighFrequencyWord = wordRole === 'highFrequency';
  const analysis = {
    text: token.value,
    normalized,
    language: languageModel.code,
    length: normalized.length,
    isFunctionWord,
    isHighFrequencyWord,
    isLongWord: normalized.length >= languageModel.weights.longWordThreshold,
    isVeryLongWord: normalized.length >= languageModel.weights.veryLongWordThreshold,
    detectedPrefixes,
    detectedSuffixes,
    detectedClusters,
    detectedVowelGroups,
    detectedSilentPatterns,
    significantSilentPatterns: [],
    detectedStressMarkers,
    possibleChunks,
    possibleCompoundParts,
    significantSuffixes: [],
    complexityScore: 0,
    emphasisCandidates: [],
    recommendedEmphasisTier: 'none',
    wordRole,
  };

  analysis.significantSuffixes = detectedSuffixes.filter((suffixMatch) => {
    const hasUsefulLength = suffixMatch.pattern.length >= 3;
    const isLexicalSuffix =
      suffixMatch.category === 'derivational' ||
      suffixMatch.category === 'noun' ||
      suffixMatch.category === 'adjective' ||
      suffixMatch.category === 'adverb' ||
      suffixMatch.category === 'diminutive' ||
      suffixMatch.category === 'common';

    if (isLexicalSuffix && suffixMatch.weight >= 0.58 && (normalized.length >= 6 || hasUsefulLength)) {
      return true;
    }

    if (!hasUsefulLength) {
      return false;
    }

    return (
      suffixMatch.weight >= 0.46 &&
      normalized.length >= 7 &&
      !analysis.isFunctionWord &&
      !analysis.isHighFrequencyWord
    );
  });
  analysis.significantSilentPatterns = detectedSilentPatterns.filter((silentMatch) => {
    if (silentMatch.reason !== 'silent-final-e') {
      return true;
    }

    return normalized.length >= 7 && !analysis.isFunctionWord && !analysis.isHighFrequencyWord;
  });
  analysis.complexityScore = languageModel.methods.calculateWordComplexity(analysis, profile);
  analysis.emphasisCandidates = buildEmphasisCandidates(analysis);
  analysis.recommendedEmphasisTier = pickRecommendedTier(analysis.complexityScore);

  return analysis;
}

export function analyzeWords(documentModel, languageModel, profile, performanceContext) {
  documentModel.words.forEach((token) => {
    const cacheKey = [
      languageModel.code,
      token.normalized,
      profile.performanceMode,
      profile.languageAware.enableClusterHighlighting,
      profile.languageAware.enableSuffixHighlighting,
      profile.languageAware.enablePrefixHighlighting,
      profile.languageAware.enableCompoundSplitting,
      profile.languageAware.enableSyllableChunking,
      profile.languageAware.enableStressHighlighting,
      profile.languageAware.enableSilentPatternMarking,
    ].join('|');

    token.analysis = cloneAnalysis(
      withCachedResult(performanceContext, 'wordAnalysis', cacheKey, () =>
        createAnalysis(token, languageModel, profile),
      ),
    );
    token.language = languageModel.code;
    token.engine = {
      isAnchor: false,
      emphasisTier: null,
      baseScore: 0,
      smoothedScore: 0,
      modifiers: [],
      renderMode: 'plain',
      selectionReasons: [],
      frontLoad: {
        isActive: false,
        prefixLength: 0,
        remainderTier: null,
        strategy: null,
      },
      candidateZones: [],
      selectedZones: [],
    };
  });

  return documentModel;
}
