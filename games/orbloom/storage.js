import { BIOMES, RESOURCE_ORDER, SPECIES } from './config.js';

export const SAVE_KEY = 'elitemay-orbloom-v1';
export const SAVE_SCHEMA = 1;

const nowIso = () => new Date().toISOString();
const safeNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function createDefaultSave() {
  const resources = Object.fromEntries(RESOURCE_ORDER.map((id) => [id, 0]));
  const generators = Object.fromEntries(RESOURCE_ORDER.map((id) => [id, 0]));
  const biomes = Object.fromEntries(Object.keys(BIOMES).map((id) => [id, { level: id === 'rocky' ? 1 : 0, evolution: 0 }]));
  const species = Object.fromEntries(SPECIES.map((entry) => [entry.id, {
    discovered: false,
    xp: 0,
    evolved: false,
    mutation: 'normal',
    biomeId: null,
  }]));
  const stamp = nowIso();
  return {
    schema: SAVE_SCHEMA,
    createdAt: stamp,
    lastSavedAt: stamp,
    lastPlayedAt: stamp,
    playTimeSeconds: 0,
    planetStage: 0,
    resources,
    generators,
    biomes,
    species,
    research: [],
    autoBuy: { matter: false, water: false, oxygen: false, energy: false },
    expedition: null,
    rareMaterials: { lunarShard: 0, ancientCore: 0, signalSeed: 0 },
    expeditionHistory: {},
    mainClearedAt: null,
    clearAcknowledgedAt: null,
    tutorialStep: 0,
    settings: { volume: 0.24, reducedMotion: false, quality: 'high' },
    stats: { manualMatter: 0, planetEvolutions: 0, upgradesBought: 0 },
  };
}

export function normalizeSave(input) {
  if (!input || typeof input !== 'object') return createDefaultSave();
  if (safeNumber(input.schema, SAVE_SCHEMA) > SAVE_SCHEMA) throw new Error('このセーブは新しいOrbloomで作成されています。');
  const base = createDefaultSave();
  const next = {
    ...base,
    ...input,
    schema: SAVE_SCHEMA,
    resources: { ...base.resources },
    generators: { ...base.generators },
    biomes: { ...base.biomes },
    species: { ...base.species },
    rareMaterials: { ...base.rareMaterials },
    expeditionHistory: input.expeditionHistory && typeof input.expeditionHistory === 'object' ? { ...input.expeditionHistory } : {},
    settings: { ...base.settings, ...(input.settings || {}) },
    autoBuy: { ...base.autoBuy, ...(input.autoBuy || {}) },
    stats: { ...base.stats, ...(input.stats || {}) },
  };

  for (const id of RESOURCE_ORDER) {
    next.resources[id] = Math.max(0, safeNumber(input.resources?.[id], 0));
    next.generators[id] = Math.max(0, Math.floor(safeNumber(input.generators?.[id], 0)));
  }
  for (const id of Object.keys(BIOMES)) {
    next.biomes[id] = {
      level: Math.max(id === 'rocky' ? 1 : 0, Math.floor(safeNumber(input.biomes?.[id]?.level, base.biomes[id].level))),
      evolution: Math.max(0, Math.min(2, Math.floor(safeNumber(input.biomes?.[id]?.evolution, 0)))),
    };
  }
  for (const entry of SPECIES) {
    const source = input.species?.[entry.id] || {};
    next.species[entry.id] = {
      discovered: Boolean(source.discovered),
      xp: Math.max(0, safeNumber(source.xp, 0)),
      evolved: Boolean(source.evolved),
      mutation: ['normal', 'golden', 'crystal'].includes(source.mutation) ? source.mutation : 'normal',
      biomeId: Object.hasOwn(BIOMES, source.biomeId) ? source.biomeId : null,
    };
  }
  next.planetStage = Math.max(0, Math.min(6, Math.floor(safeNumber(input.planetStage, 0))));
  next.playTimeSeconds = Math.max(0, safeNumber(input.playTimeSeconds, 0));
  next.research = Array.isArray(input.research) ? [...new Set(input.research.filter((id) => typeof id === 'string'))] : [];
  for (const id of Object.keys(next.rareMaterials)) next.rareMaterials[id] = Math.max(0, Math.floor(safeNumber(input.rareMaterials?.[id], 0)));
  next.tutorialStep = Math.max(0, Math.floor(safeNumber(input.tutorialStep, 0)));
  next.settings.volume = Math.max(0, Math.min(1, safeNumber(next.settings.volume, 0.24)));
  next.settings.reducedMotion = Boolean(next.settings.reducedMotion);
  next.settings.quality = ['low', 'high'].includes(next.settings.quality) ? next.settings.quality : 'high';
  if (input.expedition && typeof input.expedition === 'object') {
    next.expedition = {
      id: String(input.expedition.id || ''),
      focus: String(input.expedition.focus || 'mineral'),
      speciesId: String(input.expedition.speciesId || ''),
      launchedAt: String(input.expedition.launchedAt || nowIso()),
      endsAt: String(input.expedition.endsAt || nowIso()),
      collected: Boolean(input.expedition.collected),
    };
  }
  return next;
}

export function loadSave(storage = globalThis.localStorage) {
  const fallback = createDefaultSave();
  if (!storage) return { state: fallback, elapsedSeconds: 0 };
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return { state: fallback, elapsedSeconds: 0 };
  try {
    const parsed = JSON.parse(raw);
    const state = normalizeSave(parsed);
    const last = Date.parse(state.lastSavedAt || state.lastPlayedAt || '');
    const elapsedSeconds = Number.isFinite(last) ? Math.max(0, Math.min(7 * 86400, (Date.now() - last) / 1000)) : 0;
    return { state, elapsedSeconds };
  } catch (error) {
    console.warn('Orbloom save could not be loaded:', error);
    return { state: fallback, elapsedSeconds: 0, error };
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  const normalized = normalizeSave(state);
  normalized.lastSavedAt = nowIso();
  normalized.lastPlayedAt = normalized.lastSavedAt;
  if (storage) storage.setItem(SAVE_KEY, JSON.stringify(normalized));
  Object.assign(state, normalized);
  return normalized;
}

export function exportSaveText(state) {
  return JSON.stringify(normalizeSave(state), null, 2);
}

export function importSaveText(text, storage = globalThis.localStorage) {
  const parsed = JSON.parse(text);
  const state = normalizeSave(parsed);
  state.lastSavedAt = nowIso();
  if (storage) storage.setItem(SAVE_KEY, JSON.stringify(state));
  return state;
}

export function resetSave(storage = globalThis.localStorage) {
  if (storage) storage.removeItem(SAVE_KEY);
  return createDefaultSave();
}
