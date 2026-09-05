import { SAVE_KEY, SAVE_SCHEMA_VERSION } from './config.js';
import { makeDefaultExploration, normalizeExploration } from './exploration.js';
import { makeDefaultProgression, normalizeProgression } from './progression.js';
import { HOME_RESPAWN_POSITION, makeDefaultHomeState, normalizeHomeState } from './home-system.js';

const DEFAULT_BUILDINGS = [
  { id: 'starter-hopper', type: 'hopper', x: -5, z: 0, rotation: 0, input: {}, output: {}, progress: 0, powerFuelSeconds: 0, powerStored: 0, logisticsCursor: 0, permanent: true },
  { id: 'starter-seller', type: 'seller', x: 7.5, z: 0, rotation: Math.PI, input: {}, output: {}, progress: 0, powerFuelSeconds: 0, powerStored: 0, logisticsCursor: 0, permanent: true },
];

const DEFAULT_FINAL_CHAPTER = Object.freeze({
  version: 1,
  megaFactoryStableSeconds: 0,
  megaFactoryBestSeconds: 0,
  mainClearedAt: null,
  clearAcknowledgedAt: null,
});

let runtimeRootRef = null;
let runtimeGameRef = null;

export function makeDefaultFinalChapter() {
  return { ...DEFAULT_FINAL_CHAPTER };
}

export function normalizeFinalChapter(candidate) {
  const base = makeDefaultFinalChapter();
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return base;
  const stable = Number(candidate.megaFactoryStableSeconds);
  const best = Number(candidate.megaFactoryBestSeconds);
  return {
    version: 1,
    megaFactoryStableSeconds: Number.isFinite(stable) ? Math.max(0, stable) : 0,
    megaFactoryBestSeconds: Number.isFinite(best) ? Math.max(0, best) : 0,
    mainClearedAt: typeof candidate.mainClearedAt === 'string' && candidate.mainClearedAt ? candidate.mainClearedAt : null,
    clearAcknowledgedAt: typeof candidate.clearAcknowledgedAt === 'string' && candidate.clearAcknowledgedAt ? candidate.clearAcknowledgedAt : null,
  };
}

export function makeDefaultRootSave() {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    revision: 1,
    updatedAt: new Date().toISOString(),
    profile: {
      totalPlayTimeSeconds: 0,
      lastPlayedGame: null,
      lastPlayedAt: null,
    },
    games: {
      'scrap-factory': makeDefaultGameSave(),
    },
  };
}

export function makeDefaultGameSave() {
  return {
    schemaVersion: 1,
    money: 40,
    lifetimeRevenue: 0,
    inventory: {
      metal_scrap: 0,
      copper_wire: 0,
      plastic: 0,
      e_waste: 0,
      crushed_metal: 0,
      iron_ingot: 0,
      iron_plate: 0,
      cable_bundle: 0,
      tool_kit: 0,
      circuit: 0,
      motor: 0,
      control_unit: 0,
      rare_alloy: 0,
      ai_control_module: 0,
      experimental_frame: 0,
      experimental_power_module: 0,
      autonomous_industrial_core: 0,
    },
    buildings: structuredClone(DEFAULT_BUILDINGS),
    tutorialStep: 0,
    tutorialStats: {
      movedToScrapyard: false,
      collected: 0,
      returned: false,
      processed: 0,
      automationComplete: false,
    },
    progression: makeDefaultProgression(),
    exploration: makeDefaultExploration(),
    finalChapter: makeDefaultFinalChapter(),
    home: makeDefaultHomeState({ existingSave: false }),
    player: { ...HOME_RESPAWN_POSITION },
    settings: {
      mouseSensitivity: 0.0022,
      masterVolume: 0.55,
      quality: 'high',
      showShortcuts: true,
      showFps: false,
      tutorialObjectives: true,
      contextualHints: true,
      stuckHelp: true,
      nextGoal: true,
      homeMarker: true,
      scannerKey: 'KeyQ',
    },
    discoveredItems: ['metal_scrap'],
    sessionCount: 0,
    playTimeSeconds: 0,
    lastPlayedAt: null,
  };
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeInventory(candidate, fallback) {
  const result = { ...fallback };
  if (!isObject(candidate)) return result;
  for (const key of Object.keys(result)) {
    const value = Number(candidate[key]);
    result[key] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : result[key];
  }
  return result;
}

function normalizeGame(candidate) {
  const base = makeDefaultGameSave();
  if (!isObject(candidate)) return base;
  const normalized = {
    ...base,
    ...candidate,
    money: Number.isFinite(Number(candidate.money)) ? Math.max(0, Math.floor(Number(candidate.money))) : base.money,
    lifetimeRevenue: Number.isFinite(Number(candidate.lifetimeRevenue)) ? Math.max(0, Math.floor(Number(candidate.lifetimeRevenue))) : 0,
    inventory: sanitizeInventory(candidate.inventory, base.inventory),
    buildings: Array.isArray(candidate.buildings) ? candidate.buildings.filter((b) => isObject(b) && typeof b.type === 'string' && Number.isFinite(Number(b.x)) && Number.isFinite(Number(b.z))).map((b) => ({
      id: String(b.id || crypto.randomUUID()),
      type: String(b.type),
      x: Number(b.x),
      z: Number(b.z),
      rotation: Number.isFinite(Number(b.rotation)) ? Number(b.rotation) : 0,
      input: isObject(b.input) ? b.input : {},
      output: isObject(b.output) ? b.output : {},
      progress: Number.isFinite(Number(b.progress)) ? Math.max(0, Number(b.progress)) : 0,
      powerFuelSeconds: Number.isFinite(Number(b.powerFuelSeconds)) ? Math.max(0, Number(b.powerFuelSeconds)) : 0,
      powerStored: Number.isFinite(Number(b.powerStored)) ? Math.max(0, Number(b.powerStored)) : 0,
      logisticsCursor: Number.isFinite(Number(b.logisticsCursor)) ? Math.max(0, Math.floor(Number(b.logisticsCursor))) : 0,
      resourcePointId: typeof b.resourcePointId === 'string' ? b.resourcePointId : null,
      permanent: Boolean(b.permanent),
    })) : structuredClone(base.buildings),
    tutorialStats: { ...base.tutorialStats, ...(isObject(candidate.tutorialStats) ? candidate.tutorialStats : {}) },
    finalChapter: normalizeFinalChapter(candidate.finalChapter),
    home: normalizeHomeState(candidate.home, { existingSave: !isObject(candidate.home), legacyGame: candidate }),
    player: { ...base.player, ...(isObject(candidate.player) ? candidate.player : {}) },
    settings: { ...base.settings, ...(isObject(candidate.settings) ? candidate.settings : {}) },
    discoveredItems: Array.isArray(candidate.discoveredItems) ? [...new Set(candidate.discoveredItems.map(String))] : base.discoveredItems,
  };
  normalized.progression = normalizeProgression(candidate.progression, normalized);
  normalized.exploration = normalizeExploration(candidate.exploration);
  return normalized;
}

function migrate(parsed) {
  if (!isObject(parsed)) throw new Error('セーブデータの形式が正しくありません。');
  if (parsed.schemaVersion !== SAVE_SCHEMA_VERSION) {
    throw new Error(`未対応のセーブバージョンです: ${parsed.schemaVersion ?? 'unknown'}`);
  }
  const base = makeDefaultRootSave();
  return {
    ...base,
    ...parsed,
    profile: { ...base.profile, ...(isObject(parsed.profile) ? parsed.profile : {}) },
    games: {
      ...base.games,
      ...(isObject(parsed.games) ? parsed.games : {}),
      'scrap-factory': normalizeGame(parsed.games?.['scrap-factory']),
    },
  };
}

export function loadRootSave() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return makeDefaultRootSave();
  try {
    return migrate(JSON.parse(raw));
  } catch (error) {
    console.warn('Save load failed. Falling back to defaults.', error);
    const recoveryKey = `${SAVE_KEY}-recovery-${Date.now()}`;
    try { localStorage.setItem(recoveryKey, raw); } catch { /* best effort */ }
    return makeDefaultRootSave();
  }
}

export function saveRootSave(root) {
  const next = {
    ...root,
    schemaVersion: SAVE_SCHEMA_VERSION,
    revision: Math.max(1, Number(root.revision || 0) + 1),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  return next;
}

export function loadGameSave() {
  const root = loadRootSave();
  const game = normalizeGame(root.games?.['scrap-factory']);
  runtimeRootRef = root;
  runtimeGameRef = game;
  return { root, game };
}

export function getRuntimeGame() {
  return runtimeGameRef;
}

export function saveGameSave(root, game) {
  const nextRoot = {
    ...root,
    games: { ...root.games, 'scrap-factory': normalizeGame(game) },
    profile: {
      ...root.profile,
      lastPlayedGame: 'scrap-factory',
      lastPlayedAt: new Date().toISOString(),
    },
  };
  const saved = saveRootSave(nextRoot);
  runtimeRootRef = saved;
  runtimeGameRef = game;
  return saved;
}

export function persistRuntimeGame() {
  if (!runtimeRootRef || !runtimeGameRef) return null;
  runtimeRootRef = saveGameSave(runtimeRootRef, runtimeGameRef);
  return runtimeRootRef;
}

export function resetGameSave() {
  const root = loadRootSave();
  root.games['scrap-factory'] = makeDefaultGameSave();
  runtimeGameRef = null;
  runtimeRootRef = null;
  return saveRootSave(root);
}

export function exportSaveText() {
  return JSON.stringify(loadRootSave(), null, 2);
}

export function importSaveText(text) {
  const parsed = JSON.parse(text);
  const normalized = migrate(parsed);
  const current = localStorage.getItem(SAVE_KEY);
  if (current) {
    try { localStorage.setItem(`${SAVE_KEY}-backup-${Date.now()}`, current); } catch { /* best effort */ }
  }
  runtimeGameRef = null;
  runtimeRootRef = null;
  return saveRootSave(normalized);
}
