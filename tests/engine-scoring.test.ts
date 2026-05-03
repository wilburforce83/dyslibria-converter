import { describe, expect, test } from 'vitest';

import { createEngineModel, createProfileFromPreset } from '../src';

function getBalancedProfile() {
  return createProfileFromPreset('dyslibria-balanced');
}

function getMaximumUnanchoredRun(sentence: any) {
  const anchorPositions = sentence.words
    .filter((word: any) => word.engine.isAnchor)
    .map((word: any) => word.positionInSentence)
    .sort((left: number, right: number) => left - right);
  const boundaries = [-1, ...anchorPositions, sentence.analysis.wordCount];

  return boundaries.slice(0, -1).reduce((maximumRun: number, start: number, index: number) => {
    const runLength = boundaries[index + 1] - start - 1;

    return Math.max(maximumRun, runLength);
  }, 0);
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

  test('intense scaffolding fills long gaps in semicolon-heavy passages', () => {
    const model = createEngineModel(
      "For keeping the trim gardens full of choice flowers without a weed to speck them; for frightening away little boys who look wistfully at the said flowers through the railings; for rushing out at the geese that occasionally venture in to the gardens if the gates are left open; for deciding all questions of literature and politics without troubling themselves with unnecessary reasons or arguments; for obtaining clear and correct knowledge of everybody's affairs in the parish; for keeping their neat maid-servants in admirable order; for kindness (somewhat dictatorial) to the poor, and real tender good offices to each other whenever they are in distress, the ladies of Cranford are quite sufficient.",
      createProfileFromPreset('intense-scaffolding'),
    ) as any;

    const sentence = model.sentences[0];
    const gapCoverageAnchors = sentence.words.filter((word: any) =>
      word.engine.selectionReasons?.includes('gap coverage support'),
    );

    expect(gapCoverageAnchors.length).toBeGreaterThan(0);
    expect(getMaximumUnanchoredRun(sentence)).toBeLessThanOrEqual(18);
  });
});
