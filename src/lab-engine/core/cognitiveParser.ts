// @ts-nocheck
import { detectLanguage, getLanguageModel } from '../language/languageRegistry.js';
import { summarizePerformance, timeOperation, withCachedResult } from './performance.js';
import { parseSentences } from './sentenceParser.js';
import { tokenizeText } from './tokenizer.js';
import { analyzeWords } from './wordAnalyzer.js';

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
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

      sentence.analysis = {
        wordCount: sentence.words.length,
        averageComplexity,
        averageWordLength,
        clauseBoundaryCount,
        isLong: sentence.words.length >= profile.cognitiveLoad.longSentenceThreshold,
        isSimple: sentence.words.length <= 8 && averageComplexity < 0.28,
        isDialogue: paragraph.isDialogue,
      };
    });

    paragraph.analysis = {
      wordCount: paragraph.words.length,
      sentenceCount: paragraph.sentences.length,
      averageComplexity: average(paragraph.words.map((word) => word.analysis.complexityScore)),
    };
  });

  documentModel.analysis = {
    totalWords: documentModel.words.length,
    totalSentences: documentModel.sentences.length,
    totalParagraphs: documentModel.paragraphs.length,
    averageComplexityScore: average(documentModel.words.map((word) => word.analysis.complexityScore)),
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
      word.analysis.complexityScore * 0.7 +
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
        word.analysis.complexityScore < 0.26 &&
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
        word.analysis.complexityScore >= 0.28 ||
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
        word.analysis.complexityScore >= 0.54);
    const isFirstMeaningfulOccurrence =
      occurrenceIndex === 1 &&
      (isTerminologyCandidate ||
        word.analysis.isLongWord ||
        word.analysis.significantSuffixes.length > 0 ||
        word.analysis.possibleCompoundParts.length > 1 ||
        word.analysis.significantSilentPatterns.length > 0 ||
        word.analysis.complexityScore >= 0.28);

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
