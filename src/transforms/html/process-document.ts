import path from 'node:path';
import fs from 'fs-extra';
import { load, type Cheerio, type CheerioAPI } from 'cheerio';
import type { ChildNode, Element, Text } from 'domhandler';
import { applyDyslibriaProfile } from '../../lab-engine/core/engine.js';
import type {
  HtmlFileProcessingMetrics,
  JsonObject,
  ProcessingWarning
} from '../../types/api';
import type { ResolvedProfile } from '../../config/profile';
import { escapeXmlTextContent } from '../text/entities';
import { cleanHtml } from './clean';
import {
  sanitizeDocumentSourceStyles,
  toSourceStyleSanitizationDebugData
} from '../styles/sanitize-source-styles';

const PROCESSABLE_SELECTOR = [
  'blockquote',
  'caption',
  'dd',
  'div',
  'dt',
  'figcaption',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'p',
  'td',
  'th'
].join(', ');
const SKIPPED_SELECTOR = 'code, math, pre, script, style, svg';
const ROOT_ENGINE_CLASSES = ['dyslibria-engine', 'dl-engine'];
const PARAGRAPH_CLASSES = ['dyslibria-paragraph', 'dl-paragraph'];
const STYLE_ELEMENT_ID = 'dyslibria-engine-styles';
const TOKEN_PATTERN =
  /([\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|\r?\n|[ \t]+|[^\s])/gu;

interface TextUnit {
  source: string;
  styleKey: string;
}

interface TextUnitReference {
  unit: TextUnit;
}

interface TextNodeRecord {
  node: Text;
  units: TextUnit[];
}

interface ProcessingTarget {
  element: Element;
  textNodes: TextNodeRecord[];
  text: string;
}

interface StyledRange {
  start: number;
  end: number;
  classes: string[];
  attributes?: Record<string, string>;
}

interface EngineFileResult {
  css: { active: string };
  metrics: HtmlFileProcessingMetrics['metrics'];
  warnings: ProcessingWarning[];
  debugData: JsonObject;
  profileUsed: JsonObject;
  spanCount: number;
  words: Array<{
    value: string;
    engine: {
      isAnchor: boolean;
      emphasisTier: string | null;
      renderMode: string;
      selectionReasons?: string[];
      selectedZones?: Array<{
        startIndex: number;
        endIndex: number;
        zoneType: string;
        reason: string;
        tier: string;
      }>;
      frontLoad?: {
        isActive: boolean;
        prefixLength: number;
        remainderTier: string | null;
        strategy: string | null;
      };
    };
  }>;
}

function escapeAttributeValue(value: string): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function kebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function buildTierClass(tier: string | null): string[] {
  switch (tier) {
    case 'primary':
      return ['dl-anchor-primary', 'dyslibria-tier-primary'];
    case 'secondary':
      return ['dl-anchor-secondary', 'dyslibria-tier-secondary'];
    case 'tertiary':
      return ['dl-anchor-tertiary', 'dyslibria-tier-tertiary'];
    case 'spacingOnly':
      return ['dl-spacing-only', 'dyslibria-tier-spacing'];
    case 'markerOnly':
      return ['dl-marker-only', 'dyslibria-tier-marker'];
    default:
      return [];
  }
}

function buildSelectionAttributes(selectionReasons: string[] | undefined): Record<string, string> | undefined {
  const reasons = (selectionReasons || []).join(', ');

  if (!reasons) {
    return undefined;
  }

  return {
    title: reasons,
    'data-selection-reasons': reasons
  };
}

function buildStyleKey(classes: string[], attributes?: Record<string, string>): string {
  const attributeEntries = Object.entries(attributes || {}).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  return JSON.stringify({
    classes,
    attributes: attributeEntries
  });
}

function styleRange(
  references: Array<TextUnitReference | null>,
  start: number,
  end: number,
  style: StyledRange
): void {
  const styleKey = buildStyleKey(style.classes, style.attributes);

  for (let index = start; index < end; index += 1) {
    const reference = references[index];
    if (!reference) {
      continue;
    }

    reference.unit.styleKey = styleKey;
  }
}

function hasMeaningfulText(element: Cheerio<Element>): boolean {
  return element.text().replace(/\s+/g, '').length > 0;
}

function hasNestedProcessableContent($: CheerioAPI, element: Element): boolean {
  return $(element)
    .find(PROCESSABLE_SELECTOR)
    .toArray()
    .some((descendant) => hasMeaningfulText($(descendant)));
}

function addClasses(element: Cheerio<Element>, classes: string[]): void {
  const nextClasses = new Set((element.attr('class') || '').split(/\s+/).filter(Boolean));

  for (const className of classes) {
    nextClasses.add(className);
  }

  element.attr('class', [...nextClasses].join(' '));
}

function ensureHead($: CheerioAPI): void {
  if ($('head').length > 0) {
    return;
  }

  if ($('html').length > 0) {
    $('html').prepend('<head></head>');
    return;
  }

  $.root().prepend('<head></head>');
}

function injectActiveCss($: CheerioAPI, css: string): void {
  if (!css.trim()) {
    return;
  }

  ensureHead($);

  const styleElement = $(`head > style#${STYLE_ELEMENT_ID}`);
  if (styleElement.length > 0) {
    styleElement.text(css);
    return;
  }

  $('head').append(`<style id="${STYLE_ELEMENT_ID}" type="text/css">${css}</style>`);
}

function collectTextNodes(
  node: ChildNode,
  textNodes: TextNodeRecord[],
  buffer: string[],
  allowStyling = true
): void {
  if (node.type === 'text') {
    const units = [...(node.data || '')].map((character) => ({
      source: character,
      styleKey: allowStyling ? '' : '__plain__'
    }));

    textNodes.push({
      node,
      units
    });

    if (allowStyling) {
      buffer.push(...units.map((unit) => unit.source));
    }

    return;
  }

  if (node.type !== 'tag') {
    return;
  }

  const tagName = (node.tagName || '').toLowerCase();
  const nextAllowStyling = allowStyling && !tagName.match(/^(code|math|pre|script|style|svg)$/);

  for (const child of node.children || []) {
    collectTextNodes(child, textNodes, buffer, nextAllowStyling);
  }
}

function collectProcessingTargets($: CheerioAPI): ProcessingTarget[] {
  const candidates = $(PROCESSABLE_SELECTOR)
    .toArray()
    .filter((element) => {
      const currentElement = $(element);

      if (currentElement.parents(SKIPPED_SELECTOR).length > 0) {
        return false;
      }

      if (!hasMeaningfulText(currentElement)) {
        return false;
      }

      return !hasNestedProcessableContent($, element);
    });

  if (candidates.length === 0) {
    return [];
  }

  return candidates
    .map((element) => {
      const textNodes: TextNodeRecord[] = [];
      const buffer: string[] = [];

      for (const child of element.children || []) {
        collectTextNodes(child, textNodes, buffer);
      }

      return {
        element,
        textNodes,
        text: buffer.join('').replace(/\r\n/g, '\n').replace(/\s*\n+\s*/g, ' ').trim()
      };
    })
    .filter((target) => target.text.length > 0);
}

function renderWithEngine(text: string, resolvedProfile: ResolvedProfile): EngineFileResult {
  const result = applyDyslibriaProfile(text, resolvedProfile.profileUsed);

  return {
    css: result.activeCss ? { active: result.activeCss } : result.css,
    metrics: result.metrics,
    warnings: result.warnings || [],
    debugData: (result.debugData || {}) as JsonObject,
    profileUsed: (result.profileUsed || resolvedProfile.profileUsed) as JsonObject,
    spanCount: result.spanCount || 0,
    words: result.model?.words || []
  };
}

function buildProcessableCharacterMap(
  targets: ProcessingTarget[]
): { input: string; references: Array<TextUnitReference | null> } {
  const characters: string[] = [];
  const references: Array<TextUnitReference | null> = [];

  targets.forEach((target, targetIndex) => {
    for (const textNode of target.textNodes) {
      for (const unit of textNode.units) {
        if (unit.styleKey === '__plain__') {
          continue;
        }

        characters.push(unit.source);
        references.push({ unit });
      }
    }

    if (targetIndex < targets.length - 1) {
      characters.push('\n', '\n');
      references.push(null, null);
    }
  });

  return {
    input: characters.join(''),
    references
  };
}

function applyWordStyles(
  input: string,
  references: Array<TextUnitReference | null>,
  words: EngineFileResult['words']
): void {
  let wordIndex = 0;

  for (const match of input.matchAll(TOKEN_PATTERN)) {
    if (wordIndex >= words.length) {
      break;
    }

    const token = match[0];
    if (!/^[\p{L}\p{N}]/u.test(token)) {
      continue;
    }

    const currentWord = words[wordIndex];
    const start = match.index || 0;
    const end = start + token.length;

    if (currentWord.engine.frontLoad?.isActive) {
      const prefixLength = Math.max(0, Math.min(currentWord.engine.frontLoad.prefixLength, token.length));
      styleRange(references, start, start + prefixLength, {
        start,
        end: start + prefixLength,
        classes: [
          'dyslibria-zone',
          'dl-zone',
          'dyslibria-frontload-prefix',
          'dl-prefix',
          ...buildTierClass('primary')
        ],
        attributes: {
          'data-zone-type': 'prefix',
          'data-zone-reason': `front-load:${currentWord.engine.frontLoad.strategy || 'contentWordsOnly'}`
        }
      });

      if (currentWord.engine.frontLoad.remainderTier) {
        styleRange(references, start + prefixLength, end, {
          start: start + prefixLength,
          end,
          classes: [
            'dyslibria-frontload-remainder',
            'dl-frontload-remainder',
            ...buildTierClass(currentWord.engine.frontLoad.remainderTier)
          ]
        });
      }

      wordIndex += 1;
      continue;
    }

    if (currentWord.engine.isAnchor && currentWord.engine.renderMode === 'wholeWord') {
      styleRange(references, start, end, {
        start,
        end,
        classes: [
          'dyslibria-word',
          'dl-word',
          'dyslibria-word--emphasised',
          'dl-word--emphasised',
          ...buildTierClass(currentWord.engine.emphasisTier)
        ],
        attributes: buildSelectionAttributes(currentWord.engine.selectionReasons)
      });
      wordIndex += 1;
      continue;
    }

    for (const zone of currentWord.engine.selectedZones || []) {
      styleRange(references, start + zone.startIndex, start + zone.endIndex, {
        start: start + zone.startIndex,
        end: start + zone.endIndex,
        classes: [
          'dyslibria-zone',
          'dl-zone',
          `dyslibria-zone--${kebabCase(zone.zoneType)}`,
          `dl-${kebabCase(zone.zoneType)}`,
          ...buildTierClass(zone.tier)
        ],
        attributes: {
          'data-zone-type': zone.zoneType,
          'data-zone-reason': zone.reason
        }
      });
    }

    wordIndex += 1;
  }
}

function renderStyledTextNode(record: TextNodeRecord): string {
  let html = '';
  let buffer = '';
  let activeStyleKey = '__sentinel__';

  const flush = () => {
    if (!buffer) {
      return;
    }

    const escaped = escapeXmlTextContent(buffer);
    if (!activeStyleKey || activeStyleKey === '__plain__') {
      html += escaped;
      buffer = '';
      return;
    }

    const parsedStyle = JSON.parse(activeStyleKey) as {
      classes: string[];
      attributes: Array<[string, string]>;
    };
    const attributeString = [
      `class="${parsedStyle.classes.join(' ')}"`,
      ...parsedStyle.attributes.map(
        ([name, value]) => `${name}="${escapeAttributeValue(value)}"`
      )
    ].join(' ');

    html += `<span ${attributeString}>${escaped}</span>`;
    buffer = '';
  };

  for (const unit of record.units) {
    if (buffer && activeStyleKey !== unit.styleKey) {
      flush();
    }

    activeStyleKey = unit.styleKey;
    buffer += unit.source;
  }

  flush();
  return html;
}

function applyRenderedTextNodes($: CheerioAPI, targets: ProcessingTarget[]): void {
  for (const target of targets) {
    for (const textNode of target.textNodes) {
      $(textNode.node).replaceWith(renderStyledTextNode(textNode));
    }

    const element = $(target.element);
    addClasses(element, PARAGRAPH_CLASSES);
  }
}

function applyRootClasses($: CheerioAPI, targets: ProcessingTarget[]): void {
  const body = $('body').first();

  if (body.length > 0) {
    addClasses(body, ROOT_ENGINE_CLASSES);
    return;
  }

  for (const target of targets) {
    addClasses($(target.element), ROOT_ENGINE_CLASSES);
  }
}

function mergeInlineStyleDeclarations(
  currentStyle: string,
  nextDeclarations: Array<[string, string]>
): string {
  const declarations = new Map<string, string>();

  for (const segment of String(currentStyle || '').split(';')) {
    const trimmedSegment = segment.trim();
    if (!trimmedSegment) {
      continue;
    }

    const separatorIndex = trimmedSegment.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const property = trimmedSegment.slice(0, separatorIndex).trim().toLowerCase();
    const value = trimmedSegment.slice(separatorIndex + 1).trim();

    if (!property || !value) {
      continue;
    }

    declarations.set(property, value);
  }

  for (const [property, value] of nextDeclarations) {
    declarations.set(property, value);
  }

  return [...declarations.entries()]
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
}

function normalizeDocumentRootPresentation($: CheerioAPI): void {
  const rootDeclarations: Array<[string, string]> = [
    ['color', 'inherit !important'],
    ['background', 'transparent !important'],
    ['background-color', 'transparent !important']
  ];

  $('html, body').each(function () {
    const element = $(this);
    const nextStyle = mergeInlineStyleDeclarations(element.attr('style') || '', rootDeclarations);

    if (nextStyle) {
      element.attr('style', nextStyle);
    }
  });
}

export async function processDocument(
  filePath: string,
  rootDir: string,
  resolvedProfile: ResolvedProfile
): Promise<{ processed: boolean; file: HtmlFileProcessingMetrics }> {
  const content = await fs.readFile(filePath, 'utf-8');
  const relativePath = path.relative(rootDir, filePath).split(path.sep).join('/');
  const $ = load(content, { xmlMode: true, decodeEntities: true });
  const sourceStyleSanitization = sanitizeDocumentSourceStyles($);
  const targets = collectProcessingTargets($);

  if (targets.length === 0) {
    return {
      processed: false,
      file: {
        filePath: relativePath,
        status: 'skipped',
        reason: 'missing-content',
        inputCharacters: content.length,
        outputCharacters: content.length,
        processedBlockCount: 0,
        warnings: []
      }
    };
  }

  const processableMap = buildProcessableCharacterMap(targets);
  const engineResult = renderWithEngine(processableMap.input, resolvedProfile);

  applyWordStyles(processableMap.input, processableMap.references, engineResult.words);
  applyRenderedTextNodes($, targets);
  applyRootClasses($, targets);
  normalizeDocumentRootPresentation($);
  injectActiveCss($, engineResult.css.active || '');
  cleanHtml($);

  const outputContent = $.xml();
  await fs.writeFile(filePath, outputContent, 'utf-8');
  const warnings = [...engineResult.warnings];

  if (sourceStyleSanitization.declarationsSanitized > 0) {
    warnings.push({
      level: 'info',
      title: 'Source text style overrides sanitized',
      message: `Removed !important from ${sourceStyleSanitization.declarationsSanitized} source line-height/font declaration${sourceStyleSanitization.declarationsSanitized === 1 ? '' : 's'} to reduce spacing conflicts.`
    });
  }

  return {
    processed: true,
    file: {
      filePath: relativePath,
      status: 'processed',
      inputCharacters: content.length,
      outputCharacters: outputContent.length,
      processedBlockCount: targets.length,
      metrics: engineResult.metrics,
      warnings,
      debugData: {
        ...engineResult.debugData,
        sourceStyleSanitization: toSourceStyleSanitizationDebugData(sourceStyleSanitization)
      },
      profileUsed: engineResult.profileUsed,
      activeCss: engineResult.css.active,
      spanCount: engineResult.spanCount
    }
  };
}
