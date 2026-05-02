// @ts-nocheck
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePatternList(patterns = []) {
  return [...new Set(patterns.map((pattern) => pattern.toLowerCase()))].sort(
    (left, right) => right.length - left.length,
  );
}

function normalizeMatcherEntry(pattern) {
  if (typeof pattern === 'string') {
    return {
      pattern: pattern.toLowerCase(),
      position: 'any',
      reason: pattern,
      precededBy: null,
      followedBy: null,
      notPrecededBy: null,
      notFollowedBy: null,
      minWordLength: 0,
      maxWordLength: Number.POSITIVE_INFINITY,
    };
  }

  return {
    pattern: pattern.pattern.toLowerCase(),
    position: pattern.position || 'any',
    reason: pattern.reason || pattern.pattern,
    precededBy: pattern.precededBy?.toLowerCase() || null,
    followedBy: pattern.followedBy?.toLowerCase() || null,
    notPrecededBy: pattern.notPrecededBy?.toLowerCase() || null,
    notFollowedBy: pattern.notFollowedBy?.toLowerCase() || null,
    minWordLength: Number(pattern.minWordLength) || 0,
    maxWordLength: Number(pattern.maxWordLength) || Number.POSITIVE_INFINITY,
  };
}

function normalizeMatcherList(patterns = []) {
  const seen = new Set();

  return patterns
    .map(normalizeMatcherEntry)
    .filter((pattern) => pattern.pattern)
    .sort((left, right) => right.pattern.length - left.pattern.length)
    .filter((pattern) => {
      const key = JSON.stringify(pattern);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function normalizeSilentPatterns(silentPatterns = []) {
  return normalizeMatcherList(silentPatterns);
}

function normalizeLexiconEntry(entry) {
  if (typeof entry === 'string') {
    return {
      term: entry.toLowerCase(),
      familiarityScore: 0.86,
      rarityScore: 0.14,
      complexityAdjustment: -0.08,
      commonalityBand: 'common',
      role: 'content',
      technical: false,
    };
  }

  const term = (entry.term || entry.word || '').toLowerCase();

  if (!term) {
    return null;
  }

  const familiarityScore = clamp(
    Number.isFinite(Number(entry.familiarityScore)) ? Number(entry.familiarityScore) : 0.5,
    0,
    1,
  );
  const rarityScore = clamp(
    Number.isFinite(Number(entry.rarityScore)) ? Number(entry.rarityScore) : 1 - familiarityScore,
    0,
    1,
  );

  return {
    term,
    familiarityScore,
    rarityScore,
    complexityAdjustment: clamp(
      Number.isFinite(Number(entry.complexityAdjustment))
        ? Number(entry.complexityAdjustment)
        : rarityScore * 0.18 - familiarityScore * 0.12,
      -0.3,
      0.3,
    ),
    commonalityBand: entry.commonalityBand || 'general',
    role: entry.role || 'content',
    technical: Boolean(entry.technical),
  };
}

function normalizeLexiconEntries(entries = []) {
  const lexiconEntries = new Map();

  entries
    .map(normalizeLexiconEntry)
    .filter(Boolean)
    .forEach((entry) => {
      lexiconEntries.set(entry.term, entry);
    });

  return [...lexiconEntries.values()];
}

function createCharacterSet(values) {
  return new Set(values.flatMap((value) => [...value.toLowerCase()]));
}

function detectSubstringMatches(word, patterns) {
  const matches = [];

  patterns.forEach((pattern) => {
    let searchIndex = 0;

    while (searchIndex < word.length) {
      const foundIndex = word.indexOf(pattern, searchIndex);

      if (foundIndex === -1) {
        break;
      }

      matches.push({
        pattern,
        startIndex: foundIndex,
        endIndex: foundIndex + pattern.length,
      });

      searchIndex = foundIndex + Math.max(pattern.length, 1);
    }
  });

  return matches.sort((left, right) => left.startIndex - right.startIndex);
}

function detectAffixMatches(word, patterns, kind) {
  return patterns
    .filter((pattern) => (kind === 'prefix' ? word.startsWith(pattern) : word.endsWith(pattern)))
    .map((pattern) => ({
      pattern,
      startIndex: kind === 'prefix' ? 0 : word.length - pattern.length,
      endIndex: kind === 'prefix' ? pattern.length : word.length,
    }));
}

function normalizeAffixDescriptors(patternGroups = []) {
  const descriptors = new Map();

  patternGroups.forEach(({ patterns = [], category, weight }) => {
    patterns.forEach((pattern) => {
      const normalizedPattern = pattern.toLowerCase();
      const existing = descriptors.get(normalizedPattern);

      if (!existing) {
        descriptors.set(normalizedPattern, {
          pattern: normalizedPattern,
          category,
          weight,
        });
        return;
      }

      if (weight > existing.weight) {
        descriptors.set(normalizedPattern, {
          pattern: normalizedPattern,
          category,
          weight,
        });
      }
    });
  });

  return [...descriptors.values()].sort((left, right) => right.pattern.length - left.pattern.length);
}

function detectTypedAffixMatches(word, descriptors, kind) {
  const matches = descriptors
    .filter((descriptor) =>
      kind === 'prefix' ? word.startsWith(descriptor.pattern) : word.endsWith(descriptor.pattern),
    )
    .map((descriptor) => ({
      ...descriptor,
      startIndex: kind === 'prefix' ? 0 : word.length - descriptor.pattern.length,
      endIndex: kind === 'prefix' ? descriptor.pattern.length : word.length,
    }))
    .sort((left, right) => {
      if (left.startIndex === right.startIndex) {
        return right.pattern.length - left.pattern.length;
      }

      return left.startIndex - right.startIndex;
    });

  return matches.filter((match, index, list) => {
    if (index === 0) {
      return true;
    }

    const previous = list[index - 1];
    return !(match.startIndex >= previous.startIndex && match.endIndex <= previous.endIndex);
  });
}

function isMatcherAllowed(word, index, patternConfig) {
  const { pattern, position, precededBy, followedBy, notPrecededBy, notFollowedBy } = patternConfig;
  const before = word.slice(0, index);
  const after = word.slice(index + pattern.length);

  if (word.length < patternConfig.minWordLength || word.length > patternConfig.maxWordLength) {
    return false;
  }

  if (position === 'start' && index !== 0) {
    return false;
  }

  if (position === 'end' && index !== word.length - pattern.length) {
    return false;
  }

  if (precededBy && !before.endsWith(precededBy)) {
    return false;
  }

  if (followedBy && !after.startsWith(followedBy)) {
    return false;
  }

  if (notPrecededBy && before.endsWith(notPrecededBy)) {
    return false;
  }

  if (notFollowedBy && after.startsWith(notFollowedBy)) {
    return false;
  }

  return true;
}

function detectMatcherMatches(word, matcherConfigs) {
  const matches = [];

  matcherConfigs.forEach((patternConfig) => {
    const { pattern, position } = patternConfig;

    if (position === 'start') {
      if (word.startsWith(pattern) && isMatcherAllowed(word, 0, patternConfig)) {
        matches.push({
          ...patternConfig,
          startIndex: 0,
          endIndex: pattern.length,
        });
      }

      return;
    }

    if (position === 'end') {
      const index = word.endsWith(pattern) ? word.length - pattern.length : -1;

      if (index >= 0 && isMatcherAllowed(word, index, patternConfig)) {
        matches.push({
          ...patternConfig,
          startIndex: index,
          endIndex: index + pattern.length,
        });
      }

      return;
    }

    let searchIndex = 0;

    while (searchIndex < word.length) {
      const foundIndex = word.indexOf(pattern, searchIndex);

      if (foundIndex === -1) {
        break;
      }

      if (isMatcherAllowed(word, foundIndex, patternConfig)) {
        matches.push({
          ...patternConfig,
          startIndex: foundIndex,
          endIndex: foundIndex + pattern.length,
        });
      }

      searchIndex = foundIndex + Math.max(pattern.length, 1);
    }
  });

  return matches.sort((left, right) => {
    if (left.startIndex === right.startIndex) {
      return right.pattern.length - left.pattern.length;
    }

    return left.startIndex - right.startIndex;
  });
}

function detectSilentMatches(word, silentPatterns) {
  return detectMatcherMatches(word, silentPatterns);
}

function splitIntoChunksFactory(model) {
  const vowelSet = createCharacterSet([
    model.orthography.vowels,
    model.orthography.accentedCharacters,
  ].flat());

  return function splitIntoChunks(word) {
    const loweredWord = word.toLowerCase();
    const chunks = [];
    let currentChunk = '';

    [...loweredWord].forEach((character, index) => {
      const isVowel = vowelSet.has(character);
      const previousCharacter = loweredWord[index - 1];
      const previousWasVowel = previousCharacter ? vowelSet.has(previousCharacter) : null;

      if (
        currentChunk &&
        previousWasVowel !== null &&
        isVowel !== previousWasVowel &&
        currentChunk.length >= 2
      ) {
        chunks.push(currentChunk);
        currentChunk = character;
        return;
      }

      currentChunk += character;
    });

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.length > 1 ? chunks : [loweredWord];
  };
}

function detectCompoundsFactory(model) {
  const indicators = normalizePatternList(model.morphology.compoundIndicators || []);

  return function detectCompounds(word) {
    const loweredWord = word.toLowerCase();

    if (loweredWord.includes('-')) {
      let cursor = 0;
      return loweredWord.split('-').map((part) => {
        const output = {
          text: part,
          startIndex: cursor,
          endIndex: cursor + part.length,
        };
        cursor += part.length + 1;
        return output;
      });
    }

    if (loweredWord.length < model.weights.veryLongWordThreshold) {
      return [];
    }

    for (const indicator of indicators) {
      const boundaryIndex = loweredWord.indexOf(indicator, 3);

      if (boundaryIndex > 0 && boundaryIndex < loweredWord.length - 3) {
        return [
          {
            text: loweredWord.slice(0, boundaryIndex),
            startIndex: 0,
            endIndex: boundaryIndex,
          },
          {
            text: indicator,
            startIndex: boundaryIndex,
            endIndex: boundaryIndex + indicator.length,
          },
          {
            text: loweredWord.slice(boundaryIndex + indicator.length),
            startIndex: boundaryIndex + indicator.length,
            endIndex: loweredWord.length,
          },
        ];
      }
    }

    return [];
  };
}

function detectStressFeaturesFactory(model) {
  const accentRegex = model.orthography.accentedCharacters.length
    ? new RegExp(`[${model.orthography.accentedCharacters.map(escapeRegExp).join('')}]`, 'gu')
    : null;

  return function detectStressFeatures(word) {
    const matches = [];

    if (accentRegex) {
      for (const match of word.matchAll(accentRegex)) {
        matches.push({
          pattern: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          reason: 'accented-character',
        });
      }
    }

    model.orthography.stressMarkers.forEach((marker) => {
      let searchIndex = 0;

      while (searchIndex < word.length) {
        const foundIndex = word.indexOf(marker, searchIndex);

        if (foundIndex === -1) {
          break;
        }

        matches.push({
          pattern: marker,
          startIndex: foundIndex,
          endIndex: foundIndex + marker.length,
          reason: 'language-stress-marker',
        });
        searchIndex = foundIndex + Math.max(marker.length, 1);
      }
    });

    return matches.sort((left, right) => left.startIndex - right.startIndex);
  };
}

function resolveCommonalityBand(analysis, familiarityScore, rarityScore, technical) {
  if (analysis.isFunctionWord) {
    return 'function';
  }

  if (analysis.isHighFrequencyWord || familiarityScore >= 0.88) {
    return 'highFrequency';
  }

  if (technical || analysis.wordRole === 'technical' || rarityScore >= 0.74) {
    return 'specialized';
  }

  if (rarityScore >= 0.48) {
    return 'uncommon';
  }

  return 'general';
}

function classifyWordRoleFactory(model) {
  const functionWordSet = new Set(model.functionWords.map((word) => word.toLowerCase()));
  const highFrequencySet = new Set(model.highFrequencyWords.map((word) => word.toLowerCase()));

  return function classifyWordRole(word) {
    const loweredWord = word.toLowerCase();
    const hasTechnicalCapitalPattern = /[a-z][A-Z]/.test(word) || /[A-Z]{2,}/.test(word);
    const lexiconEntry = model._compiled.lexicon.get(loweredWord);

    if (lexiconEntry?.role) {
      return lexiconEntry.role;
    }

    if (functionWordSet.has(loweredWord)) {
      return 'function';
    }

    if (highFrequencySet.has(loweredWord)) {
      return 'highFrequency';
    }

    if (
      loweredWord.length >= model.weights.veryLongWordThreshold ||
      hasTechnicalCapitalPattern ||
      lexiconEntry?.technical ||
      model.morphology.derivationalSuffixes.some((suffix) => loweredWord.endsWith(suffix))
    ) {
      return 'technical';
    }

    return 'content';
  };
}

function analyzeLexicalFamiliarityFactory(model) {
  const difficultClusterSet = new Set(
    model.orthography.difficultClusters.map((pattern) =>
      typeof pattern === 'string' ? pattern : pattern.pattern,
    ),
  );
  const rareClusterSet = new Set(model.orthography.rareClusters);
  const longDerivationalSuffixes = model.morphology.derivationalSuffixes.filter((suffix) => suffix.length >= 4);

  return function analyzeLexicalFamiliarity(analysis) {
    const loweredWord = analysis.normalized;
    const lexiconEntry = model._compiled.lexicon.get(loweredWord);

    if (lexiconEntry) {
      const commonalityBand = resolveCommonalityBand(
        analysis,
        lexiconEntry.familiarityScore,
        lexiconEntry.rarityScore,
        lexiconEntry.technical,
      );

      return {
        familiarityScore: lexiconEntry.familiarityScore,
        rarityScore: lexiconEntry.rarityScore,
        complexityAdjustment: lexiconEntry.complexityAdjustment,
        commonalityBand,
        source: 'lexicon',
      };
    }

    let familiarityScore = 0.48;

    if (analysis.isFunctionWord) {
      familiarityScore = 0.99;
    } else if (analysis.isHighFrequencyWord) {
      familiarityScore = 0.9;
    } else {
      familiarityScore += Number(analysis.length <= 4) * 0.22;
      familiarityScore += Number(analysis.length <= 6) * 0.08;
      familiarityScore += Number(analysis.detectedClusters.length === 0) * 0.08;
      familiarityScore += Number(analysis.detectedVowelGroups.length <= 1) * 0.05;
      familiarityScore += Number((analysis.significantSilentPatterns || analysis.detectedSilentPatterns).length === 0) * 0.04;
      familiarityScore += Number(analysis.detectedSuffixes.length === 0) * 0.04;
      familiarityScore -= Number(analysis.isLongWord) * 0.14;
      familiarityScore -= Number(analysis.isVeryLongWord) * 0.12;
      familiarityScore -= Number(analysis.possibleCompoundParts.length > 1) * 0.14;
      familiarityScore -= Number(analysis.significantSuffixes.length > 0) * 0.12;
      familiarityScore -= Number(analysis.wordRole === 'technical') * 0.16;
      familiarityScore -= analysis.detectedClusters.reduce((sum, cluster) => {
        if (rareClusterSet.has(cluster.pattern)) {
          return sum + 0.08;
        }

        if (difficultClusterSet.has(cluster.pattern)) {
          return sum + 0.04;
        }

        return sum + 0.015;
      }, 0);
      familiarityScore -= detectSubstringMatches(loweredWord, model.orthography.rareClusters).length * 0.08;
      familiarityScore -= analysis.detectedVowelGroups.reduce(
        (sum, vowelGroup) => sum + Number(vowelGroup.pattern.length >= 3) * 0.04,
        0,
      );
      familiarityScore -=
        longDerivationalSuffixes.filter((suffix) => loweredWord.endsWith(suffix)).length * 0.06;
    }

    familiarityScore = clamp(familiarityScore, 0.02, 0.99);

    let rarityScore = clamp(
      1 - familiarityScore +
        Number(analysis.wordRole === 'technical') * 0.12 +
        Number(analysis.possibleCompoundParts.length > 1) * 0.06 +
        Number(analysis.isVeryLongWord) * 0.08,
      0.01,
      0.99,
    );

    if (analysis.isFunctionWord) {
      rarityScore = Math.min(rarityScore, 0.03);
    } else if (analysis.isHighFrequencyWord) {
      rarityScore = Math.min(rarityScore, 0.12);
    }

    return {
      familiarityScore,
      rarityScore,
      complexityAdjustment: clamp(
        rarityScore * 0.18 -
          familiarityScore * 0.1 +
          Number(analysis.wordRole === 'technical') * 0.06 +
          Number(analysis.isVeryLongWord) * 0.04 -
          Number(analysis.isFunctionWord) * 0.08 -
          Number(analysis.isHighFrequencyWord) * 0.04,
        -0.14,
        0.2,
      ),
      commonalityBand: resolveCommonalityBand(
        analysis,
        familiarityScore,
        rarityScore,
        analysis.wordRole === 'technical',
      ),
      source: 'heuristic',
    };
  };
}

function calculateWordComplexityFactory(model) {
  const difficultClusterSet = new Set(
    model.orthography.difficultClusters.map((pattern) =>
      typeof pattern === 'string' ? pattern : pattern.pattern,
    ),
  );
  const rareClusterSet = new Set(model.orthography.rareClusters);

  return function calculateWordComplexity(analysis, profile) {
    const weightConfig = profile?.wordComplexity || {
      wordLengthWeight: 0.34,
      uncommonPatternWeight: 0.26,
      suffixWeight: 0.18,
      vowelClusterWeight: 0.22,
    };
    const totalWeight =
      weightConfig.wordLengthWeight +
      weightConfig.uncommonPatternWeight +
      weightConfig.suffixWeight +
      weightConfig.vowelClusterWeight;
    const lengthScore = clamp(
      (analysis.length - model.weights.longWordThreshold) /
        Math.max(model.weights.veryLongWordThreshold - model.weights.longWordThreshold, 1),
      0,
      1,
    );
    const difficultClusterScore = analysis.detectedClusters.reduce((sum, cluster) => {
      if (rareClusterSet.has(cluster.pattern)) {
        return sum + 0.32;
      }

      if (difficultClusterSet.has(cluster.pattern)) {
        return sum + 0.22;
      }

      return sum + 0.08;
    }, 0);
    const uncommonPatternScore = clamp(
      difficultClusterScore +
        (analysis.significantSilentPatterns || analysis.detectedSilentPatterns).length * 0.24 +
        Number(analysis.possibleCompoundParts.length > 1) * 0.34 +
        detectSubstringMatches(analysis.normalized, model.orthography.rareClusters).length * 0.28,
      0,
      1,
    );
    const suffixScore = clamp(
      analysis.detectedSuffixes.reduce((sum, suffixMatch) => {
        let suffixWeight = suffixMatch.weight || 0.2;

        if (
          (suffixMatch.category === 'inflectional' ||
            suffixMatch.category === 'plural' ||
            suffixMatch.category === 'verb') &&
          analysis.length < 7
        ) {
          suffixWeight *= 0.35;
        } else if (
          suffixMatch.category === 'inflectional' ||
          suffixMatch.category === 'plural' ||
          suffixMatch.category === 'verb'
        ) {
          suffixWeight *= 0.7;
        }

        if ((analysis.isFunctionWord || analysis.isHighFrequencyWord) && suffixWeight < 0.7) {
          return sum;
        }

        if (analysis.length <= 4 && suffixWeight < 0.7) {
          suffixWeight *= 0.3;
        }

        return sum + suffixWeight;
      }, 0) * 0.42,
      0,
      1,
    );
    const vowelClusterScore = clamp(
      analysis.detectedVowelGroups.reduce(
        (sum, vowelGroup) => sum + (vowelGroup.pattern.length >= 3 ? 0.24 : 0.12),
        0,
      ) + Number(analysis.detectedVowelGroups.length > 1) * 0.1,
      0,
      1,
    );

    const weightedScore =
      lengthScore * weightConfig.wordLengthWeight +
      uncommonPatternScore * weightConfig.uncommonPatternWeight +
      suffixScore * weightConfig.suffixWeight +
      vowelClusterScore * weightConfig.vowelClusterWeight;

    const lexicalAdjustment = clamp(
      (analysis.lexicalComplexityAdjustment || 0) +
        (analysis.lexicalRarityScore || 0) * 0.08 -
        (analysis.lexicalFamiliarityScore || 0) * 0.04,
      -0.12,
      0.16,
    );

    return clamp(weightedScore / Math.max(totalWeight, 0.01) + lexicalAdjustment, 0, 1);
  };
}

function detectEmphasisZonesFactory(model) {
  return function detectEmphasisZones(analysis, profile) {
    const zones = [];
    const languageAwareEnabled =
      profile.languageAware.enabled && profile.languageAware.enableLanguageAwareParsing;

    if (languageAwareEnabled && profile.languageAware.enablePrefixHighlighting) {
      analysis.detectedPrefixes.slice(0, 1).forEach((prefixMatch) => {
        zones.push({
          startIndex: prefixMatch.startIndex,
          endIndex: prefixMatch.endIndex,
          zoneType: 'prefix',
          tier: 'secondary',
          reason: `prefix:${prefixMatch.pattern}`,
          confidence: 0.66,
        });
      });
    }

    if (languageAwareEnabled && profile.languageAware.enableSuffixHighlighting) {
      (analysis.significantSuffixes || analysis.detectedSuffixes).slice(0, 1).forEach((suffixMatch) => {
        zones.push({
          startIndex: suffixMatch.startIndex,
          endIndex: suffixMatch.endIndex,
          zoneType: 'suffix',
          tier: 'secondary',
          reason: `suffix:${suffixMatch.pattern}`,
          confidence: 0.72,
        });
      });
    }

    if (languageAwareEnabled && profile.languageAware.enableClusterHighlighting) {
      analysis.detectedClusters.slice(0, 2).forEach((clusterMatch) => {
        zones.push({
          startIndex: clusterMatch.startIndex,
          endIndex: clusterMatch.endIndex,
          zoneType: 'cluster',
          tier: 'secondary',
          reason: `cluster:${clusterMatch.pattern}`,
          confidence: 0.74,
        });
      });
    }

    if (languageAwareEnabled && profile.languageAware.enableClusterHighlighting) {
      analysis.detectedVowelGroups.slice(0, 1).forEach((vowelGroupMatch) => {
        zones.push({
          startIndex: vowelGroupMatch.startIndex,
          endIndex: vowelGroupMatch.endIndex,
          zoneType: 'vowelGroup',
          tier: 'tertiary',
          reason: `vowel-group:${vowelGroupMatch.pattern}`,
          confidence: 0.59,
        });
      });
    }

    if (languageAwareEnabled && profile.languageAware.enableStressHighlighting) {
      analysis.detectedStressMarkers.slice(0, 1).forEach((stressMatch) => {
        zones.push({
          startIndex: stressMatch.startIndex,
          endIndex: stressMatch.endIndex,
          zoneType: 'stressMarker',
          tier: 'tertiary',
          reason: stressMatch.reason,
          confidence: 0.64,
        });
      });
    }

    if (languageAwareEnabled && profile.languageAware.enableSilentPatternMarking) {
      (analysis.significantSilentPatterns || analysis.detectedSilentPatterns)
        .slice(0, 1)
        .forEach((silentMatch) => {
        zones.push({
          startIndex: silentMatch.startIndex,
          endIndex: silentMatch.endIndex,
          zoneType: silentMatch.endIndex === analysis.length ? 'silentEnding' : 'silentPattern',
          tier: 'tertiary',
          reason: silentMatch.reason,
          confidence: 0.62,
        });
        });
    }

    if (languageAwareEnabled && profile.languageAware.enableSyllableChunking && analysis.possibleChunks.length > 1) {
      let cursor = 0;

      analysis.possibleChunks.slice(0, 2).forEach((chunk) => {
        zones.push({
          startIndex: cursor,
          endIndex: cursor + chunk.length,
          zoneType: 'syllableChunk',
          tier: 'tertiary',
          reason: `chunk:${chunk}`,
          confidence: 0.58,
        });
        cursor += chunk.length;
      });
    }

    if (languageAwareEnabled && profile.languageAware.enableCompoundSplitting && analysis.possibleCompoundParts.length > 1) {
      analysis.possibleCompoundParts.slice(1, -1).forEach((compoundPart) => {
        zones.push({
          startIndex: compoundPart.startIndex,
          endIndex: compoundPart.endIndex,
          zoneType: 'compoundBoundary',
          tier: 'secondary',
          reason: `compound:${compoundPart.text}`,
          confidence: 0.7,
        });
      });
    }

    if (languageAwareEnabled) {
      const prefixEnd = analysis.detectedPrefixes[0]?.endIndex ?? 0;
      const suffixStart =
        (analysis.significantSuffixes || analysis.detectedSuffixes)[0]?.startIndex ?? analysis.length;

      if (suffixStart - prefixEnd >= 3 && analysis.length >= model.weights.longWordThreshold) {
        zones.push({
          startIndex: prefixEnd,
          endIndex: suffixStart,
          zoneType: 'root',
          tier: 'tertiary',
          reason: 'root-window',
          confidence: 0.52,
        });
      }
    }

    if (analysis.isLongWord) {
      zones.push({
        startIndex: 0,
        endIndex: Math.min(analysis.length, Math.max(3, Math.ceil(analysis.length * 0.35))),
        zoneType: 'longWord',
        tier: 'secondary',
        reason: 'long-word-support',
        confidence: 0.55,
      });
    }

    if (analysis.complexityScore >= 0.72) {
      zones.push({
        startIndex: 0,
        endIndex: Math.min(analysis.length, Math.max(2, Math.ceil(analysis.length * 0.28))),
        zoneType: 'rarePattern',
        tier: 'primary',
        reason: 'high-complexity-word',
        confidence: 0.78,
      });
    }

    return zones;
  };
}

export function createLanguageModel(config) {
  const model = {
    ...config,
    orthography: {
      ...config.orthography,
      digraphs: normalizeMatcherList(config.orthography.digraphs),
      trigraphs: normalizeMatcherList(config.orthography.trigraphs),
      commonClusters: normalizeMatcherList(config.orthography.commonClusters),
      difficultClusters: normalizeMatcherList(config.orthography.difficultClusters),
      rareClusters: normalizePatternList(config.orthography.rareClusters),
      vowelGroups: normalizePatternList(config.orthography.vowelGroups),
      consonantGroups: normalizePatternList(config.orthography.consonantGroups),
      silentPatterns: normalizeSilentPatterns(config.orthography.silentPatterns),
      stressMarkers: normalizePatternList(config.orthography.stressMarkers),
    },
    morphology: {
      ...config.morphology,
      commonPrefixes: normalizePatternList(config.morphology.commonPrefixes),
      commonSuffixes: normalizePatternList(config.morphology.commonSuffixes),
      inflectionalSuffixes: normalizePatternList(config.morphology.inflectionalSuffixes),
      derivationalSuffixes: normalizePatternList(config.morphology.derivationalSuffixes),
      compoundIndicators: normalizePatternList(config.morphology.compoundIndicators),
      diminutives: normalizePatternList(config.morphology.diminutives),
      genderMarkers: normalizePatternList(config.morphology.genderMarkers),
      pluralMarkers: normalizePatternList(config.morphology.pluralMarkers),
      verbEndings: normalizePatternList(config.morphology.verbEndings),
      nounEndings: normalizePatternList(config.morphology.nounEndings),
      adjectiveEndings: normalizePatternList(config.morphology.adjectiveEndings),
      adverbEndings: normalizePatternList(config.morphology.adverbEndings),
    },
    functionWords: normalizePatternList(config.functionWords || []),
    highFrequencyWords: normalizePatternList(config.highFrequencyWords || []),
    lexicon: normalizeLexiconEntries(config.lexicon || []),
  };

  const combinedSuffixes = normalizeAffixDescriptors([
    { patterns: model.morphology.derivationalSuffixes, category: 'derivational', weight: 1 },
    { patterns: model.morphology.nounEndings, category: 'noun', weight: 0.92 },
    { patterns: model.morphology.adjectiveEndings, category: 'adjective', weight: 0.82 },
    { patterns: model.morphology.adverbEndings, category: 'adverb', weight: 0.74 },
    { patterns: model.morphology.commonSuffixes, category: 'common', weight: 0.68 },
    { patterns: model.morphology.verbEndings, category: 'verb', weight: 0.46 },
    { patterns: model.morphology.inflectionalSuffixes, category: 'inflectional', weight: 0.24 },
    { patterns: model.morphology.pluralMarkers, category: 'plural', weight: 0.18 },
    { patterns: model.morphology.diminutives, category: 'diminutive', weight: 0.52 },
    { patterns: model.morphology.genderMarkers, category: 'gender', weight: 0.4 },
  ]);
  const combinedPrefixes = normalizePatternList(model.morphology.commonPrefixes);
  const combinedClusters = normalizePatternList([
    ...model.orthography.digraphs,
    ...model.orthography.trigraphs,
    ...model.orthography.commonClusters,
    ...model.orthography.difficultClusters,
  ].map((pattern) => (typeof pattern === 'string' ? pattern : pattern.pattern)));
  const combinedClusterMatchers = normalizeMatcherList([
    ...model.orthography.digraphs,
    ...model.orthography.trigraphs,
    ...model.orthography.commonClusters,
    ...model.orthography.difficultClusters,
  ]);

  model._compiled = {
    suffixes: combinedSuffixes,
    prefixes: combinedPrefixes,
    clusters: combinedClusterMatchers,
    clusterPatterns: combinedClusters,
    vowelGroups: model.orthography.vowelGroups,
    silentPatterns: model.orthography.silentPatterns,
    lexicon: new Map(model.lexicon.map((entry) => [entry.term, entry])),
  };

  model.methods = {
    analyzeLexicalFamiliarity: analyzeLexicalFamiliarityFactory(model),
    calculateWordComplexity: calculateWordComplexityFactory(model),
    detectEmphasisZones: detectEmphasisZonesFactory(model),
    splitIntoChunks: splitIntoChunksFactory(model),
    detectCompounds: detectCompoundsFactory(model),
    detectStressFeatures: detectStressFeaturesFactory(model),
    detectSilentFeatures: (word) => detectSilentMatches(word.toLowerCase(), model._compiled.silentPatterns),
    classifyWordRole: classifyWordRoleFactory(model),
    detectPrefixes: (word) => detectAffixMatches(word.toLowerCase(), model._compiled.prefixes, 'prefix'),
    detectSuffixes: (word) => detectTypedAffixMatches(word.toLowerCase(), model._compiled.suffixes, 'suffix'),
    detectClusters: (word) => detectMatcherMatches(word.toLowerCase(), model._compiled.clusters),
    detectVowelGroups: (word) => detectSubstringMatches(word.toLowerCase(), model._compiled.vowelGroups),
  };

  return model;
}
