// @ts-nocheck
function now() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export function createPerformanceContext(mode = 'balanced') {
  return {
    mode,
    timings: {},
    caches: {
      wordAnalysis: new Map(),
      languageSelection: new Map(),
    },
    cacheStats: {
      wordAnalysis: { hits: 0, misses: 0 },
      languageSelection: { hits: 0, misses: 0 },
    },
  };
}

export function timeOperation(context, label, work) {
  const startedAt = now();
  const result = work();
  const finishedAt = now();

  context.timings[label] = Number(((context.timings[label] || 0) + (finishedAt - startedAt)).toFixed(3));

  return result;
}

export function withCachedResult(context, cacheName, key, work) {
  const cache = context.caches[cacheName];
  const stats = context.cacheStats[cacheName];

  if (cache.has(key)) {
    stats.hits += 1;
    return cache.get(key);
  }

  stats.misses += 1;
  const result = work();
  cache.set(key, result);

  return result;
}

export function summarizePerformance(context) {
  const totalHits = Object.values(context.cacheStats).reduce((sum, value) => sum + value.hits, 0);
  const totalMisses = Object.values(context.cacheStats).reduce((sum, value) => sum + value.misses, 0);
  const totalLookups = totalHits + totalMisses;

  return {
    mode: context.mode,
    timings: context.timings,
    cacheStats: context.cacheStats,
    cacheHitRate: totalLookups ? Number(((totalHits / totalLookups) * 100).toFixed(1)) : 0,
  };
}
