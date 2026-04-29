// @ts-nocheck
import { validateCompatibility } from './compatibilityValidator.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function kebabCase(value) {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function resolveCssVariant(epubMode) {
  switch (epubMode) {
    case 'kindle-safe':
      return 'safe';
    case 'enhanced-epub':
      return 'enhanced';
    case 'experimental':
      return 'experimental';
    default:
      return 'standard';
  }
}

const NORMAL_LINE_HEIGHT = 1.72;

function buildTierClass(tier) {
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

function selectRenderableZones(word) {
  return [...(word.engine.selectedZones || [])]
    .sort((left, right) => left.startIndex - right.startIndex)
    .filter((zone, index, zoneList) => {
      if (index === 0) {
        return true;
      }

      return zone.startIndex >= zoneList[index - 1].endIndex;
    });
}

function buildSelectionAttributes(word) {
  const reasons = (word.engine.selectionReasons || []).join(', ');

  if (!reasons) {
    return '';
  }

  return ` title="${escapeHtml(reasons)}" data-selection-reasons="${escapeHtml(reasons)}"`;
}

function renderWholeWord(word) {
  const wordClasses = [
    'dyslibria-word',
    'dl-word',
    'dyslibria-word--emphasised',
    'dl-word--emphasised',
    ...buildTierClass(word.engine.emphasisTier),
  ].filter(Boolean);

  return {
    html: `<span class="${wordClasses.join(' ')}" data-language="${word.language}"${buildSelectionAttributes(word)}>${escapeHtml(word.value)}</span>`,
    spanCount: 1,
    nestedSpanCount: 0,
  };
}

function renderWordWithZones(word, includeWordWrapper = true) {
  const zones = selectRenderableZones(word);

  if (!zones.length) {
    return {
      html: includeWordWrapper
        ? `<span class="dyslibria-word dl-word" data-language="${word.language}">${escapeHtml(word.value)}</span>`
        : escapeHtml(word.value),
      spanCount: includeWordWrapper ? 1 : 0,
      nestedSpanCount: 0,
    };
  }

  let html = '';
  let cursor = 0;
  let segmentSpanCount = 0;

  zones.forEach((zone) => {
    if (cursor < zone.startIndex) {
      html += escapeHtml(word.value.slice(cursor, zone.startIndex));
    }

    const zoneText = word.value.slice(zone.startIndex, zone.endIndex);
    const classes = [
      'dyslibria-zone',
      'dl-zone',
      `dyslibria-zone--${kebabCase(zone.zoneType)}`,
      `dl-${kebabCase(zone.zoneType)}`,
      ...buildTierClass(zone.tier),
    ].filter(Boolean);

    html += `<span class="${classes.join(' ')}" data-zone-type="${zone.zoneType}" data-zone-reason="${escapeHtml(zone.reason)}">${escapeHtml(zoneText)}</span>`;
    cursor = zone.endIndex;
    segmentSpanCount += 1;
  });

  if (cursor < word.value.length) {
    html += escapeHtml(word.value.slice(cursor));
  }

  if (!includeWordWrapper) {
    return {
      html,
      spanCount: segmentSpanCount,
      nestedSpanCount: 0,
    };
  }

  const wordClasses = [
    'dyslibria-word',
    'dl-word',
    word.engine.isAnchor ? 'dyslibria-word--emphasised' : null,
    word.engine.isAnchor ? 'dl-word--emphasised' : null,
  ].filter(Boolean);

  return {
    html: `<span class="${wordClasses.join(' ')}" data-language="${word.language}"${buildSelectionAttributes(word)}>${html}</span>`,
    spanCount: segmentSpanCount + 1,
    nestedSpanCount: segmentSpanCount,
  };
}

function renderFrontLoadWord(word) {
  const prefixLength = Math.min(word.engine.frontLoad.prefixLength, word.value.length - 1);
  const prefix = word.value.slice(0, prefixLength);
  const remainder = word.value.slice(prefixLength);
  const prefixClasses = [
    'dyslibria-zone',
    'dl-zone',
    'dyslibria-frontload-prefix',
    'dl-prefix',
    ...buildTierClass('primary'),
  ];
  let html = `<span class="${prefixClasses.join(' ')}" data-zone-type="prefix" data-zone-reason="front-load:${word.engine.frontLoad.strategy}">${escapeHtml(prefix)}</span>`;
  let spanCount = 2;
  let nestedSpanCount = 1;

  if (word.engine.frontLoad.remainderTier) {
    html += `<span class="dyslibria-frontload-remainder dl-frontload-remainder ${buildTierClass(word.engine.frontLoad.remainderTier).join(' ')}">${escapeHtml(remainder)}</span>`;
    spanCount += 1;
    nestedSpanCount += 1;
  } else {
    html += escapeHtml(remainder);
  }

  return {
    html: `<span class="dyslibria-word dyslibria-word--emphasised dl-word dl-word--emphasised" data-language="${word.language}"${buildSelectionAttributes(word)}>${html}</span>`,
    spanCount,
    nestedSpanCount,
  };
}

function renderToken(token) {
  if (token.type === 'htmlTag') {
    return {
      html: token.value,
      spanCount: 0,
      nestedSpanCount: 0,
    };
  }

  if (token.type === 'linebreak') {
    return {
      html: '\n',
      spanCount: 0,
      nestedSpanCount: 0,
    };
  }

  if (token.type === 'whitespace') {
    return {
      html: token.value,
      spanCount: 0,
      nestedSpanCount: 0,
    };
  }

  if (token.type === 'punctuation') {
    return {
      html: escapeHtml(token.value),
      spanCount: 0,
      nestedSpanCount: 0,
    };
  }

  if (token.engine?.frontLoad?.isActive) {
    return renderFrontLoadWord(token);
  }

  if (token.engine?.isAnchor && token.engine?.renderMode === 'wholeWord') {
    return renderWholeWord(token);
  }

  return renderWordWithZones(token, token.engine?.isAnchor || token.engine?.selectedZones?.length || false);
}

function generateCss(profile, variant) {
  const allowExperimental = variant === 'experimental';
  const allowEnhanced = variant === 'enhanced' || allowExperimental;
  const lineHeight = Number(profile.visual.lineHeight) || NORMAL_LINE_HEIGHT;
  const forceLineHeight = lineHeight > NORMAL_LINE_HEIGHT;
  const lineHeightDeclaration = `line-height: ${profile.visual.lineHeight}${forceLineHeight ? ' !important' : ''};`;
  const weightFade = profile.experimental.enableWeightFade && allowExperimental;
  const primaryWeight = profile.visual.useBold ? profile.visual.primaryWeight : Math.min(profile.visual.primaryWeight, 600);
  const secondaryWeight =
    profile.visual.useSemiBold && allowEnhanced
      ? profile.visual.secondaryWeight
      : Math.min(primaryWeight, 600);
  const tertiaryWeight =
    profile.visual.useSemiBold && allowEnhanced
      ? profile.visual.tertiaryWeight
      : Math.min(profile.visual.tertiaryWeight, 500);
  const underlineRule = profile.visual.useUnderline
    ? 'text-decoration: underline;'
    : profile.visual.useDottedUnderline && allowEnhanced
      ? 'text-decoration: underline dotted;'
      : 'text-decoration: none;';
  const backgroundRule =
    profile.visual.useSubtleBackground && allowEnhanced
      ? 'background: rgba(35, 183, 194, 0.12); border-radius: 0.18em;'
      : '';
  const colorRule = profile.visual.useColour && allowEnhanced ? 'color: #dff7f7;' : 'color: inherit;';
  const markerRule =
    profile.experimental.enableCompoundBoundaryMarkers && allowEnhanced
      ? 'box-shadow: inset 0 -0.17em 0 rgba(35, 183, 194, 0.18);'
      : 'box-shadow: none;';
  const debugSurface =
    profile.experimental.enableDebugAnnotations && allowExperimental
      ? `
.dl-zone[data-zone-type="cluster"],
.dyslibria-zone[data-zone-type="cluster"] { outline: 1px dashed rgba(35, 183, 194, 0.24); }
.dl-zone[data-zone-type="suffix"],
.dyslibria-zone[data-zone-type="suffix"] { outline: 1px dashed rgba(96, 165, 250, 0.24); }
`
      : '';

  return `.dyslibria-engine,
.dl-engine {
  font-family: ${profile.visual.fontFamily};
  ${lineHeightDeclaration}
  word-spacing: ${profile.visual.wordSpacing};
  letter-spacing: ${profile.visual.letterSpacing};
  white-space: pre-wrap;
  color: inherit;
  max-width: ${profile.visual.maxLineWidth};
}

.dyslibria-paragraph,
.dl-paragraph {
  ${lineHeightDeclaration}
  margin: 0 0 ${profile.visual.paragraphSpacing};
}

.dyslibria-paragraph:last-child,
.dl-paragraph:last-child {
  margin-bottom: 0;
}

.dyslibria-word,
.dl-word {
  color: inherit;
  line-height: inherit${forceLineHeight ? ' !important' : ''};
}

.dyslibria-zone,
.dl-zone,
.dyslibria-frontload-remainder,
.dl-frontload-remainder {
  ${underlineRule}
  ${backgroundRule}
  ${colorRule}
  line-height: inherit${forceLineHeight ? ' !important' : ''};
}

.dyslibria-tier-primary,
.dl-anchor-primary {
  font-weight: ${primaryWeight};
  ${weightFade ? 'opacity: 1;' : ''}
}

.dyslibria-tier-secondary,
.dl-anchor-secondary {
  font-weight: ${secondaryWeight};
  ${weightFade ? 'opacity: 0.94;' : ''}
}

.dyslibria-tier-tertiary,
.dl-anchor-tertiary {
  font-weight: ${tertiaryWeight};
  ${weightFade ? 'opacity: 0.88;' : ''}
}

.dyslibria-tier-spacing,
.dl-spacing-only {
  letter-spacing: calc(${profile.visual.letterSpacing} + 0.02em);
}

.dyslibria-tier-marker,
.dl-marker-only {
  ${markerRule}
}

.dyslibria-frontload-prefix,
.dl-prefix {
  font-weight: ${primaryWeight};
  line-height: inherit${forceLineHeight ? ' !important' : ''};
}

.dl-silent,
.dl-silent-pattern,
.dl-silent-ending {
  ${allowEnhanced ? 'opacity: 0.85;' : ''}
}

.dl-compound-boundary {
  ${profile.experimental.enableCompoundBoundaryMarkers && allowEnhanced ? 'border-inline-end: 1px dotted rgba(255,255,255,0.25);' : ''}
}

${forceLineHeight ? `
.dyslibria-paragraph *,
.dl-paragraph * {
  line-height: inherit !important;
}
` : ''}

${debugSurface}`.trim();
}

export function renderEngineOutput(model) {
  let spanCount = 0;
  let nestedSpanCount = 0;

  const html = `<div class="dyslibria-engine dl-engine">${model.paragraphs
    .map((paragraph) => {
      const paragraphHtml = paragraph.tokens
        .map((token) => {
          const tokenOutput = renderToken(token);
          spanCount += tokenOutput.spanCount;
          nestedSpanCount += tokenOutput.nestedSpanCount;
          return tokenOutput.html;
        })
        .join('');

      return `<p class="dyslibria-paragraph dl-paragraph" data-paragraph="${paragraph.index + 1}">${paragraphHtml}</p>`;
    })
    .join('')}</div>`;

  const css = {
    active: '',
    safe: generateCss(model.profile, 'safe'),
    standard: generateCss(model.profile, 'standard'),
    enhanced: generateCss(model.profile, 'enhanced'),
    experimental: generateCss(model.profile, 'experimental'),
  };

  css.active = css[resolveCssVariant(model.profile.output.epubMode)];

  const compatibilityOutput = validateCompatibility(model.profile, {
    spanCount,
    nestedSpanCount,
  });

  return {
    html,
    css,
    spanCount,
    nestedSpanCount,
    warnings: compatibilityOutput.warnings,
    compatibilityMode: compatibilityOutput.compatibilityMode,
  };
}
