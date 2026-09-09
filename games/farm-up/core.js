import {
  CROPS,
  FARM_LEVEL_THRESHOLDS,
  LAND,
  SAVE_SCHEMA_VERSION,
  SEASONS,
  TOOL_UPGRADE,
  TUTORIAL_STEPS,
  WEATHER,
} from './config.js';

const cropById = new Map(CROPS.map((crop) => [crop.id, crop]));
const weatherIds = new Set(WEATHER.map((weather) => weather.id));
const seasonIds = new Set(SEASONS.map((season) => season.id));

export function tileId(x, z) {
  return `${x}:${z}`;
}

export function parseTileId(id) {
  const [x, z] = String(id).split(':').map(Number);
  return { x, z };
}

export function createTileMap() {
  const tiles = {};
  for (let z = 0; z < LAND.expandedDepth; z += 1) {
    for (let x = 0; x < LAND.expandedWidth; x += 1) {
      tiles[tileId(x, z)] = { soil: 'grass', cropId: null, growthMs: 0, watered: false, harvested: 0 };
    }
  }
  return tiles;
}

export function createInitialState(now = Date.now()) {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    revision: 0,
    money: 490,
    xp: 0,
    farmLevel: 1,
    landLevel: 1,
    selectedTool: 'hoe',
    selectedCropId: 'wheat',
    toolLevels: { hoe: 1, water: 1 },
    inventory: Object.fromEntries(CROPS.map((crop) => [crop.id, 0])),
    lifetimeRevenue: 0,
    lifetimeHarvests: 0,
    tiles: createTileMap(),
    tutorialStep: 0,
    dayNumber: 1,
    timeMinutes: 8 * 60,
    seasonId: 'spring',
    weatherId: 'sunny',
    weatherElapsedMs: 0,
    playTimeSeconds: 0,
    lastPlayedAt: null,
    lastSimulationAt: now,
    settings: { sensitivity: 0.75, reducedMotion: false, cameraDistance: 7.5 },
  };
}

export function getFarmLevel(xp) {
  const value = Math.max(0, Number(xp) || 0);
  let level = 1;
  for (let index = 0; index < FARM_LEVEL_THRESHOLDS.length; index += 1) {
    if (value >= FARM_LEVEL_THRESHOLDS[index]) level = index + 1;
  }
  return level;
}

export function getLevelProgress(state) {
  const level = getFarmLevel(state.xp);
  const current = FARM_LEVEL_THRESHOLDS[level - 1] ?? 0;
  const next = FARM_LEVEL_THRESHOLDS[level] ?? current + 500;
  return { level, current, next, earned: Math.max(0, state.xp - current), required: Math.max(1, next - current) };
}

export function isTileUnlocked(state, id) {
  const { x, z } = parseTileId(id);
  const width = Number(state.landLevel || 1) >= 2 ? LAND.expandedWidth : LAND.initialWidth;
  return x >= 0 && z >= 0 && x < width && z < LAND.initialDepth;
}

export function getUnlockedCrops(state) {
  const level = getFarmLevel(state.xp);
  return CROPS.filter((crop) => crop.unlockLevel <= level);
}

export function normalizeState(raw, now = Date.now()) {
  const base = createInitialState(now);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  if (Number(raw.schemaVersion) > SAVE_SCHEMA_VERSION) throw new Error('future-schema');

  const state = {
    ...base,
    ...raw,
    schemaVersion: SAVE_SCHEMA_VERSION,
    revision: Math.max(0, Math.floor(Number(raw.revision) || 0)),
    money: Math.max(0, Number(raw.money) || 0),
    xp: Math.max(0, Number(raw.xp) || 0),
    landLevel: Math.min(2, Math.max(1, Math.floor(Number(raw.landLevel) || 1))),
    tutorialStep: Math.min(TUTORIAL_STEPS.length, Math.max(0, Math.floor(Number(raw.tutorialStep) || 0))),
    dayNumber: Math.max(1, Math.floor(Number(raw.dayNumber) || 1)),
    timeMinutes: Math.max(0, Number(raw.timeMinutes) || 0) % 1440,
    weatherElapsedMs: Math.max(0, Number(raw.weatherElapsedMs) || 0),
    playTimeSeconds: Math.max(0, Number(raw.playTimeSeconds) || 0),
    lifetimeRevenue: Math.max(0, Number(raw.lifetimeRevenue) || 0),
    lifetimeHarvests: Math.max(0, Math.floor(Number(raw.lifetimeHarvests) || 0)),
    lastSimulationAt: Number(raw.lastSimulationAt) || now,
    settings: { ...base.settings, ...(raw.settings && typeof raw.settings === 'object' ? raw.settings : {}) },
  };

  state.farmLevel = getFarmLevel(state.xp);
  state.seasonId = seasonIds.has(raw.seasonId) ? raw.seasonId : SEASONS[Math.floor((state.dayNumber - 1) / 4) % SEASONS.length].id;
  state.weatherId = weatherIds.has(raw.weatherId) ? raw.weatherId : 'sunny';
  state.selectedTool = ['hoe', 'seed', 'water', 'harvest'].includes(raw.selectedTool) ? raw.selectedTool : 'hoe';
  state.selectedCropId = cropById.has(raw.selectedCropId) ? raw.selectedCropId : 'wheat';
  if (!getUnlockedCrops(state).some((crop) => crop.id === state.selectedCropId)) state.selectedCropId = 'wheat';
  state.toolLevels = {
    hoe: Math.min(TOOL_UPGRADE.maxLevel, Math.max(1, Math.floor(Number(raw.toolLevels?.hoe) || 1))),
    water: Math.min(TOOL_UPGRADE.maxLevel, Math.max(1, Math.floor(Number(raw.toolLevels?.water) || 1))),
  };
  state.inventory = Object.fromEntries(CROPS.map((crop) => [crop.id, Math.max(0, Math.floor(Number(raw.inventory?.[crop.id]) || 0))]));

  const baseTiles = createTileMap();
  for (const id of Object.keys(baseTiles)) {
    const incoming = raw.tiles?.[id];
    if (!incoming || typeof incoming !== 'object') continue;
    const cropId = cropById.has(incoming.cropId) ? incoming.cropId : null;
    baseTiles[id] = {
      soil: incoming.soil === 'tilled' ? 'tilled' : 'grass',
      cropId,
      growthMs: cropId ? Math.max(0, Number(incoming.growthMs) || 0) : 0,
      watered: cropId ? Boolean(incoming.watered) : false,
      harvested: Math.max(0, Math.floor(Number(incoming.harvested) || 0)),
    };
  }
  state.tiles = baseTiles;
  return state;
}

export function validateState(state) {
  if (!state || typeof state !== 'object') return false;
  if (state.schemaVersion !== SAVE_SCHEMA_VERSION) return false;
  if (!Number.isFinite(state.money) || state.money < 0) return false;
  if (!Number.isFinite(state.xp) || state.xp < 0) return false;
  if (![1, 2].includes(state.landLevel)) return false;
  if (!state.tiles || typeof state.tiles !== 'object') return false;
  if (Object.keys(state.tiles).length !== LAND.expandedWidth * LAND.expandedDepth) return false;
  return Object.values(state.tiles).every((tile) => tile && ['grass', 'tilled'].includes(tile.soil) && (!tile.cropId || cropById.has(tile.cropId)));
}

function addXp(state, amount) {
  const before = getFarmLevel(state.xp);
  state.xp = Math.max(0, state.xp + Math.max(0, Number(amount) || 0));
  state.farmLevel = getFarmLevel(state.xp);
  return state.farmLevel > before;
}

export function tutorialEvent(state, eventId) {
  const expected = TUTORIAL_STEPS[state.tutorialStep];
  if (expected?.id !== eventId) return false;
  state.tutorialStep += 1;
  return true;
}

export function getActionTileIds(state, originId, toolId = state.selectedTool) {
  if (!isTileUnlocked(state, originId)) return [];
  const level = toolId === 'hoe' ? state.toolLevels.hoe : toolId === 'water' ? state.toolLevels.water : 1;
  if (level < 2) return [originId];
  const { x, z } = parseTileId(originId);
  return [tileId(x, z), tileId(x + 1, z), tileId(x - 1, z), tileId(x, z + 1), tileId(x, z - 1)]
    .filter((nextId) => state.tiles[nextId] && isTileUnlocked(state, nextId));
}

export function tillTile(state, id) {
  if (!isTileUnlocked(state, id)) return { ok: false, reason: 'まだ購入していない土地です' };
  const tile = state.tiles[id];
  if (!tile || tile.cropId) return { ok: false, reason: '作物がある区画は耕せません' };
  if (tile.soil === 'tilled') return { ok: false, reason: 'すでに耕してあります' };
  tile.soil = 'tilled';
  tile.watered = false;
  tutorialEvent(state, 'till');
  return { ok: true, message: '土を耕しました' };
}

export function plantTile(state, id, cropId = state.selectedCropId) {
  if (!isTileUnlocked(state, id)) return { ok: false, reason: 'まだ購入していない土地です' };
  const tile = state.tiles[id];
  const crop = cropById.get(cropId);
  if (!tile || tile.soil !== 'tilled') return { ok: false, reason: '先に土を耕してください' };
  if (tile.cropId) return { ok: false, reason: 'すでに作物があります' };
  if (!crop) return { ok: false, reason: '作物が見つかりません' };
  if (crop.unlockLevel > getFarmLevel(state.xp)) return { ok: false, reason: `Farm Lv${crop.unlockLevel}で解放されます` };
  if (state.money < crop.seedCost) return { ok: false, reason: `種代 ¥${crop.seedCost} が必要です` };
  state.money -= crop.seedCost;
  tile.cropId = crop.id;
  tile.growthMs = 0;
  tile.watered = false;
  tutorialEvent(state, 'plant');
  return { ok: true, message: `${crop.name}を植えました` };
}

export function waterTile(state, id) {
  if (!isTileUnlocked(state, id)) return { ok: false, reason: 'まだ購入していない土地です' };
  const tile = state.tiles[id];
  if (!tile || tile.soil !== 'tilled') return { ok: false, reason: '畑の区画を狙ってください' };
  if (tile.watered) return { ok: false, reason: '十分に水があります' };
  tile.watered = true;
  tutorialEvent(state, 'water');
  return { ok: true, message: tile.cropId ? '作物に水をやりました' : '土を湿らせました' };
}

export function getCropProgress(state, id) {
  const tile = state.tiles[id];
  const crop = tile?.cropId ? cropById.get(tile.cropId) : null;
  if (!tile || !crop) return { crop: null, ratio: 0, ready: false, stage: 0 };
  const ratio = Math.min(1, tile.growthMs / crop.growthMs);
  const stage = ratio >= 1 ? 4 : ratio >= 0.7 ? 3 : ratio >= 0.35 ? 2 : ratio > 0 ? 1 : 0;
  return { crop, ratio, ready: ratio >= 1, stage };
}

export function harvestTile(state, id) {
  if (!isTileUnlocked(state, id)) return { ok: false, reason: 'まだ購入していない土地です' };
  const tile = state.tiles[id];
  const progress = getCropProgress(state, id);
  if (!progress.crop) return { ok: false, reason: '収穫できる作物がありません' };
  if (!progress.ready) return { ok: false, reason: `成長中 ${Math.floor(progress.ratio * 100)}%` };
  const crop = progress.crop;
  state.inventory[crop.id] += 1;
  state.lifetimeHarvests += 1;
  tile.cropId = null;
  tile.growthMs = 0;
  tile.watered = false;
  tile.harvested += 1;
  const leveled = addXp(state, crop.xp);
  tutorialEvent(state, 'harvest');
  return { ok: true, message: `${crop.name}を収穫 +1`, leveled };
}

export function inventoryValue(state) {
  return CROPS.reduce((total, crop) => total + (state.inventory[crop.id] || 0) * crop.sellPrice, 0);
}

export function sellInventory(state) {
  const total = inventoryValue(state);
  if (total <= 0) return { ok: false, reason: '出荷できる収穫物がありません', total: 0 };
  for (const crop of CROPS) state.inventory[crop.id] = 0;
  state.money += total;
  state.lifetimeRevenue += total;
  const leveled = addXp(state, Math.max(8, Math.floor(total * 0.12)));
  tutorialEvent(state, 'ship');
  return { ok: true, total, leveled, message: `出荷完了 +¥${Math.floor(total).toLocaleString('ja-JP')}` };
}

export function purchaseLandExpansion(state) {
  if (state.landLevel >= 2) return { ok: false, reason: 'MVPの土地拡張は購入済みです' };
  if (state.money < LAND.expansionCost) return { ok: false, reason: `土地購入に ¥${LAND.expansionCost.toLocaleString('ja-JP')} 必要です` };
  state.money -= LAND.expansionCost;
  state.landLevel = 2;
  const leveled = addXp(state, LAND.expansionXp);
  tutorialEvent(state, 'expand');
  return { ok: true, leveled, message: '東側の農地区画を購入しました' };
}

export function upgradeTools(state) {
  if (state.toolLevels.hoe >= TOOL_UPGRADE.maxLevel && state.toolLevels.water >= TOOL_UPGRADE.maxLevel) return { ok: false, reason: 'MVPの農具強化は最大です' };
  if (state.money < TOOL_UPGRADE.cost) return { ok: false, reason: `農具強化に ¥${TOOL_UPGRADE.cost.toLocaleString('ja-JP')} 必要です` };
  state.money -= TOOL_UPGRADE.cost;
  state.toolLevels.hoe = TOOL_UPGRADE.maxLevel;
  state.toolLevels.water = TOOL_UPGRADE.maxLevel;
  const leveled = addXp(state, TOOL_UPGRADE.xp);
  return { ok: true, leveled, message: 'クワとじょうろが範囲作業に対応しました' };
}

function growthMultiplier(state, crop) {
  let multiplier = crop.season === state.seasonId ? 1.15 : 0.8;
  if (state.seasonId === 'winter') multiplier *= 0.78;
  if (state.weatherId === 'sunny') multiplier *= 1.05;
  return multiplier;
}

export function advanceSimulation(state, elapsedMs, now = Date.now(), rng = Math.random) {
  const elapsed = Math.max(0, Math.min(Number(elapsedMs) || 0, 10 * 60 * 1000));
  if (elapsed <= 0) return state;
  state.playTimeSeconds += elapsed / 1000;
  state.timeMinutes += elapsed / 1000 * 3.2;
  while (state.timeMinutes >= 1440) {
    state.timeMinutes -= 1440;
    state.dayNumber += 1;
    state.seasonId = SEASONS[Math.floor((state.dayNumber - 1) / 4) % SEASONS.length].id;
  }
  state.weatherElapsedMs += elapsed;
  if (state.weatherElapsedMs >= 90000) {
    state.weatherElapsedMs %= 90000;
    const nextIndex = Math.min(WEATHER.length - 1, Math.floor(Math.max(0, Math.min(0.999999, rng())) * WEATHER.length));
    state.weatherId = WEATHER[nextIndex].id;
  }
  const raining = state.weatherId === 'rain' || state.weatherId === 'heavy-rain';
  for (const [id, tile] of Object.entries(state.tiles)) {
    if (!isTileUnlocked(state, id) || !tile.cropId) continue;
    const crop = cropById.get(tile.cropId);
    if (crop && (tile.watered || raining)) tile.growthMs = Math.min(crop.growthMs, tile.growthMs + elapsed * growthMultiplier(state, crop));
  }
  state.lastSimulationAt = now;
  return state;
}

export function getTutorial(state) {
  return {
    completed: state.tutorialStep >= TUTORIAL_STEPS.length,
    step: TUTORIAL_STEPS[state.tutorialStep] || null,
    index: state.tutorialStep,
    total: TUTORIAL_STEPS.length,
  };
}

export function getFarmSummary(state) {
  return {
    planted: Object.values(state.tiles).filter((tile) => tile.cropId).length,
    ready: Object.keys(state.tiles).filter((id) => getCropProgress(state, id).ready).length,
    unlockedTiles: Object.keys(state.tiles).filter((id) => isTileUnlocked(state, id)).length,
    inventoryValue: inventoryValue(state),
    level: getFarmLevel(state.xp),
  };
}
