import { analyzeFinalAutomation } from './final-automation.js';
import { computePowerSnapshot } from './power.js';
import { storageRemaining } from './storage-capacity.js';
import { makeDefaultFinalChapter, normalizeFinalChapter } from './storage.js';

export const MEGA_FACTORY_STABLE_SECONDS = 180;

const CONDITION_LABELS = {
  finalAutomation: '最終製品の完全自動Line',
  noPowerShortage: 'Factory全体のPower Shortageなし',
  finalStorageAvailable: '最終Storageに空き容量あり',
  routeFlow: '最終RouteのThroughputあり',
};

function ensureFinalChapter(game) {
  if (!game || typeof game !== 'object') return makeDefaultFinalChapter();
  game.finalChapter = normalizeFinalChapter(game.finalChapter);
  return game.finalChapter;
}

function clearTimestamp(now) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

export function analyzeMegaFactory(game) {
  const finalAutomation = analyzeFinalAutomation(game);
  const power = computePowerSnapshot(game);
  const finalStorage = (game?.buildings || []).find((building) => building.id === finalAutomation.finalStorageId) || null;
  const conditions = {
    finalAutomation: finalAutomation.qualifies,
    noPowerShortage: power.status === 'ok',
    finalStorageAvailable: Boolean(finalStorage && storageRemaining(finalStorage) > 0),
    routeFlow: Number(finalAutomation.routeThroughput || 0) > 0,
  };
  const missing = Object.entries(conditions)
    .filter(([, done]) => !done)
    .map(([id]) => ({ id, label: CONDITION_LABELS[id] || id }));
  return {
    stable: Object.values(conditions).every(Boolean),
    conditions,
    missing,
    finalAutomation,
    power: {
      status: power.status,
      generation: power.generation,
      demand: power.demand,
      reserve: power.reserve,
    },
    finalStorageId: finalAutomation.finalStorageId,
    finalStorageRemaining: finalStorage ? storageRemaining(finalStorage) : 0,
    routeThroughput: finalAutomation.routeThroughput,
  };
}

export function advanceStableOperationState(candidate, stable, delta, now = new Date()) {
  const state = normalizeFinalChapter(candidate);
  const elapsed = Math.min(1, Math.max(0, Number(delta || 0)));
  const previous = Number(state.megaFactoryStableSeconds || 0);
  const previousBest = Number(state.megaFactoryBestSeconds || 0);
  let justCleared = false;

  if (state.mainClearedAt) {
    state.megaFactoryStableSeconds = Math.max(previous, MEGA_FACTORY_STABLE_SECONDS);
    state.megaFactoryBestSeconds = Math.max(previousBest, state.megaFactoryStableSeconds);
  } else if (stable && elapsed > 0) {
    state.megaFactoryStableSeconds = Math.min(MEGA_FACTORY_STABLE_SECONDS, previous + elapsed);
    state.megaFactoryBestSeconds = Math.max(previousBest, state.megaFactoryStableSeconds);
    if (state.megaFactoryStableSeconds >= MEGA_FACTORY_STABLE_SECONDS) {
      state.mainClearedAt = clearTimestamp(now);
      justCleared = true;
    }
  } else if (!stable && previous > 0) {
    state.megaFactoryBestSeconds = Math.max(previousBest, previous);
    state.megaFactoryStableSeconds = 0;
  }

  const stableSeconds = Math.max(0, Number(state.megaFactoryStableSeconds || 0));
  return {
    changed: stableSeconds !== previous || Number(state.megaFactoryBestSeconds || 0) !== previousBest || justCleared,
    justCleared,
    cleared: Boolean(state.mainClearedAt),
    state,
    progress: state.mainClearedAt ? 1 : Math.min(1, stableSeconds / MEGA_FACTORY_STABLE_SECONDS),
    remainingSeconds: state.mainClearedAt ? 0 : Math.max(0, MEGA_FACTORY_STABLE_SECONDS - stableSeconds),
  };
}

export function advanceMegaFactoryStability(game, delta, now = new Date()) {
  const analysis = analyzeMegaFactory(game);
  const result = advanceStableOperationState(ensureFinalChapter(game), analysis.stable, delta, now);
  if (game && typeof game === 'object') game.finalChapter = result.state;
  return { ...result, analysis };
}

export function acknowledgeMainClear(game, now = new Date()) {
  const state = ensureFinalChapter(game);
  if (!state.mainClearedAt || state.clearAcknowledgedAt) return false;
  state.clearAcknowledgedAt = clearTimestamp(now);
  return true;
}

export function finalPhaseStatus(game) {
  const state = ensureFinalChapter(game);
  const analysis = analyzeMegaFactory(game);
  const stableSeconds = Math.max(0, Number(state.megaFactoryStableSeconds || 0));
  return {
    state,
    analysis,
    cleared: Boolean(state.mainClearedAt),
    acknowledged: Boolean(state.clearAcknowledgedAt),
    stableSeconds,
    bestSeconds: Math.max(0, Number(state.megaFactoryBestSeconds || 0)),
    targetSeconds: MEGA_FACTORY_STABLE_SECONDS,
    progress: state.mainClearedAt ? 1 : Math.min(1, stableSeconds / MEGA_FACTORY_STABLE_SECONDS),
    remainingSeconds: state.mainClearedAt ? 0 : Math.max(0, MEGA_FACTORY_STABLE_SECONDS - stableSeconds),
  };
}
