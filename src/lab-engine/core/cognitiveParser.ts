// @ts-nocheck
import { detectLanguage, getLanguageModel } from '../language/languageRegistry.js';
import { summarizePerformance, timeOperation, withCachedResult } from './performance.js';
import { parseSentences } from './sentenceParser.js';
import { tokenizeText } from './tokenizer.js';
import { analyzeWords } from './wordAnalyzer.js';

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function averageTop(values, count) {
  return average([...values].sort((left, right) => right - left).slice(0, count));
}

function getWordChallengeScore(word) {
  return clamp(
    word.analysis.readingPressureScore * 0.74 +
      word.analysis.complexityScore * 0.16 +
      Number(word.analysis.wordRole === 'technical') * 0.08 +
      Number(word.analysis.possibleCompoundParts.length > 1) * 0.05 -
      Number(word.analysis.isFunctionWord) * 0.18 -
      Number(word.analysis.isHighFrequencyWord) * 0.08,
    0,
    1,
  );
}

function annotateLocalReadingPressure(documentModel) {
  documentModel.paragraphs.forEach((paragraph) => {
    paragraph.sentences.forEach((sentence) => {
      sentence.words.forEach((word, index) => {
        const neighbors = sentence.words.slice(Math.max(0, index - 2), Math.min(sentence.words.length, index + 3));
        const nearbyChallengingWords = neighbors.filter(
          (candidate) => candidate !== word && candidate.analysis.isChallengingWord,
        ).length;

        word.analysis.localReadingPressure = clamp(
          average(neighbors.map(getWordChallengeScore)) + nearbyChallengingWords * 0.06,
          0,
          1,
        );
      });
    });
  });

  return documentModel;
}

function resolveLanguageModel(text, profile, performanceContext) {
  if (profile.sourceLanguage && profile.sourceLanguage !== 'auto') {
    return getLanguageModel(profile.sourceLanguage);
  }

  return withCachedResult(
    performanceContext,
    'languageSelection',
    text.toLowerCase(),
    () => detectLanguage(text),
  );
}

function analyzeSentences(documentModel, profile) {
  documentModel.paragraphs.forEach((paragraph) => {
    paragraph.sentences.forEach((sentence) => {
      const complexityValues = sentence.words.map((word) => word.analysis.complexityScore);
      const averageComplexity = average(complexityValues);
      const averageWordLength = average(sentence.words.map((word) => word.analysis.length));
      const clauseBoundaryCount = sentence.words.filter((word) => word.afterClauseBoundary).length;
      const challengeValues = sentence.words.map(getWordChallengeScore);
      const contentWords = sentence.words.filter(
        (word) => !word.analysis.isFunctionWord && !word.analysis.isHighFrequencyWord,
      );
      const challengingWordRatio = sentence.words.length
        ? sentence.words.filter((word) => word.analysis.isChallengingWord).length / sentence.words.length
        : 0;
      const averageReadingPressure = average(challengeValues);
      const peakReadingPressure = averageTop(challengeValues, Math.min(3, challengeValues.length));
      const contentReadingPressure = average(contentWords.map(getWordChallengeScore));
      const lengthPressure = clamp(
        (sentence.words.length - Math.max(profile.cognitiveLoad.longSentenceThreshold - 2, 6)) / 10,
        0,
        1,
      );
      const clausePressure = clamp(
        clauseBoundaryCount / Math.max(Math.ceil(sentence.words.length / 6), 1),
        0,
        1,
      );
      const familiarityRelief = average(
        sentence.words.map((word) => word.analysis.lexicalFamiliarityScore || 0),
      ) * 0.18;
      const densityScore = clamp(
        lengthPressure * 0.24 +
          clausePressure * 0.16 +
          averageComplexity * 0.12 +
          contentReadingPressure * 0.22 +
          peakReadingPressure * 0.18 +
          challengingWordRatio * 0.18 -
          familiarityRelief,
        0,
        1,
      );
      const isLong = sentence.words.length >= profile.cognitiveLoad.longSentenceThreshold;
      const isDense = densityScore >= 0.44 || (isLong && contentReadingPressure >= 0.32);

      sentence.analysis = {
        wordCount: sentence.words.length,
        averageComplexity,
        averageReadingPressure,
        averageWordLength,
        clauseBoundaryCount,
        challengingWordRatio,
        densityScore,
        peakReadingPressure,
        contentReadingPressure,
        isLong,
        isDense,
        isVeryDense: densityScore >= 0.68,
        isSimple: sentence.words.length <= 8 && averageComplexity < 0.28 && densityScore < 0.24,
        isDialogue: paragraph.isDialogue,
      };
    });

    const sentenceDensityValues = paragraph.sentences.map((sentence) => sentence.analysis.densityScore);
    const paragraphReadingPressure = average(paragraph.words.map(getWordChallengeScore));
    const longSentenceRatio = paragraph.sentences.length
      ? paragraph.sentences.filter((sentence) => sentence.analysis.isLong).length / paragraph.sentences.length
      : 0;
    const densityScore = clamp(
      average(sentenceDensityValues) * 0.52 +
        paragraphReadingPressure * 0.22 +
        average(paragraph.words.map((word) => word.analysis.complexityScore)) * 0.16 +
        longSentenceRatio * 0.1,
      0,
      1,
    );

    paragraph.analysis = {
      wordCount: paragraph.words.length,
      sentenceCount: paragraph.sentences.length,
      averageComplexity: average(paragraph.words.map((word) => word.analysis.complexityScore)),
      averageReadingPressure: paragraphReadingPressure,
      densityScore,
      isDense: densityScore >= 0.42,
    };
  });

  annotateLocalReadingPressure(documentModel);

  documentModel.analysis = {
    totalWords: documentModel.words.length,
    totalSentences: documentModel.sentences.length,
    totalParagraphs: documentModel.paragraphs.length,
    averageComplexityScore: average(documentModel.words.map((word) => word.analysis.complexityScore)),
    averageReadingPressureScore: average(documentModel.words.map(getWordChallengeScore)),
    densityScore: average(documentModel.paragraphs.map((paragraph) => paragraph.analysis.densityScore || 0)),
  };

  return documentModel;
}

function annotateDocumentContext(documentModel) {
  const totalOccurrencesByWord = new Map();
  const paragraphOccurrencesByWord = new Map();
  const seenOccurrencesByWord = new Map();

  documentModel.words.forEach((word) => {
    const key = word.normalized;

    if (!key) {
      return;
    }

    totalOccurrencesByWord.set(key, (totalOccurrencesByWord.get(key) || 0) + 1);

    if (!paragraphOccurrencesByWord.has(key)) {
      paragraphOccurrencesByWord.set(key, new Map());
    }

    const paragraphCounts = paragraphOccurrencesByWord.get(key);
    paragraphCounts.set(word.paragraphIndex, (paragraphCounts.get(word.paragraphIndex) || 0) + 1);
  });

  documentModel.paragraphs.forEach((paragraph) => {
    const scoreLeadCandidate = (word) =>
      word.analysis.readingPressureScore * 0.68 +
      word.analysis.lexicalRarityScore * 0.18 +
      Number(word.analysis.significantSuffixes.length > 0) * 0.22 +
      Number(word.analysis.significantSilentPatterns.length > 0) * 0.2 +
      Number(word.analysis.possibleCompoundParts.length > 1) * 0.3 +
      Number(word.analysis.isLongWord) * 0.18 +
      Number(word.analysis.wordRole === 'technical') * 0.22 -
      word.positionInParagraph * 0.03;
    const leadCandidates = paragraph.words.slice(0, 8).filter((word) => {
      if (word.analysis.isFunctionWord || word.analysis.isHighFrequencyWord) {
        return false;
      }

      if (word.analysis.wordRole === 'technical') {
        return true;
      }

      if (
        word.analysis.length <= 3 &&
        word.analysis.readingPressureScore < 0.24 &&
        word.analysis.significantSuffixes.length === 0 &&
        word.analysis.significantSilentPatterns.length === 0
      ) {
        return false;
      }

      return (
        word.analysis.isLongWord ||
        word.analysis.significantSuffixes.length > 0 ||
        word.analysis.significantSilentPatterns.length > 0 ||
        word.analysis.possibleCompoundParts.length > 1 ||
        word.analysis.readingPressureScore >= 0.3 ||
        word.analysis.lexicalRarityScore >= 0.46 ||
        word.analysis.length >= 5
      );
    });
    const leadCandidate =
      leadCandidates.sort((left, right) => scoreLeadCandidate(right) - scoreLeadCandidate(left))[0] ||
      paragraph.words
        .slice(0, 8)
        .filter((word) => !word.analysis.isFunctionWord && !word.analysis.isHighFrequencyWord)
        .sort((left, right) => scoreLeadCandidate(right) - scoreLeadCandidate(left))[0];

    if (leadCandidate) {
      leadCandidate.analysis.isParagraphLeadCandidate = true;
    }
  });

  documentModel.words.forEach((word) => {
    const key = word.normalized;

    if (!key) {
      word.analysis.documentContext = {
        totalOccurrences: 1,
        occurrenceIndex: 1,
        paragraphOccurrences: 1,
        isFirstOccurrence: true,
        isFirstMeaningfulOccurrence: false,
        isRepeatedEasyWord: false,
        isTerminologyCandidate: false,
        isParagraphLeadCandidate: Boolean(word.analysis.isParagraphLeadCandidate),
      };
      return;
    }

    const occurrenceIndex = (seenOccurrencesByWord.get(key) || 0) + 1;
    const totalOccurrences = totalOccurrencesByWord.get(key) || 1;
    const paragraphOccurrences =
      paragraphOccurrencesByWord.get(key)?.get(word.paragraphIndex) || 1;
    const isTerminologyCandidate =
      word.analysis.wordRole === 'technical' ||
      (!word.analysis.isFunctionWord &&
        word.analysis.length >= 7 &&
        (word.analysis.readingPressureScore >= 0.56 || word.analysis.lexicalRarityScore >= 0.68));
    const isFirstMeaningfulOccurrence =
      occurrenceIndex === 1 &&
      (isTerminologyCandidate ||
        word.analysis.isLongWord ||
        word.analysis.significantSuffixes.length > 0 ||
        word.analysis.possibleCompoundParts.length > 1 ||
        word.analysis.significantSilentPatterns.length > 0 ||
        word.analysis.readingPressureScore >= 0.3 ||
        word.analysis.localReadingPressure >= 0.42);

    seenOccurrencesByWord.set(key, occurrenceIndex);
    word.analysis.documentContext = {
      totalOccurrences,
      occurrenceIndex,
      paragraphOccurrences,
      isFirstOccurrence: occurrenceIndex === 1,
      isFirstMeaningfulOccurrence,
      isRepeatedEasyWord:
        totalOccurrences >= 2 &&
        (word.analysis.isFunctionWord || word.analysis.isHighFrequencyWord),
      isTerminologyCandidate,
      isParagraphLeadCandidate: Boolean(word.analysis.isParagraphLeadCandidate),
    };
  });

  return documentModel;
}

export function parseCognitiveDocument(text, profile, performanceContext) {
  const tokenizedDocument = timeOperation(performanceContext, 'tokenization', () => tokenizeText(text));
  const parsedDocument = timeOperation(performanceContext, 'sentenceParsing', () => parseSentences(tokenizedDocument));
  const languageModel = timeOperation(performanceContext, 'languageSelection', () =>
    resolveLanguageModel(text, profile, performanceContext),
  );
  const analyzedDocument = timeOperation(performanceContext, 'wordAnalysis', () =>
    analyzeWords(parsedDocument, languageModel, profile, performanceContext),
  );

  timeOperation(performanceContext, 'sentenceAnalysis', () => analyzeSentences(analyzedDocument, profile));
  timeOperation(performanceContext, 'documentContext', () => annotateDocumentContext(analyzedDocument));

  analyzedDocument.languageModel = languageModel;
  analyzedDocument.performance = summarizePerformance(performanceContext);

  return analyzedDocument;
}
