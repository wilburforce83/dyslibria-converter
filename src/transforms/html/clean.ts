import type { CheerioAPI, Element } from 'cheerio';

export function cleanHtml($: CheerioAPI): void {
  $('span').each(function () {
    if (!$(this).attr('style')) {
      $(this).replaceWith($(this).html() || '');
    }
  });

  $('b').each(function () {
    if ($(this).children().length === 1 && $(this).children().first().is('b')) {
      $(this).replaceWith($(this).html() || '');
    }
  });
}
