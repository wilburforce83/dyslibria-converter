import path from 'node:path';
import fs from 'fs-extra';
import type { CheerioAPI, Element } from 'cheerio';
import type { ConversionLogger, JsonObject } from '../../types/api';

export interface SourceStyleSanitizationStats {
  declarationsSanitized: number;
  importanceDirectivesRemoved: number;
  presentationDeclarationsRemoved: number;
  presentationalAttributesRemoved: number;
  inlineStylesUpdated: number;
  styleBlocksUpdated: number;
  stylesheetFilesUpdated: number;
}

const LINE_HEIGHT_IMPORTANT_PATTERN =
  /(^|[;{])(\s*line-height\s*:\s*[^;{}]*?)\s*!\s*important\b/gi;
const FONT_SHORTHAND_IMPORTANT_PATTERN =
  /(^|[;{])(\s*font\s*:\s*[^;{}]*\/[^;{}]*?)\s*!\s*important\b/gi;
const PRESENTATION_DECLARATION_PATTERN =
  /(^|[;{])(\s*(?:background-color|background|(?:[a-z-]*color))\s*:\s*(?:[^;"'{}]|\([^)]*\)|"[^"]*"|'[^']*')*?)\s*(?=;|}|$)/gi;
const PRESENTATIONAL_COLOR_ATTRIBUTES = ['color', 'bgcolor', 'text', 'link', 'vlink', 'alink'] as const;

function createEmptyStats(): SourceStyleSanitizationStats {
  return {
    declarationsSanitized: 0,
    importanceDirectivesRemoved: 0,
    presentationDeclarationsRemoved: 0,
    presentationalAttributesRemoved: 0,
    inlineStylesUpdated: 0,
    styleBlocksUpdated: 0,
    stylesheetFilesUpdated: 0
  };
}

function normalizeInlineStyle(content: string): string {
  return content
    .replace(/\s*;\s*;\s*/g, '; ')
    .replace(/^\s*;\s*/, '')
    .replace(/\s*;\s*$/, '')
    .trim();
}

function normalizeStylesheetCss(content: string): string {
  return content.replace(/\{\s*;\s*/g, '{ ').replace(/;\s*;\s*/g, '; ');
}

function sanitizeSourcePresentation(content: string, mode: 'inline' | 'stylesheet'): {
  content: string;
  declarationsSanitized: number;
  importanceDirectivesRemoved: number;
  presentationDeclarationsRemoved: number;
} {
  let importanceDirectivesRemoved = 0;
  let presentationDeclarationsRemoved = 0;

  const applyPattern = (input: string, pattern: RegExp): string =>
    input.replace(pattern, (_match, prefix: string, declaration: string) => {
      importanceDirectivesRemoved += 1;
      return `${prefix}${declaration}`;
    });

  let sanitizedContent = applyPattern(content, LINE_HEIGHT_IMPORTANT_PATTERN);
  sanitizedContent = applyPattern(sanitizedContent, FONT_SHORTHAND_IMPORTANT_PATTERN);
  sanitizedContent = sanitizedContent.replace(
    PRESENTATION_DECLARATION_PATTERN,
    (_match, prefix: string) => {
      presentationDeclarationsRemoved += 1;
      return prefix;
    }
  );

  sanitizedContent =
    mode === 'inline'
      ? normalizeInlineStyle(sanitizedContent)
      : normalizeStylesheetCss(sanitizedContent);

  return {
    content: sanitizedContent,
    declarationsSanitized: importanceDirectivesRemoved + presentationDeclarationsRemoved,
    importanceDirectivesRemoved,
    presentationDeclarationsRemoved
  };
}

function isInsideSvg($: CheerioAPI, element: Element): boolean {
  return $(element).closest('svg').length > 0;
}

function mergeSanitizationStats(
  stats: SourceStyleSanitizationStats,
  sanitized: {
    declarationsSanitized: number;
    importanceDirectivesRemoved: number;
    presentationDeclarationsRemoved: number;
  }
): void {
  stats.declarationsSanitized += sanitized.declarationsSanitized;
  stats.importanceDirectivesRemoved += sanitized.importanceDirectivesRemoved;
  stats.presentationDeclarationsRemoved += sanitized.presentationDeclarationsRemoved;
}

export function hasSourceStyleSanitizationChanges(
  stats: SourceStyleSanitizationStats
): boolean {
  return stats.declarationsSanitized > 0 || stats.presentationalAttributesRemoved > 0;
}

export function describeSourceStyleSanitization(
  stats: SourceStyleSanitizationStats
): string {
  const parts: string[] = [];

  if (stats.presentationDeclarationsRemoved > 0) {
    parts.push(
      `${stats.presentationDeclarationsRemoved} color/background declaration${stats.presentationDeclarationsRemoved === 1 ? '' : 's'}`
    );
  }

  if (stats.importanceDirectivesRemoved > 0) {
    parts.push(
      `${stats.importanceDirectivesRemoved} spacing/font !important override${stats.importanceDirectivesRemoved === 1 ? '' : 's'}`
    );
  }

  if (stats.presentationalAttributesRemoved > 0) {
    parts.push(
      `${stats.presentationalAttributesRemoved} presentational HTML attribute${stats.presentationalAttributesRemoved === 1 ? '' : 's'}`
    );
  }

  return parts.join(', ');
}

export function sanitizeDocumentSourceStyles($: CheerioAPI): SourceStyleSanitizationStats {
  const stats = createEmptyStats();

  $('style').each(function () {
    if (isInsideSvg($, this)) {
      return;
    }

    const currentCss = $(this).html() || '';
    const sanitized = sanitizeSourcePresentation(currentCss, 'stylesheet');

    if (!sanitized.declarationsSanitized) {
      return;
    }

    $(this).text(sanitized.content);
    mergeSanitizationStats(stats, sanitized);
    stats.styleBlocksUpdated += 1;
  });

  $('[style]').each(function () {
    if (isInsideSvg($, this)) {
      return;
    }

    const currentStyle = $(this).attr('style') || '';
    const sanitized = sanitizeSourcePresentation(currentStyle, 'inline');

    if (!sanitized.declarationsSanitized) {
      return;
    }

    const nextStyle = sanitized.content.trim();
    if (nextStyle) {
      $(this).attr('style', nextStyle);
    } else {
      $(this).removeAttr('style');
    }

    mergeSanitizationStats(stats, sanitized);
    stats.inlineStylesUpdated += 1;
  });

  PRESENTATIONAL_COLOR_ATTRIBUTES.forEach((attribute) => {
    $(`[${attribute}]`).each(function () {
      if (isInsideSvg($, this) || $(this).attr(attribute) == null) {
        return;
      }

      $(this).removeAttr(attribute);
      stats.presentationalAttributesRemoved += 1;
    });
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
    const sanitized = sanitizeSourcePresentation(currentCss, 'stylesheet');

    if (!sanitized.declarationsSanitized) {
      continue;
    }

    await fs.writeFile(filePath, sanitized.content, 'utf-8');
    mergeSanitizationStats(stats, sanitized);
    stats.stylesheetFilesUpdated += 1;

    logger?.({
      level: 'debug',
      step: 'transform',
      message: `Sanitized source presentation overrides in stylesheet: ${filePath}`,
      details: {
        declarationsSanitized: sanitized.declarationsSanitized,
        importanceDirectivesRemoved: sanitized.importanceDirectivesRemoved,
        presentationDeclarationsRemoved: sanitized.presentationDeclarationsRemoved
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
    importanceDirectivesRemoved: stats.importanceDirectivesRemoved,
    presentationDeclarationsRemoved: stats.presentationDeclarationsRemoved,
    presentationalAttributesRemoved: stats.presentationalAttributesRemoved,
    inlineStylesUpdated: stats.inlineStylesUpdated,
    styleBlocksUpdated: stats.styleBlocksUpdated,
    stylesheetFilesUpdated: stats.stylesheetFilesUpdated
  };
}
