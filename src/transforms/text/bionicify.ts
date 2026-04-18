import { XML_ENTITY_TOKEN_PATTERN, escapeXmlTextContent } from './entities';
import { findLongestValidPrefix } from './tokenise';

function buildProcessedPlainText(text: string, dictionary: Set<string>, shouldBold: boolean): string {
  if (!shouldBold) {
    return escapeXmlTextContent(text);
  }

  let lastIndex = 0;
  const parts: string[] = [];
  const wordPattern = /\b([a-zA-Z'-]+)/g;
  let match: RegExpExecArray | null;

  while ((match = wordPattern.exec(text)) !== null) {
    const [word] = match;
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      parts.push(escapeXmlTextContent(text.slice(lastIndex, matchIndex)));
    }

    const prefixLength = findLongestValidPrefix(word, dictionary);
    let midpoint = Math.floor(word.length / 2);

    if (midpoint < 1) {
      midpoint = 1;
    }

    const boldLength = prefixLength > 0 && prefixLength >= midpoint && word.length > 1
      ? prefixLength
      : midpoint;

    parts.push(
      `<b>${escapeXmlTextContent(word.slice(0, boldLength))}</b>${escapeXmlTextContent(word.slice(boldLength))}`
    );
    lastIndex = matchIndex + word.length;
  }

  if (lastIndex < text.length) {
    parts.push(escapeXmlTextContent(text.slice(lastIndex)));
  }

  return parts.join('');
}

export function buildProcessedText(text: string, dictionary: Set<string>, shouldBold: boolean): string {
  let lastIndex = 0;
  const parts: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = XML_ENTITY_TOKEN_PATTERN.exec(text)) !== null) {
    const entity = match[0];
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      parts.push(buildProcessedPlainText(text.slice(lastIndex, matchIndex), dictionary, shouldBold));
    }

    parts.push(entity);
    lastIndex = matchIndex + entity.length;
  }

  if (lastIndex < text.length) {
    parts.push(buildProcessedPlainText(text.slice(lastIndex), dictionary, shouldBold));
  }

  return parts.join('');
}
