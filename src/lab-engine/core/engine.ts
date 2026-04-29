// @ts-nocheck
import { parseCognitiveDocument } from './cognitiveParser.js';
import { planEmphasis } from './emphasisPlanner.js';
import { calculateMetrics } from './metrics.js';
import { createPerformanceContext } from './performance.js';
import { normalizeProfile } from './profileEngine.js';
import { renderEngineOutput } from './renderer.js';

export function createEngineModel(text, rawProfile) {
  const profile = normalizeProfile(rawProfile);
  const performanceContext = createPerformanceContext(profile.performanceMode);
  const parsedDocument = parseCognitiveDocument(text, profile, performanceContext);

  parsedDocument.profile = profile;

  return planEmphasis(parsedDocument, profile, parsedDocument.languageModel);
}

export function applyDyslibriaProfile(text, rawProfile) {
  const model = createEngineModel(text, rawProfile);
  const renderOutput = renderEngineOutput(model);
  const metricsOutput = calculateMetrics(model, renderOutput);

  return {
    html: renderOutput.html,
    css: renderOutput.css,
    metrics: metricsOutput.metrics,
    warnings: metricsOutput.warnings,
    debugData: {
      ...model.debugData,
      languageModel: {
        code: model.languageModel.code,
        name: model.languageModel.name,
        family: model.languageModel.family,
        description: model.languageModel.metadata.description,
        parsingFocus: model.languageModel.metadata.parsingFocus,
        recommendedDefaultStrategies: model.languageModel.metadata.recommendedDefaultStrategies,
      },
      performance: model.performance,
      selectedLanguage: model.languageModel.code,
    },
    profileUsed: model.profile,
    activeCss: renderOutput.css.active,
    model,
    spanCount: renderOutput.spanCount,
  };
}
