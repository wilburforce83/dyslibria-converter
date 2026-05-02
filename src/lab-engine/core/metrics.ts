// @ts-nocheck
function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toPercent(value) {
  return Number((value * 100).toFixed(1));
}

function calculateClusteringScore(distances) {
  if (!distances.length) {
    return 0;
  }

  const closePairs = distances.filter((distance) => distance <= 2).length;
  const pressure = average(distances.map((distance) => 1 / Math.max(distance, 1)));

  return Number(clamp(closePairs / distances.length * 55 + pressure * 45, 0, 100).toFixed(1));
}

function calculateCognitiveLoadScore(model, emphasisDensity) {
  const averageSentenceLength = model.analysis.totalSentences
    ? model.analysis.totalWords / model.analysis.totalSentences
    : 0;
  const sentenceLengthPressure = clamp(averageSentenceLength / 24, 0, 1);
  const complexityPressure = clamp(
    Math.max(model.analysis.averageComplexityScore, model.analysis.averageReadingPressureScore || 0),
    0,
    1,
  );
  const paragraphPressure = clamp(
    average(
      model.paragraphs.map((paragraph) =>
        Math.max(paragraph.analysis.averageComplexity || 0, paragraph.analysis.densityScore || 0),
      ),
    ),
    0,
    1,
  );

  return Number(
    clamp(
      complexityPressure * 45 + sentenceLengthPressure * 25 + emphasisDensity * 20 + paragraphPressure * 10,
      0,
      100,
    ).toFixed(1),
  );
}

export function calculateMetrics(model, renderOutput) {
  const emphasisedWords = model.words.filter((word) => word.engine.isAnchor);
  const wholeWordAnchorCount = emphasisedWords.filter((word) => word.engine.renderMode === 'wholeWord').length;
  const zoneAnchorCount = emphasisedWords.filter((word) => word.engine.renderMode === 'zones').length;
  const frontLoadAnchorCount = emphasisedWords.filter(
    (word) => word.engine.renderMode === 'frontLoad' || word.engine.frontLoad?.isActive,
  ).length;
  const firstMentionAnchorCount = emphasisedWords.filter(
    (word) => word.analysis.documentContext?.isFirstMeaningfulOccurrence,
  ).length;
  const paragraphLeadAnchorCount = emphasisedWords.filter(
    (word) => word.analysis.documentContext?.isParagraphLeadCandidate,
  ).length;
  const anchorIndices = emphasisedWords.map((word) => word.globalWordIndex);
  const distances = anchorIndices.slice(1).map((value, index) => value - anchorIndices[index]);
  const totalWords = model.analysis.totalWords;
  const emphasisDensity = totalWords ? emphasisedWords.length / totalWords : 0;
  const averageComplexityScore = average(model.words.map((word) => word.analysis.complexityScore));
  const averageAnchorsPerSentence = model.analysis.totalSentences
    ? emphasisedWords.length / model.analysis.totalSentences
    : 0;
  const clusteringScore = calculateClusteringScore(distances);
  const estimatedCognitiveLoadScore = calculateCognitiveLoadScore(model, emphasisDensity);
  const compatibilityPenalty =
    model.profile.outputCompatibilityMode === 'experimental'
      ? 18
      : model.profile.outputCompatibilityMode === 'enhancedEpub'
        ? 11
        : model.profile.outputCompatibilityMode === 'standardEpub'
          ? 6
          : 2;
  const epubComplexityScore = clamp(
    emphasisDensity * 65 + renderOutput.spanCount * 0.36 + renderOutput.nestedSpanCount * 1.7 + compatibilityPenalty,
    0,
    100,
  );

  const metrics = {
    totalWords,
    sentenceCount: model.analysis.totalSentences,
    languageSelected: model.languageModel.code,
    averageComplexityScore: Number(averageComplexityScore.toFixed(3)),
    emphasisDensity: toPercent(emphasisDensity),
    anchorsPerSentence: Number(averageAnchorsPerSentence.toFixed(2)),
    anchorCount: emphasisedWords.length,
    averageDistanceBetweenAnchors: Number(average(distances).toFixed(2)) || 0,
    clusteringScore,
    estimatedCognitiveLoadScore,
    spanCount: renderOutput.spanCount,
    nestedSpanCount: renderOutput.nestedSpanCount,
    epubComplexityScore: Number(epubComplexityScore.toFixed(1)),
    textTreatmentBreakdown: `${wholeWordAnchorCount} whole-word / ${zoneAnchorCount} cue / ${frontLoadAnchorCount} front-load`,
    leadCueCount: firstMentionAnchorCount + paragraphLeadAnchorCount,
    performanceTiming: model.performance.timings,
    cacheHitRate: model.performance.cacheHitRate,
    compatibilityMode: renderOutput.compatibilityMode,
  };

  return {
    metrics,
    warnings: renderOutput.warnings,
  };
}
