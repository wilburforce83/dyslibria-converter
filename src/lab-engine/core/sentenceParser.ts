// @ts-nocheck
const END_PUNCTUATION = /[.!?…]/u;
const CLAUSE_PUNCTUATION = /[,;:]/u;
const CLOSING_PUNCTUATION = /["')\]”’]/u;

function finalizeSentence(tokens, paragraphIndex, sentenceIndex) {
  const words = tokens.filter((token) => token.type === 'word');

  if (!words.length) {
    return null;
  }

  words.forEach((word, wordIndex) => {
    word.sentenceIndex = sentenceIndex;
    word.positionInSentence = wordIndex;
  });

  return {
    index: sentenceIndex,
    paragraphIndex,
    rawText: tokens.map((token) => token.value).join(''),
    tokens,
    words,
  };
}

function parseSentencesFromParagraph(paragraph) {
  const sentences = [];
  let currentTokens = [];
  let boundaryPending = false;
  let clauseBoundaryActive = false;

  const flushSentence = () => {
    const sentence = finalizeSentence(currentTokens, paragraph.index, sentences.length);

    if (sentence) {
      sentence.words.forEach((word) => {
        word.afterClauseBoundary = word.afterClauseBoundary || false;
      });
      sentences.push(sentence);
    }

    currentTokens = [];
    boundaryPending = false;
    clauseBoundaryActive = false;
  };

  paragraph.tokens.forEach((token) => {
    const shouldFlushBeforeToken =
      boundaryPending &&
      ((token.type === 'word' && currentTokens.length) ||
        (token.type === 'punctuation' && !CLOSING_PUNCTUATION.test(token.value)));

    if (shouldFlushBeforeToken) {
      flushSentence();
    }

    if (token.type === 'word') {
      token.afterClauseBoundary = clauseBoundaryActive;
      clauseBoundaryActive = false;
    }

    currentTokens.push(token);

    if (token.type === 'punctuation' && END_PUNCTUATION.test(token.value)) {
      boundaryPending = true;
    }

    if (token.type === 'punctuation' && CLAUSE_PUNCTUATION.test(token.value)) {
      clauseBoundaryActive = true;
    }
  });

  if (currentTokens.length) {
    flushSentence();
  }

  return sentences;
}

export function parseSentences(documentModel) {
  documentModel.paragraphs.forEach((paragraph) => {
    paragraph.sentences = parseSentencesFromParagraph(paragraph);
  });

  documentModel.sentences = documentModel.paragraphs.flatMap((paragraph) => paragraph.sentences);

  return documentModel;
}
