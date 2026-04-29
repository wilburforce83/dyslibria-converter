// @ts-nocheck
import { languageModel as da } from './da.js';
import { languageModel as de } from './de.js';
import { languageModel as en } from './en.js';
import { languageModel as es } from './es.js';
import { languageModel as fr } from './fr.js';
import { languageModel as it } from './it.js';
import { languageModel as nl } from './nl.js';
import { languageModel as no } from './no.js';
import { languageModel as pl } from './pl.js';
import { languageModel as pt } from './pt.js';
import { languageModel as sv } from './sv.js';

const languageModels = [en, fr, de, es, it, nl, sv, no, da, pt, pl];
const languageModelMap = new Map(languageModels.map((model) => [model.code, model]));

const languageHints = {
  fr: ['é', 'è', 'ê', 'ç', 'œ', " l'", " d'", ' une ', ' des ', ' les '],
  de: ['ä', 'ö', 'ü', 'ß', ' der ', ' die ', ' das ', ' und '],
  es: ['ñ', 'á', 'é', 'í', 'ó', 'ú', 'ción', ' que ', ' los ', ' las '],
  it: ['à', 'è', 'é', 'ì', 'ò', 'ù', ' gli ', ' che ', ' una '],
  nl: ['ij', ' sch', ' het ', ' een ', ' voor '],
  sv: ['å', 'ä', 'ö', ' och ', ' att ', ' inte ', ' det '],
  no: ['æ', 'ø', 'å', ' og ', ' jeg ', ' ikke ', ' gjennom '],
  da: ['æ', 'ø', 'å', ' og ', ' jeg ', ' ikke ', ' mellem ', ' gennem '],
  pt: ['ã', 'õ', 'ç', 'ção', ' não ', ' que ', ' uma ', ' para '],
  pl: ['ą', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż', ' prz', ' szcz'],
};

const detectionCache = new Map();

export function listLanguageModels() {
  return languageModels;
}

export function getLanguageModel(code = 'en') {
  return languageModelMap.get(code) || en;
}

export function detectLanguage(text) {
  const normalizedText = (text || '').toLowerCase();

  if (!normalizedText.trim()) {
    return en;
  }

  if (detectionCache.has(normalizedText)) {
    return detectionCache.get(normalizedText);
  }

  const scoredModels = languageModels.map((model) => {
    const hintScore = (languageHints[model.code] || []).reduce(
      (score, hint) => score + Number(normalizedText.includes(hint)) * 2,
      0,
    );
    const functionWordScore = model.functionWords.reduce(
      (score, functionWord) => score + Number(normalizedText.includes(` ${functionWord} `)),
      0,
    );

    return {
      model,
      score: hintScore + functionWordScore,
    };
  });

  const detectedModel = scoredModels.sort((left, right) => right.score - left.score)[0]?.model || en;
  detectionCache.set(normalizedText, detectedModel);

  return detectedModel;
}
