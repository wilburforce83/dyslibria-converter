export function findLongestValidPrefix(word: string, dictionary: Set<string>): number {
  let longestPrefixLength = 0;

  for (let index = word.length; index > 0; index -= 1) {
    if (dictionary.has(word.slice(0, index))) {
      longestPrefixLength = index;
      break;
    }
  }

  const maxAllowedLength = Math.floor(word.length / 1.7);
  if (longestPrefixLength > maxAllowedLength) {
    return maxAllowedLength;
  }

  return longestPrefixLength;
}
