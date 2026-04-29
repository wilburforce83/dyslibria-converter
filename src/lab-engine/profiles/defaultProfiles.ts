// @ts-nocheck
import { DEFAULT_PROFILE } from './profileSchema.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeDeep(base, override) {
  const output = Array.isArray(base) ? [...base] : { ...base };

  Object.entries(override || {}).forEach(([key, value]) => {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      output[key] &&
      typeof output[key] === 'object' &&
      !Array.isArray(output[key])
    ) {
      output[key] = mergeDeep(output[key], value);
      return;
    }

    output[key] = value;
  });

  return output;
}

function buildProfile(id, name, description, override) {
  return mergeDeep(clone(DEFAULT_PROFILE), {
    id,
    name,
    description,
    ...override,
  });
}

export const DEFAULT_PROFILES = [
  buildProfile(
    'dyslibria-balanced',
    'Balanced',
    'Research-informed, structure-aware, sparse semantic cueing with calm spacing.',
    {},
  ),
  buildProfile(
    'minimal-intervention',
    'Minimal intervention',
    'Near-baseline rendering with accessible spacing and almost no semantic cueing.',
    {
      emphasisDensity: 0.06,
      maxEmphasisPerSentence: 1,
      maxEmphasisPerParagraph: 0.05,
      cooldownBetweenAnchors: 2,
      readingNeeds: {
        lowVisualNoiseMode: true,
      },
      languageAware: {
        enableClusterHighlighting: false,
        enableSuffixHighlighting: false,
        enablePrefixHighlighting: false,
        enableCompoundSplitting: false,
        enableSyllableChunking: false,
        enableStressHighlighting: false,
        enableSilentPatternMarking: false,
      },
      attentionMapping: {
        maxAnchorsPerSentence: 1,
        anchorDensity: 0.06,
        antiClumpingWindow: 4,
        anchorWordMinimumLength: 5,
      },
      flowControl: {
        cooldownAfterEmphasis: 2,
        emphasisSmoothing: 0.36,
      },
      cognitiveLoad: {
        emphasisBudgetPerParagraph: 0.05,
      },
      structuralAwareness: {
        sentenceStarts: false,
        clauseBoundaries: false,
        punctuationWeight: 0.08,
        paragraphLeadEmphasis: false,
      },
      visual: {
        letterSpacing: '0.012em',
        wordSpacing: '0.03em',
        lineHeight: 1.8,
        paragraphSpacing: '1.2em',
        maxLineWidth: '38rem',
      },
    },
  ),
  buildProfile(
    'dense-text-support',
    'Dense text support',
    'Structure-first support for dense nonfiction with paragraph guidance and sparse anchors.',
    {
      emphasisDensity: 0.1,
      maxEmphasisPerSentence: 2,
      maxEmphasisPerParagraph: 0.08,
      readingNeeds: {
        longTextFatigueSupport: true,
        lowVisualNoiseMode: true,
      },
      languageAware: {
        enableClusterHighlighting: false,
        enableSuffixHighlighting: true,
        enablePrefixHighlighting: false,
        enableCompoundSplitting: true,
        enableSyllableChunking: false,
        enableStressHighlighting: false,
        enableSilentPatternMarking: false,
      },
      attentionMapping: {
        maxAnchorsPerSentence: 2,
        anchorDensity: 0.1,
        anchorDistribution: 'front-loaded',
        antiClumpingWindow: 3,
        anchorWordMinimumLength: 5,
      },
      cognitiveLoad: {
        emphasisBudgetPerParagraph: 0.08,
        longSentenceThreshold: 15,
      },
      structuralAwareness: {
        sentenceStarts: true,
        clauseBoundaries: true,
        punctuationWeight: 0.24,
        paragraphLeadEmphasis: true,
      },
      visual: {
        letterSpacing: '0.012em',
        wordSpacing: '0.03em',
        lineHeight: 1.8,
        paragraphSpacing: '1.22em',
        maxLineWidth: '35rem',
      },
    },
  ),
  buildProfile(
    'technical-reading',
    'Technical reading support',
    'Sparse first-mention and terminology-aware cueing for dense technical prose.',
    {
      performanceMode: 'deep',
      emphasisDensity: 0.12,
      maxEmphasisPerSentence: 2,
      maxEmphasisPerParagraph: 0.09,
      readingNeeds: {
        technicalReadingSupport: true,
        longTextFatigueSupport: true,
      },
      languageAware: {
        enableClusterHighlighting: true,
        enableSuffixHighlighting: true,
        enablePrefixHighlighting: false,
        enableCompoundSplitting: true,
        enableSyllableChunking: false,
        enableStressHighlighting: false,
        enableSilentPatternMarking: false,
      },
      attentionMapping: {
        maxAnchorsPerSentence: 2,
        anchorDensity: 0.12,
        anchorDistribution: 'front-loaded',
        antiClumpingWindow: 3,
        anchorWordMinimumLength: 5,
      },
      cognitiveLoad: {
        emphasisBudgetPerParagraph: 0.09,
        longSentenceThreshold: 15,
      },
      structuralAwareness: {
        sentenceStarts: true,
        clauseBoundaries: true,
        punctuationWeight: 0.24,
        paragraphLeadEmphasis: true,
      },
      wordComplexity: {
        wordLengthWeight: 0.3,
        uncommonPatternWeight: 0.28,
        suffixWeight: 0.26,
        vowelClusterWeight: 0.16,
      },
      visual: {
        lineHeight: 1.8,
        paragraphSpacing: '1.22em',
        maxLineWidth: '34rem',
      },
    },
  ),
  buildProfile(
    'focus-support',
    'Focus support',
    'Low-noise, short-line support with clause-shift anchors and strong anti-clumping.',
    {
      emphasisDensity: 0.08,
      maxEmphasisPerSentence: 1,
      maxEmphasisPerParagraph: 0.06,
      cooldownBetweenAnchors: 2,
      readingNeeds: {
        adhdFocusSupport: true,
        longTextFatigueSupport: true,
        lowVisualNoiseMode: true,
      },
      languageAware: {
        enableClusterHighlighting: false,
        enableSuffixHighlighting: false,
        enablePrefixHighlighting: false,
        enableCompoundSplitting: false,
        enableSyllableChunking: false,
        enableStressHighlighting: false,
        enableSilentPatternMarking: false,
      },
      attentionMapping: {
        maxAnchorsPerSentence: 1,
        anchorDensity: 0.08,
        anchorDistribution: 'front-loaded',
        antiClumpingWindow: 4,
        anchorWordMinimumLength: 4,
      },
      flowControl: {
        cooldownAfterEmphasis: 2,
        emphasisSmoothing: 0.34,
      },
      cognitiveLoad: {
        emphasisBudgetPerParagraph: 0.06,
        longSentenceThreshold: 15,
      },
      structuralAwareness: {
        sentenceStarts: true,
        clauseBoundaries: true,
        punctuationWeight: 0.16,
        paragraphLeadEmphasis: true,
      },
      visual: {
        letterSpacing: '0.018em',
        wordSpacing: '0.05em',
        lineHeight: 1.88,
        paragraphSpacing: '1.28em',
        maxLineWidth: '30rem',
      },
    },
  ),
  buildProfile(
    'dyslexia-spacing',
    'Dyslexia spacing',
    'Coordinated letter and word spacing with restrained cue density and readable defaults.',
    {
      emphasisDensity: 0.06,
      maxEmphasisPerSentence: 1,
      maxEmphasisPerParagraph: 0.06,
      cooldownBetweenAnchors: 2,
      readingNeeds: {
        dyslexiaSupport: true,
        longTextFatigueSupport: true,
        lowVisualNoiseMode: true,
      },
      languageAware: {
        enableClusterHighlighting: false,
        enableSuffixHighlighting: false,
        enablePrefixHighlighting: false,
        enableCompoundSplitting: false,
        enableSyllableChunking: false,
        enableStressHighlighting: false,
        enableSilentPatternMarking: false,
      },
      attentionMapping: {
        maxAnchorsPerSentence: 1,
        anchorDensity: 0.06,
        antiClumpingWindow: 4,
        anchorWordMinimumLength: 5,
      },
      flowControl: {
        cooldownAfterEmphasis: 2,
        emphasisSmoothing: 0.36,
      },
      cognitiveLoad: {
        emphasisBudgetPerParagraph: 0.06,
      },
      visual: {
        letterSpacing: '0.03em',
        wordSpacing: '0.08em',
        lineHeight: 1.94,
        paragraphSpacing: '1.36em',
        maxLineWidth: '31rem',
      },
    },
  ),
  buildProfile(
    'front-load-emphasis',
    'Front-Load Emphasis',
    'Experimental decoding-oriented prefix emphasis that stays off in standard Dyslibria profiles.',
    {
      frontLoad: {
        enableFrontLoad: true,
        frontLoadDensity: 0.18,
        frontLoadStrategy: 'everyWord',
        frontLoadWordCoverage: 0.4,
        frontLoadMinWordLength: 4,
        frontLoadPrefixMinChars: 2,
        frontLoadPrefixMaxChars: 4,
        frontLoadScalingByWordLength: true,
        frontLoadSentenceBias: 'startHeavy',
        frontLoadCooldown: 1,
        frontLoadMaxConsecutive: 1,
        frontLoadOnlyComplexWords: false,
        frontLoadOnlyLongWords: false,
      },
    },
  ),
];

export const INTERNAL_PRESET_PROFILES = [
  buildProfile('kindle-safe', 'Kindle Safe', 'Minimal, robust output for Kindle delivery.', {
    emphasisMethod: 'wholeWord',
    outputCompatibilityMode: 'kindleSafe',
    output: {
      epubMode: 'kindle-safe',
    },
    visual: {
      useBold: true,
      useSemiBold: false,
      useUnderline: false,
      useDottedUnderline: false,
      useSubtleBackground: false,
      useColour: false,
    },
    languageAware: {
      enablePrefixHighlighting: false,
      enableClusterHighlighting: false,
      enableSilentPatternMarking: false,
    },
    frontLoad: {
      enableFrontLoad: false,
    },
    experimental: {
      enableWeightFade: false,
      enableMultiSpanGradient: false,
      enableChunkMarkers: false,
      enableCompoundBoundaryMarkers: false,
      enableDebugAnnotations: false,
      multiWeightFade: false,
      chunkBasedSplitting: false,
      anchorMarkers: false,
      spacingBasedEmphasis: false,
    },
  }),
  buildProfile('experimental-multi-tier', 'Experimental lab', 'Uses advanced styling and debug features.', {
    emphasisMethod: 'languageZones',
    outputCompatibilityMode: 'experimental',
    performanceMode: 'deep',
    emphasisDensity: 0.34,
    maxEmphasisPerSentence: 5,
    languageAware: {
      enablePrefixHighlighting: true,
      enableClusterHighlighting: true,
      enableSuffixHighlighting: true,
      enableCompoundSplitting: true,
      enableSyllableChunking: true,
      enableSilentPatternMarking: true,
    },
    frontLoad: {
      enableFrontLoad: true,
      frontLoadDensity: 0.28,
      frontLoadStrategy: 'everyNthWord',
      frontLoadSentenceBias: 'startHeavy',
      frontLoadCooldown: 0,
      frontLoadMaxConsecutive: 2,
    },
    experimental: {
      enableWeightFade: true,
      enableMultiSpanGradient: true,
      enableChunkMarkers: true,
      enableCompoundBoundaryMarkers: true,
      enableDebugAnnotations: true,
      multiWeightFade: true,
      chunkBasedSplitting: true,
      anchorMarkers: true,
      spacingBasedEmphasis: true,
    },
    debug: {
      showClusters: true,
      showSuffixes: true,
      showPrefixes: true,
      showCompounds: true,
      showSilentPatterns: true,
      showStressMarkers: true,
      showChunks: true,
      showSelectedEmphasisZones: true,
    },
  }),
];

export const PRESET_ALIASES = {
  'dyslibria-sparse': 'minimal-intervention',
  'dyslibria-deep-parse': 'dense-text-support',
  'dyslibria-dyslexia-spacing': 'dyslexia-spacing',
  'dyslibria-adhd-focus': 'focus-support',
  'fiction-flow': 'minimal-intervention',
  'dyslibria-language-learner': 'dense-text-support',
};

export { buildProfile, mergeDeep };
