import fs from 'fs-extra';
import { load } from 'cheerio';
import type { CheerioAPI, Element } from 'cheerio';
import { buildProcessedText } from '../text/bionicify';
import { cleanHtml } from './clean';

const SKIPPED_TAGS = new Set(['img', 'script', 'style', 'svg', 'math', 'code', 'pre']);

function processTextNodes($: CheerioAPI, element: Element, dictionary: Set<string>, shouldBold = true): void {
  $(element).contents().each(function () {
    if (this.type === 'text') {
      const text = (this.data || '').replace(/\u00A0/g, ' ');

      if (!text.trim()) {
        return;
      }

      const processedText = buildProcessedText(text, dictionary, shouldBold);
      const wrappedText = load(`<root>${processedText}</root>`, {
        xmlMode: true,
        decodeEntities: false
      });
      $(this).replaceWith(wrappedText('root').html() || '');
    } else if (this.type === 'tag') {
      processTextNodes($, this, dictionary, shouldBold && !SKIPPED_TAGS.has((this.tagName || '').toLowerCase()));
    }
  });
}

export async function processDocument(filePath: string, dictionary: Set<string>): Promise<{ processed: boolean; reason?: string }> {
  const content = await fs.readFile(filePath, 'utf-8');
  const $ = load(content, { xmlMode: true, decodeEntities: false });
  const body = $('body');

  if (body.length) {
    body.each(function () {
      processTextNodes($, this, dictionary);
    });
  } else if ($.root().children().length) {
    const rootNode = $.root().get(0);
    if (!rootNode) {
      return { processed: false, reason: 'missing-content' };
    }

    processTextNodes($, rootNode, dictionary);
  } else {
    return { processed: false, reason: 'missing-content' };
  }

  cleanHtml($);

  await fs.writeFile(filePath, $.xml(), 'utf-8');
  return { processed: true };
}
