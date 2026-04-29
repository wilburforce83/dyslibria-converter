// @ts-nocheck
function resolveCompatibilityMode(profile) {
  switch (profile.outputCompatibilityMode) {
    case 'kindleSafe':
      return 'kindle-safe';
    case 'enhancedEpub':
      return 'enhanced-epub';
    case 'experimental':
      return 'experimental';
    default:
      return 'standard-epub';
  }
}

export function validateCompatibility(profile, renderStats) {
  const warnings = [];
  const compatibilityMode = resolveCompatibilityMode(profile);

  if (compatibilityMode === 'kindle-safe') {
    if (profile.visual.useDottedUnderline || profile.visual.useSubtleBackground || profile.visual.useColour) {
      warnings.push({
        level: 'warning',
        title: 'Kindle Safe limits visual styling',
        message: 'Underline variants, colour, and background tint may not survive conservative Kindle rendering.',
      });
    }

    if (profile.experimental.enableWeightFade || profile.experimental.enableMultiSpanGradient) {
      warnings.push({
        level: 'warning',
        title: 'Advanced emphasis is not Kindle-safe',
        message: 'Weight fade and gradient-like span treatments are reduced or removed in Kindle Safe mode.',
      });
    }

    if (profile.visual.secondaryWeight > 600 || profile.visual.tertiaryWeight > 500) {
      warnings.push({
        level: 'warning',
        title: 'Kindle Safe may flatten intermediate weights',
        message: 'Conservative EPUB engines often collapse medium-weight ladders into regular or bold text.',
      });
    }
  }

  if (renderStats.nestedSpanCount > 28) {
    warnings.push({
      level: 'warning',
      title: 'Nested spans are elevated',
      message: 'The current emphasis plan is generating a dense inline structure that may increase EPUB fragility.',
    });
  }

  if (compatibilityMode !== 'experimental' && renderStats.spanCount > 140) {
    warnings.push({
      level: 'warning',
      title: 'High span count for non-experimental export',
      message: 'This profile is using many inline emphasis zones outside the most permissive output mode.',
      });
  }

  if (
    compatibilityMode !== 'experimental' &&
    (profile.experimental.enableMultiSpanGradient ||
      profile.experimental.enableChunkMarkers ||
      profile.experimental.enableCompoundBoundaryMarkers)
  ) {
    warnings.push({
      level: 'warning',
      title: 'Selected CSS features exceed the current export mode',
      message: 'Some experimental styling cues are active while exporting to a more conservative compatibility tier.',
    });
  }

  return {
    compatibilityMode,
    warnings,
  };
}
