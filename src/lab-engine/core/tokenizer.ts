// @ts-nocheck
const TOKEN_PATTERN =
  /(<\/?[A-Za-z][^>]*>|[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|\r?\n|[ \t]+|[^\s])/gu;

function normalizeWord(word) {
  return word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function tokenizeParagraph(rawText, paragraphIndex, startingWordIndex) {
  const tokens = [];
  const words = [];
  let globalWordIndex = startingWordIndex;
  let positionInParagraph = 0;

  for (const match of rawText.matchAll(TOKEN_PATTERN)) {
    const value = match[0];
    const isHtmlTag = /^<\/?[A-Za-z][^>]*>$/u.test(value);
    const isLineBreak = /^\r?\n$/u.test(value);
    const isWhitespace = /^[ \t]+$/u.test(value);
    const isWord = !isHtmlTag && !isLineBreak && !isWhitespace && /^[\p{L}\p{N}]/u.test(value);

    const token = {
      type: isHtmlTag
        ? 'htmlTag'
        : isLineBreak
          ? 'linebreak'
          : isWhitespace
            ? 'whitespace'
            : isWord
              ? 'word'
              : 'punctuation',
      value,
      paragraphIndex,
    };

    if (isWord) {
      token.normalized = normalizeWord(value);
      token.globalWordIndex = globalWordIndex;
      token.positionInParagraph = positionInParagraph;
      words.push(token);
      globalWordIndex += 1;
      positionInParagraph += 1;
    }

    tokens.push(token);
  }

  return {
    tokens,
    words,
    nextWordIndex: globalWordIndex,
  };
}

export function tokenizeText(inputText) {
  const normalizedText = (inputText || '').replace(/\r\n/g, '\n');
  const paragraphTexts = normalizedText.length
    ? normalizedText.split(/\n{2,}/).filter((paragraphText) => paragraphText.length > 0)
    : [];

  const paragraphs = [];
  const words = [];
  const tokens = [];
  let nextWordIndex = 0;

  paragraphTexts.forEach((rawText, paragraphIndex) => {
    const tokenizedParagraph = tokenizeParagraph(rawText, paragraphIndex, nextWordIndex);

    paragraphs.push({
      index: paragraphIndex,
      rawText,
      tokens: tokenizedParagraph.tokens,
      words: tokenizedParagraph.words,
      isDialogue: /^\s*["'“‘-]/u.test(rawText),
    });

    tokens.push(...tokenizedParagraph.tokens);
    words.push(...tokenizedParagraph.words);
    nextWordIndex = tokenizedParagraph.nextWordIndex;
  });

  return {
    text: normalizedText,
    tokens,
    words,
    paragraphs,
  };
}
