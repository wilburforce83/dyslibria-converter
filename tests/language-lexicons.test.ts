import { describe, expect, test } from 'vitest';

import { createEngineModel, createProfileFromPreset } from '../src';
import { listLanguageModels } from '../src/lab-engine/language/languageRegistry';

function createPinnedProfile(sourceLanguage: string) {
  return {
    ...createProfileFromPreset('dyslibria-balanced'),
    sourceLanguage,
  };
}

describe('language lexicon seeds', () => {
  test('every language model ships a substantial seeded lexicon with large high-frequency coverage', () => {
    const languageModels = listLanguageModels() as any[];

    languageModels.forEach((model) => {
      expect(model.highFrequencyWords.length).toBeGreaterThanOrEqual(100);
      expect(model.lexicon.length).toBeGreaterThan(750);
    });
  });

  test('seeded lexicons treat familiar words as easier than specialized terms across languages', () => {
    const cases = [
      ['en', 'house', 'electroencephalographic'],
      ['fr', 'maison', 'électroencéphalographique'],
      ['de', 'haus', 'elektroenzephalographisch'],
      ['es', 'casa', 'electroencefalográfico'],
      ['it', 'casa', 'elettroencefalografico'],
      ['nl', 'huis', 'elektroencefalografisch'],
      ['no', 'hus', 'elektroencefalografisk'],
      ['da', 'hus', 'elektroencefalografisk'],
      ['pt', 'casa', 'eletroencefalográfico'],
      ['pl', 'dom', 'elektroencefalograficzny'],
      ['sv', 'hus', 'elektroencefalografisk'],
    ] as const;

    cases.forEach(([sourceLanguage, familiarWord, specializedWord]) => {
      const model = createEngineModel(
        `${familiarWord} ${specializedWord}`,
        createPinnedProfile(sourceLanguage),
      ) as any;

      const familiar = model.words.find(
        (word: any) => word.normalized === familiarWord.toLowerCase(),
      );
      const specialized = model.words.find(
        (word: any) => word.normalized === specializedWord.toLowerCase(),
      );

      expect(familiar).toBeDefined();
      expect(specialized).toBeDefined();
      expect(familiar.analysis.lexicalSource).toBe('lexicon');
      expect(specialized.analysis.lexicalSource).toBe('lexicon');
      expect(familiar.analysis.lexicalFamiliarityScore).toBeGreaterThan(
        specialized.analysis.lexicalFamiliarityScore,
      );
      expect(familiar.analysis.readingPressureScore).toBeLessThan(
        specialized.analysis.readingPressureScore,
      );
    });
  });
});
