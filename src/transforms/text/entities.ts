const SAFE_XML_ENTITY_PATTERN = /&(?!(?:#\d+|#x[a-fA-F0-9]+|[a-zA-Z][\w.-]*);)/g;
export const XML_ENTITY_TOKEN_PATTERN = /&(?:#\d+|#x[a-fA-F0-9]+|[a-zA-Z][\w.-]*);/g;

export function escapeXmlTextContent(value: string): string {
  return String(value || '')
    .replace(SAFE_XML_ENTITY_PATTERN, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
