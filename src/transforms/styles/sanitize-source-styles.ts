import path from 'node:path';
import fs from 'fs-extra';
import type { CheerioAPI, Element } from 'cheerio';
import type { ConversionLogger, JsonObject } from '../../types/api';

export interface SourceStyleSanitizationStats {
  declarationsSanitized: number;
  inlineStylesUpdated: number;
  styleBlocksUpdated: number;
  stylesheetFilesUpdated: number;
}

const LINE_HEIGHT_IMPORTANT_PATTERN =
  /(^|[;{])(\s*line-height\s*:\s*[^;{}]*?)\s*!\s*important\b/gi;
const FONT_SHORTHAND_IMPORTANT_PATTERN =
  /(^|[;{])(\s*font\s*:\s*[^;{}]*\/[^;{}]*?)\s*!\s*important\b/gi;

function createEmptyStats(): SourceStyleSanitizationStats {
  return {
    declarationsSanitized: 0,
    inlineStylesUpdated: 0,
    styleBlocksUpdated: 0,
    stylesheetFilesUpdated: 0
  };
}

function sanitizeTextImportance(content: string): { content: string; declarationsSanitized: number } {
  let declarationsSanitized = 0;

  const applyPattern = (input: string, pattern: RegExp): string =>
    input.replace(pattern, (_match, prefix: string, declaration: string) => {
      declarationsSanitized += 1;
      return `${prefix}${declaration}`;
    });

  let sanitizedContent = applyPattern(content, LINE_HEIGHT_IMPORTANT_PATTERN);
  sanitizedContent = applyPattern(sanitizedContent, FONT_SHORTHAND_IMPORTANT_PATTERN);

  return {
    content: sanitizedContent,
    declarationsSanitized
  };
}

function isInsideSvg($: CheerioAPI, element: Element): boolean {
  return $(element).closest('svg').length > 0;
}

export function sanitizeDocumentSourceStyles($: CheerioAPI): SourceStyleSanitizationStats {
  const stats = createEmptyStats();

  $('style').each(function () {
    if (isInsideSvg($, this)) {
      return;
    }

    const currentCss = $(this).html() || '';
    const sanitized = sanitizeTextImportance(currentCss);

    if (!sanitized.declarationsSanitized) {
      return;
    }

    $(this).text(sanitized.content);
    stats.declarationsSanitized += sanitized.declarationsSanitized;
    stats.styleBlocksUpdated += 1;
  });

  $('[style]').each(function () {
    if (isInsideSvg($, this)) {
      return;
    }

    const currentStyle = $(this).attr('style') || '';
    const sanitized = sanitizeTextImportance(currentStyle);

    if (!sanitized.declarationsSanitized) {
      return;
    }

    const nextStyle = sanitized.content.trim();
    if (nextStyle) {
      $(this).attr('style', nextStyle);
    } else {
      $(this).removeAttr('style');
    }

    stats.declarationsSanitized += sanitized.declarationsSanitized;
    stats.inlineStylesUpdated += 1;
  });

  return stats;
}

async function walkStylesheetFiles(
  dir: string,
  stats: SourceStyleSanitizationStats,
  logger?: ConversionLogger
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkStylesheetFiles(filePath, stats, logger);
      continue;
    }

    if (!/\.css$/i.test(entry.name)) {
      continue;
    }

    const currentCss = await fs.readFile(filePath, 'utf-8');
    const sanitized = sanitizeTextImportance(currentCss);

    if (!sanitized.declarationsSanitized) {
      continue;
    }

    await fs.writeFile(filePath, sanitized.content, 'utf-8');
    stats.declarationsSanitized += sanitized.declarationsSanitized;
    stats.stylesheetFilesUpdated += 1;

    logger?.({
      level: 'debug',
      step: 'transform',
      message: `Sanitized conflicting text !important declarations in stylesheet: ${filePath}`,
      details: {
        declarationsSanitized: sanitized.declarationsSanitized
      }
    });
  }
}

export async function sanitizeStylesheetFiles(
  dir: string,
  logger?: ConversionLogger
): Promise<SourceStyleSanitizationStats> {
  const stats = createEmptyStats();

  await walkStylesheetFiles(dir, stats, logger);
  return stats;
}

export function toSourceStyleSanitizationDebugData(
  stats: SourceStyleSanitizationStats
): JsonObject {
  return {
    declarationsSanitized: stats.declarationsSanitized,
    inlineStylesUpdated: stats.inlineStylesUpdated,
    styleBlocksUpdated: stats.styleBlocksUpdated,
    stylesheetFilesUpdated: stats.stylesheetFilesUpdated
  };
}
