import { describe, expect, test } from 'vitest';

import { createEngineModel, createProfileFromPreset } from '../src';

function getBalancedProfile() {
  return createProfileFromPreset('dyslibria-balanced');
}

describe('engine scoring refinements', () => {
  test('lexical familiarity lowers pressure for common words and raises it for specialized ones', () => {
    const model = createEngineModel(
      'Because the explanation stayed familiar, electroencephalographic analysis remained difficult.',
      getBalancedProfile(),
    ) as any;

    const because = model.words.find((word: any) => word.normalized === 'because');
    const electroencephalographic = model.words.find(
      (word: any) => word.normalized === 'electroencephalographic',
    );

    expect(because).toBeDefined();
    expect(electroencephalographic).toBeDefined();
    expect(because.analysis.lexicalFamiliarityScore).toBeGreaterThan(
      electroencephalographic.analysis.lexicalFamiliarityScore,
    );
    expect(because.analysis.readingPressureScore).toBeLessThan(
      electroencephalographic.analysis.readingPressureScore,
    );
    expect(because.analysis.complexityScore).toBeLessThan(
      electroencephalographic.analysis.complexityScore,
    );
  });

  test('dense technical sentences score higher density than easy sentences', () => {
    const model = createEngineModel(
      'Readers can follow the short explanation with ease. Electroencephalographic synchronization, interdisciplinary neurophysiology, counterrevolutionary reframing, and incomprehensibility complicated the densely structured discussion.',
      getBalancedProfile(),
    ) as any;

    const [easySentence, denseSentence] = model.sentences;

    expect(easySentence.analysis.isDense).toBe(false);
    expect(denseSentence.analysis.isDense).toBe(true);
    expect(denseSentence.analysis.densityScore).toBeGreaterThan(easySentence.analysis.densityScore);
    expect(
      denseSentence.words.filter((word: any) => word.engine.isAnchor).length,
    ).toBeGreaterThanOrEqual(
      easySentence.words.filter((word: any) => word.engine.isAnchor).length,
    );
  });
});
