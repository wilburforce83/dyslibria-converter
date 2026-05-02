// @ts-nocheck
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function getDistributionBias(progress, distribution) {
  if (distribution === 'front-loaded' || distribution === 'startHeavy') {
    return 1 - progress;
  }

  if (distribution === 'back-loaded' || distribution === 'endHeavy') {
    return progress;
  }

  return 1 - Math.abs(progress - 0.5);
}

function createTargetPositions(wordCount, emphasisCount, distribution) {
  if (!wordCount || !emphasisCount) {
    return [];
  }

  const ratios = Array.from({ length: emphasisCount }, (_, index) => (index + 1) / (emphasisCount + 1));

  return ratios.map((ratio) => {
    let adjustedRatio = ratio;

    if (distribution === 'front-loaded' || distribution === 'startHeavy') {
      adjustedRatio = ratio * ratio;
    } else if (distribution === 'back-loaded' || distribution === 'endHeavy') {
      adjustedRatio = 1 - (1 - ratio) * (1 - ratio);
    }

    return Math.round(adjustedRatio * Math.max(wordCount - 1, 0));
  });
}

function getMaxConsecutiveRun(positions) {
  const sortedPositions = [...positions].sort((left, right) => left - right);
  let maxRun = 0;
  let currentRun = 0;
  let previousPosition = null;

  sortedPositions.forEach((position) => {
    if (previousPosition === null || position !== previousPosition + 1) {
      currentRun = 1;
    } else {
      currentRun += 1;
    }

    previousPosition = position;
    maxRun = Math.max(maxRun, currentRun);
  });

  return maxRun;
}

function canSelectWord(word, selectedWords, profile, options = {}) {
  const maxConsecutive = options.maxConsecutive ?? profile.maxConsecutiveEmphasisedWords;
  const minimumGap = Math.max(
    profile.attentionMapping.antiClumpingWindow,
    profile.cooldownBetweenAnchors,
    options.additionalCooldown ?? 0,
  );

  if (selectedWords.some((candidate) => candidate.positionInSentence === word.positionInSentence)) {
    return false;
  }

  const positions = selectedWords.map((candidate) => candidate.positionInSentence);

  if (getMaxConsecutiveRun([...positions, word.positionInSentence]) > maxConsecutive) {
    return false;
  }

  return selectedWords.every((selectedWord) => {
    const gap = Math.abs(selectedWord.positionInSentence - word.positionInSentence);

    return gap > minimumGap;
  });
}

function getWordDifficultyScore(word) {
  return Math.max(word.analysis.readingPressureScore || 0, word.analysis.complexityScore || 0);
}

function calculateWordScore(word, sentence, profile) {
  const context = word.analysis.documentContext || {};
  const difficultyScore = getWordDifficultyScore(word);
  const localPressure = word.analysis.localReadingPressure || 0;
  const progress =
    sentence.analysis.wordCount > 1
      ? word.positionInSentence / (sentence.analysis.wordCount - 1)
      : 0;
  const qualifiesAsSentenceStartAnchor =
    word.positionInSentence === 0 &&
    !word.analysis.isFunctionWord &&
    !word.analysis.isHighFrequencyWord &&
    (word.analysis.length >= 4 ||
      difficultyScore >= 0.28 ||
      word.analysis.wordRole === 'technical');
  const structureBonus =
    Number(profile.structuralAwareness.sentenceStarts && qualifiesAsSentenceStartAnchor) * 0.14 +
    Number(profile.structuralAwareness.clauseBoundaries && word.afterClauseBoundary) * 0.14 +
    Number(profile.structuralAwareness.paragraphLeadEmphasis && context.isParagraphLeadCandidate) * 0.2;
  const languageBonus =
    Number(profile.languageAware.enableFunctionWordSuppression && !word.analysis.isFunctionWord) * 0.16 +
    Number(profile.readingNeeds.technicalReadingSupport && context.isTerminologyCandidate) * 0.18 +
    Number(context.isFirstMeaningfulOccurrence) * 0.16;
  const needAdjustments =
    Number(profile.readingNeeds.dyslexiaSupport && word.analysis.isLongWord) * 0.12 +
    Number(profile.readingNeeds.dyslexiaSupport && difficultyScore >= 0.44) * 0.1 +
    Number(profile.readingNeeds.adhdFocusSupport && word.positionInSentence < 2) * 0.16 +
    Number(profile.readingNeeds.longTextFatigueSupport && sentence.analysis.isDense) * 0.12 +
    Number(sentence.analysis.isDense && (difficultyScore >= 0.42 || context.isFirstMeaningfulOccurrence)) * 0.08 -
    Number(profile.readingNeeds.fictionComfortMode && word.analysis.isHighFrequencyWord) * 0.06 -
    Number(profile.readingNeeds.lowVisualNoiseMode && word.analysis.isFunctionWord) * 0.14 -
    Number(profile.readingNeeds.lowVisualNoiseMode && sentence.analysis.isSimple && difficultyScore < 0.34) * 0.08 -
    Number(profile.readingNeeds.lowVisualNoiseMode && context.isRepeatedEasyWord) * 0.12;
  const complexityBias = difficultyScore * 0.6 + localPressure * 0.12 + sentence.analysis.densityScore * 0.08;
  const distributionBias = getDistributionBias(progress, profile.attentionMapping.anchorDistribution) * 0.08;
  const decayMultiplier = 1 - profile.flowControl.decayFactorAcrossSentence * progress;
  const repetitionPenalty =
    Number(word.analysis.isHighFrequencyWord) * 0.1 +
    Number(context.isRepeatedEasyWord) * 0.16 +
    Number(!context.isFirstOccurrence && context.totalOccurrences >= 3 && !context.isTerminologyCandidate) * 0.08 +
    Number(
      word.analysis.length <= 3 &&
        difficultyScore < 0.24 &&
        !context.isTerminologyCandidate &&
        !context.isParagraphLeadCandidate,
    ) *
      0.18;

  return clamp(
    (0.08 + structureBonus + languageBonus + needAdjustments + complexityBias + distributionBias - repetitionPenalty) *
      decayMultiplier,
    0,
    3,
  );
}

function buildSelectionReasons(word, sentence, profile) {
  const reasons = [];
  const context = word.analysis.documentContext || {};
  const difficultyScore = getWordDifficultyScore(word);

  if (difficultyScore >= 0.58) {
    reasons.push('trickier word shape');
  }

  if (word.analysis.isLongWord) {
    reasons.push('longer word');
  }

  if (profile.readingNeeds.technicalReadingSupport && word.analysis.wordRole === 'technical') {
    reasons.push('technical term');
  }

  if (context.isTerminologyCandidate && !reasons.includes('technical term')) {
    reasons.push('key term');
  }

  if (context.isFirstMeaningfulOccurrence) {
    reasons.push('first mention');
  }

  if (word.analysis.lexicalRarityScore >= 0.62 && word.analysis.wordRole !== 'technical') {
    reasons.push('uncommon word');
  }

  if (
    profile.readingNeeds.dyslexiaSupport &&
    (word.analysis.isLongWord || difficultyScore >= 0.48)
  ) {
    reasons.push('crowding relief');
  }

  if (profile.readingNeeds.adhdFocusSupport && word.positionInSentence < 2) {
    reasons.push('early-line focus');
  }

  if (profile.readingNeeds.longTextFatigueSupport && sentence.analysis.isDense) {
    reasons.push('dense-passage support');
  }

  if (
    profile.structuralAwareness.sentenceStarts &&
    word.positionInSentence === 0 &&
    !word.analysis.isFunctionWord &&
    !word.analysis.isHighFrequencyWord &&
    (word.analysis.length >= 4 ||
      difficultyScore >= 0.28 ||
      word.analysis.wordRole === 'technical')
  ) {
    reasons.push('start of sentence');
  }

  if (profile.structuralAwareness.clauseBoundaries && word.afterClauseBoundary) {
    reasons.push('after punctuation break');
  }

  if (profile.structuralAwareness.paragraphLeadEmphasis && context.isParagraphLeadCandidate) {
    reasons.push('paragraph lead');
  }

  if (sentence.analysis.isDense) {
    reasons.push('dense passage');
  }

  if (word.analysis.localReadingPressure >= 0.54) {
    reasons.push('clustered difficult words');
  }

  if (profile.languageAware.enableSuffixHighlighting && word.analysis.significantSuffixes.length) {
    reasons.push(`helpful ending: ${word.analysis.significantSuffixes[0].pattern}`);
  }

  if (profile.languageAware.enableCompoundSplitting && word.analysis.possibleCompoundParts.length > 1) {
    reasons.push('compound word');
  }

  if (profile.languageAware.enableStressHighlighting && word.analysis.detectedStressMarkers.length) {
    reasons.push('stress cue');
  }

  return reasons.length ? [...new Set(reasons)] : ['spacing pattern'];
}

function clearAnchorWord(word) {
  word.engine.isAnchor = false;
  word.engine.emphasisTier = null;
  word.engine.renderMode = 'plain';
  word.engine.candidateZones = [];
  word.engine.selectedZones = [];
}

function resolveAnchorRenderMode(word, profile) {
  const context = word.analysis.documentContext || {};

  if (profile.emphasisMethod === 'wholeWord') {
    return 'wholeWord';
  }

  if (profile.emphasisMethod === 'languageZones') {
    return 'zones';
  }

  if (
    context.isFirstMeaningfulOccurrence ||
    context.isParagraphLeadCandidate ||
    context.isTerminologyCandidate ||
    (profile.readingNeeds.lowVisualNoiseMode && !profile.languageAware.enableSilentPatternMarking)
  ) {
    return 'wholeWord';
  }

  return (profile.languageAware.enableSilentPatternMarking &&
    word.analysis.detectedSilentPatterns.length > 0) ||
    (profile.languageAware.enablePrefixHighlighting && word.analysis.detectedPrefixes.length > 0) ||
    word.analysis.possibleCompoundParts.length > 1 ||
    word.analysis.significantSuffixes.length > 0 ||
    (profile.languageAware.enableClusterHighlighting && word.analysis.detectedClusters.length > 1) ||
    getWordDifficultyScore(word) >= 0.72
    ? 'zones'
    : 'wholeWord';
}

function pickPrimaryZones(word, sentence, profile, languageModel) {
  const zones = languageModel.methods.detectEmphasisZones(word.analysis, profile).map((zone) => ({ ...zone }));

  if (word.positionInSentence === 0) {
    zones.push({
      startIndex: 0,
      endIndex: Math.min(word.value.length, 2),
      zoneType: 'sentenceStart',
      tier: 'tertiary',
      reason: 'sentence-start',
      confidence: 0.6,
    });
  }

  if (word.afterClauseBoundary) {
    zones.push({
      startIndex: 0,
      endIndex: Math.min(word.value.length, 3),
      zoneType: 'clauseStart',
      tier: 'secondary',
      reason: 'clause-start',
      confidence: 0.68,
    });
  }

  if (profile.readingNeeds.technicalReadingSupport && word.analysis.wordRole === 'technical') {
    zones.push({
      startIndex: 0,
      endIndex: Math.min(word.value.length, Math.max(3, Math.ceil(word.value.length * 0.33))),
      zoneType: 'technicalTerm',
      tier: 'primary',
      reason: 'technical-reading-support',
      confidence: 0.8,
    });
  }

  return zones
    .sort((left, right) => right.confidence - left.confidence)
    .filter((zone, index, zonesList) => {
      if (index === 0) {
        return true;
      }

      return !zonesList
        .slice(0, index)
        .some(
          (selectedZone) =>
            zone.startIndex < selectedZone.endIndex && zone.endIndex > selectedZone.startIndex,
        );
    })
    .slice(0, 2);
}

function computeFrontLoadPrefixLength(word, profile) {
  const minimumPrefix = profile.frontLoad.frontLoadPrefixMinChars;
  const maximumPrefix = profile.frontLoad.frontLoadPrefixMaxChars;
  const maxAllowed = Math.max(word.value.length - 1, 1);

  if (profile.frontLoad.frontLoadStrategy === 'everyWord') {
    const desiredCoverage = clamp(profile.frontLoad.frontLoadWordCoverage || 0.42, 0.15, 1);
    const coverageLength = Math.round(word.analysis.length * desiredCoverage);

    return clamp(coverageLength, minimumPrefix, Math.min(maximumPrefix, maxAllowed));
  }

  if (!profile.frontLoad.frontLoadScalingByWordLength || minimumPrefix >= maximumPrefix) {
    return clamp(minimumPrefix, 1, maxAllowed);
  }

  const scale = clamp((word.analysis.length - minimumPrefix - 2) / 8, 0, 1);

  return clamp(
    Math.round(minimumPrefix + (maximumPrefix - minimumPrefix) * scale),
    minimumPrefix,
    maxAllowed,
  );
}

function isEligibleFrontLoadWord(word, profile) {
  if (
    word.analysis.length < (profile.frontLoad.frontLoadMinWordLength || 2) ||
    word.analysis.length <= 1
  ) {
    return false;
  }

  switch (profile.frontLoad.frontLoadStrategy) {
    case 'everyWord':
      return true;
    case 'longWordsOnly':
      return word.analysis.isLongWord;
    case 'complexWordsOnly':
      return getWordDifficultyScore(word) >= 0.46;
    case 'everyNthWord':
      return true;
    case 'contentWordsOnly':
    default:
      return !word.analysis.isFunctionWord;
  }
}

function activateFrontLoadWord(word, profile) {
  const prefixLength = computeFrontLoadPrefixLength(word, profile);

  if (prefixLength >= word.value.length) {
    return false;
  }

  word.engine.isAnchor = true;
  word.engine.renderMode = 'frontLoad';
  word.engine.frontLoad = {
    isActive: true,
    prefixLength,
    remainderTier: getWordDifficultyScore(word) >= 0.62 ? 'secondary' : null,
    strategy: profile.frontLoad.frontLoadStrategy,
  };
  word.engine.selectionReasons = [...new Set([...(word.engine.selectionReasons || []), 'front-load emphasis'])];
  word.engine.selectedZones = [
    {
      startIndex: 0,
      endIndex: prefixLength,
      zoneType: 'prefix',
      tier: 'primary',
      reason: `front-load:${profile.frontLoad.frontLoadStrategy}`,
      confidence: 0.76,
    },
  ];
  word.engine.emphasisTier = 'primary';

  return true;
}

function assignTierToSelectedWords(selectedWords, sentence, profile) {
  const smoothing = profile.flowControl.emphasisSmoothing;

  selectedWords.forEach((word) => {
    const neighboringScores = sentence.words
      .filter((candidate) => Math.abs(candidate.positionInSentence - word.positionInSentence) === 1)
      .map((candidate) => candidate.engine.baseScore);
    const neighborAverage = average(neighboringScores);

    word.engine.smoothedScore =
      word.engine.baseScore * (1 - smoothing) + neighborAverage * smoothing;
  });

  const rankedWords = [...selectedWords].sort(
    (left, right) => right.engine.smoothedScore - left.engine.smoothedScore,
  );
  const primaryCount = Math.max(1, Math.round(rankedWords.length * profile.multiTier.primaryShare));
  const secondaryCount = Math.max(
    0,
    Math.min(
      rankedWords.length - primaryCount,
      Math.round(rankedWords.length * profile.multiTier.secondaryShare),
    ),
  );

  rankedWords.forEach((word, index) => {
    if (index < primaryCount) {
      word.engine.emphasisTier = 'primary';
      return;
    }

    if (index < primaryCount + secondaryCount) {
      word.engine.emphasisTier = 'secondary';
      return;
    }

    word.engine.emphasisTier = 'tertiary';
  });
}

function assignDesiredSentenceCount(sentence, profile) {
  let desiredCount = Math.round(sentence.analysis.wordCount * profile.emphasisDensity);
  const hasSubstantiveCandidate = sentence.words.some(
    (word) =>
      word.analysis.documentContext?.isFirstMeaningfulOccurrence ||
      getWordDifficultyScore(word) >= 0.14 ||
      word.analysis.isLongWord ||
      word.analysis.possibleCompoundParts.length > 1,
  );

  if (sentence.analysis.wordCount >= 6 && desiredCount === 0 && profile.emphasisDensity >= 0.14) {
    desiredCount = 1;
  }

  if (
    sentence.index === 0 &&
    profile.structuralAwareness.paragraphLeadEmphasis &&
    sentence.analysis.wordCount >= 5
  ) {
    desiredCount = Math.max(desiredCount, 1);
  }

  if (sentence.analysis.isDense) {
    desiredCount += 1;
  }

  if (sentence.analysis.isVeryDense) {
    desiredCount += 1;
  }

  if (sentence.analysis.isSimple && profile.cognitiveLoad.deprioritizeSimpleSentences) {
    desiredCount -= 1;
  }

  if (
    profile.readingNeeds.technicalReadingSupport &&
    Math.max(sentence.analysis.averageComplexity, sentence.analysis.averageReadingPressure) >= 0.42
  ) {
    desiredCount += 1;
  }

  if (!desiredCount && hasSubstantiveCandidate) {
    desiredCount = 1;
  }

  return clamp(desiredCount, 0, profile.maxEmphasisPerSentence);
}

function rebalanceParagraphBudget(sentencePlans, paragraphWordCount, profile) {
  if (profile.frontLoad.enableFrontLoad && profile.frontLoad.frontLoadStrategy === 'everyWord') {
    return sentencePlans;
  }

  const paragraphBudget = paragraphWordCount
    ? Math.max(1, Math.floor(paragraphWordCount * profile.maxEmphasisPerParagraph))
    : 0;
  let allocatedCount = sentencePlans.reduce(
    (sum, plan) => sum + plan.anchorCount + plan.frontLoadCount,
    0,
  );

  if (allocatedCount <= paragraphBudget) {
    return sentencePlans;
  }

  const plansByPriority = [...sentencePlans].sort((left, right) => {
    if (left.sentence.analysis.isSimple !== right.sentence.analysis.isSimple) {
      return Number(right.sentence.analysis.isSimple) - Number(left.sentence.analysis.isSimple);
    }

    return left.sentence.analysis.densityScore - right.sentence.analysis.densityScore;
  });

  while (allocatedCount > paragraphBudget) {
    const reducibleFrontLoadPlan = plansByPriority.find((plan) => plan.frontLoadCount > 0);

    if (reducibleFrontLoadPlan) {
      reducibleFrontLoadPlan.frontLoadCount -= 1;
      allocatedCount -= 1;
      continue;
    }

    const reducibleAnchorPlan = plansByPriority.find((plan) => plan.anchorCount > 0);

    if (!reducibleAnchorPlan) {
      break;
    }

    reducibleAnchorPlan.anchorCount -= 1;
    allocatedCount -= 1;
  }

  return sentencePlans;
}

function activateAnchorWord(word, sentence, profile, languageModel, selectedWords) {
  selectedWords.push(word);
  word.engine.isAnchor = true;
  word.engine.renderMode = resolveAnchorRenderMode(word, profile);
  word.engine.candidateZones = pickPrimaryZones(word, sentence, profile, languageModel);
}

function ensureSubstantiveAnchorCoverage(sentence, candidateWords, selectedWords, profile, languageModel) {
  if (selectedWords.length < 2 || sentence.analysis.wordCount < 12) {
    return;
  }

  let replacements = 0;

  while (replacements < 2) {
    const replacementCandidates = [...candidateWords]
      .filter(
        (word) =>
          !word.engine.isAnchor &&
          (word.analysis.documentContext?.isFirstMeaningfulOccurrence ||
            getWordDifficultyScore(word) >= 0.14 ||
            word.analysis.isLongWord ||
            word.analysis.possibleCompoundParts.length > 1),
      )
      .sort((left, right) => right.engine.baseScore - left.engine.baseScore);
    const replaceableWords = [...selectedWords]
      .filter((word) => !word.analysis.documentContext?.isParagraphLeadCandidate)
      .sort((left, right) => left.engine.baseScore - right.engine.baseScore);
    const replacementPair = replacementCandidates
      .flatMap((candidate) =>
        replaceableWords.map((replaceableWord) => ({
          candidate,
          replaceableWord,
          remainingSelectedWords: selectedWords.filter((word) => word !== replaceableWord),
        })),
      )
      .find(
        ({ candidate, replaceableWord, remainingSelectedWords }) =>
        candidate.engine.baseScore >= replaceableWord.engine.baseScore + 0.08 &&
        canSelectWord(candidate, remainingSelectedWords, profile),
      );

    if (!replacementPair) {
      return;
    }
    const { candidate, replaceableWord } = replacementPair;
    clearAnchorWord(replaceableWord);
    selectedWords.splice(selectedWords.indexOf(replaceableWord), 1);
    activateAnchorWord(candidate, sentence, profile, languageModel, selectedWords);
    replacements += 1;
  }
}

function selectAnchorWords(sentence, anchorCount, profile, languageModel) {
  if (!anchorCount) {
    return [];
  }

  const targetPositions = createTargetPositions(
    sentence.analysis.wordCount,
    anchorCount,
    profile.attentionMapping.anchorDistribution,
  );
  const candidateWords = sentence.words.filter(
    (word) =>
      (word.analysis.length >= profile.attentionMapping.anchorWordMinimumLength ||
        word.analysis.documentContext?.isParagraphLeadCandidate ||
        word.analysis.documentContext?.isFirstMeaningfulOccurrence ||
        word.analysis.documentContext?.isTerminologyCandidate) &&
      !(profile.languageAware.enableFunctionWordSuppression && word.analysis.isFunctionWord),
  );
  const selectedWords = [];

  sentence.words.forEach((word) => {
    word.engine.baseScore = calculateWordScore(word, sentence, profile);
    word.engine.selectionReasons = buildSelectionReasons(word, sentence, profile);
  });

  const priorityCandidate = [...candidateWords]
    .filter(
      (word) =>
        canSelectWord(word, selectedWords, profile) &&
        (word.analysis.documentContext?.isParagraphLeadCandidate ||
          word.analysis.documentContext?.isFirstMeaningfulOccurrence),
    )
    .sort((left, right) => {
      const leftPriority =
        left.engine.baseScore +
        Number(left.analysis.documentContext?.isParagraphLeadCandidate) * 0.28 +
        Number(left.analysis.documentContext?.isFirstMeaningfulOccurrence) * 0.24;
      const rightPriority =
        right.engine.baseScore +
        Number(right.analysis.documentContext?.isParagraphLeadCandidate) * 0.28 +
        Number(right.analysis.documentContext?.isFirstMeaningfulOccurrence) * 0.24;

      return rightPriority - leftPriority;
    })[0];

  if (priorityCandidate) {
    activateAnchorWord(priorityCandidate, sentence, profile, languageModel, selectedWords);
  }

  targetPositions.forEach((targetPosition) => {
    if (selectedWords.length >= anchorCount) {
      return;
    }

    const bestCandidate = [...candidateWords]
      .filter((word) => !word.engine.isAnchor && canSelectWord(word, selectedWords, profile))
      .sort((left, right) => {
        const leftScore =
          left.engine.baseScore - Math.abs(left.positionInSentence - targetPosition) * 0.08;
        const rightScore =
          right.engine.baseScore - Math.abs(right.positionInSentence - targetPosition) * 0.08;

        return rightScore - leftScore;
      })[0];

    if (!bestCandidate) {
      return;
    }

    activateAnchorWord(bestCandidate, sentence, profile, languageModel, selectedWords);
  });

  ensureSubstantiveAnchorCoverage(sentence, candidateWords, selectedWords, profile, languageModel);

  assignTierToSelectedWords(selectedWords, sentence, profile);

  selectedWords.forEach((word) => {
    word.engine.selectedZones =
      word.engine.renderMode === 'zones'
        ? word.engine.candidateZones.map((zone, index) => ({
            ...zone,
            tier: index === 0 ? word.engine.emphasisTier : zone.tier,
          }))
        : [];
  });

  return selectedWords;
}

function selectFrontLoadWords(sentence, frontLoadCount, profile) {
  if (!profile.frontLoad.enableFrontLoad || !frontLoadCount) {
    return [];
  }

  const candidateWords = sentence.words.filter(
    (word) =>
      (profile.frontLoad.frontLoadStrategy === 'everyWord' || !word.engine.isAnchor) &&
      word.value.length > 1 &&
      isEligibleFrontLoadWord(word, profile),
  );

  if (profile.frontLoad.frontLoadStrategy === 'everyWord') {
    return candidateWords.filter((word) => activateFrontLoadWord(word, profile));
  }

  const selectedWords = [];
  const occupiedWords = sentence.words.filter((word) => word.engine.isAnchor);
  const nthInterval = Math.max(1, Math.round(1 / Math.max(profile.frontLoad.frontLoadDensity, 0.01)));
  const filteredCandidates =
    profile.frontLoad.frontLoadStrategy === 'everyNthWord'
      ? candidateWords.filter((word) => (word.positionInSentence + 1) % nthInterval === 0)
      : candidateWords;
  const targetPositions = createTargetPositions(
    sentence.analysis.wordCount,
    frontLoadCount,
    profile.frontLoad.frontLoadSentenceBias,
  );

  targetPositions.forEach((targetPosition) => {
    const bestCandidate = [...filteredCandidates]
      .filter(
        (word) =>
          !word.engine.frontLoad.isActive &&
          canSelectWord(word, [...occupiedWords, ...selectedWords], profile, {
            additionalCooldown: profile.frontLoad.frontLoadCooldown,
            maxConsecutive: profile.frontLoad.frontLoadMaxConsecutive,
          }),
      )
      .sort((left, right) => {
        const leftScore =
          left.engine.baseScore +
          getWordDifficultyScore(left) * 0.28 -
          Math.abs(left.positionInSentence - targetPosition) * 0.06;
        const rightScore =
          right.engine.baseScore +
          getWordDifficultyScore(right) * 0.28 -
          Math.abs(right.positionInSentence - targetPosition) * 0.06;

        return rightScore - leftScore;
      })[0];

    if (!bestCandidate) {
      return;
    }

    selectedWords.push(bestCandidate);
    activateFrontLoadWord(bestCandidate, profile);
  });

  return selectedWords;
}

function getDesiredFrontLoadCount(sentence, profile) {
  if (!profile.frontLoad.enableFrontLoad) {
    return 0;
  }

  if (profile.frontLoad.frontLoadStrategy === 'everyWord') {
    return sentence.words.filter(
      (word) => word.value.length > 1 && isEligibleFrontLoadWord(word, profile),
    ).length;
  }

  if (profile.frontLoad.frontLoadDensity <= 0) {
    return 0;
  }

  return Math.round(sentence.analysis.wordCount * profile.frontLoad.frontLoadDensity * 0.35);
}

function buildSentencePlans(documentModel, profile) {
  return documentModel.paragraphs.flatMap((paragraph) =>
    paragraph.sentences.map((sentence) => ({
      paragraph,
      sentence,
      anchorCount: assignDesiredSentenceCount(sentence, profile),
      frontLoadCount: getDesiredFrontLoadCount(sentence, profile),
    })),
  );
}

export function planEmphasis(documentModel, profile, languageModel) {
  documentModel.paragraphs.forEach((paragraph) => {
    const sentencePlans = paragraph.sentences.map((sentence) => ({
      sentence,
      anchorCount: assignDesiredSentenceCount(sentence, profile),
      frontLoadCount: getDesiredFrontLoadCount(sentence, profile),
    }));

    rebalanceParagraphBudget(sentencePlans, paragraph.words.length, profile).forEach((plan) => {
      selectAnchorWords(plan.sentence, plan.anchorCount, profile, languageModel);
      selectFrontLoadWords(plan.sentence, plan.frontLoadCount, profile);
    });
  });

  documentModel.debugData = {
    anchorSelections: documentModel.words
      .filter((word) => word.engine.isAnchor)
      .map((word) => ({
        word: word.value,
        tier: word.engine.emphasisTier,
        renderMode: word.engine.renderMode,
        reasons: word.engine.selectionReasons,
        score: Number(word.engine.smoothedScore?.toFixed(3) || word.engine.baseScore?.toFixed(3) || 0),
      })),
    selectedZones: documentModel.words.flatMap((word) =>
      word.engine.selectedZones.map((zone) => ({
        word: word.value,
        language: word.language,
        zone,
      })),
    ),
    sentencePlans: buildSentencePlans(documentModel, profile).map((plan) => ({
      sentence: plan.sentence.rawText,
      anchorCount: plan.anchorCount,
      frontLoadCount: plan.frontLoadCount,
    })),
  };

  return documentModel;
}
