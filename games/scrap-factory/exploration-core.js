import { ITEMS, usedSlots } from './config.js';

export const EXPLORATION_VERSION = 1;
export const RESIDENTIAL_AREA_ID = 'residential';
export const INDUSTRIAL_AREA_ID = 'industrial';
export const RESIDENTIAL_BLUEPRINT_ID = 'scrap_yard_survey_blueprint';
export const INDUSTRIAL_BLUEPRINT_ID = 'abandoned_factory_assembly_blueprint';
export const EXPLORATION_MAX_SLOTS = 12;

export const EXPLORATION_AREAS = {
  residential: {
    id: RESIDENTIAL_AREA_ID,
    name: '廃住宅街',
    shortName: 'RESIDENTIAL BLOCK',
    requiredRank: 3,
    danger: 1,
    loot: ['copper_wire', 'plastic', 'e_waste'],
    recommended: '空き3枠以上 / 基本装備',
    objective: 'ガレージのヒューズを回収し、変電盤を復旧して調査Terminalを起動する。',
    zoneIds: ['entrance', 'row_houses', 'garage', 'substation'],
    scene: './exploration/residential.html',
    startPlayer: { x: 0, y: 1.7, z: 15, yaw: 0 },
  },
  industrial: {
    id: INDUSTRIAL_AREA_ID,
    name: '廃工場',
    shortName: 'ABANDONED FACTORY',
    requiredRank: 5,
    danger: 2,
    loot: ['e_waste', 'copper_wire', 'iron_plate'],
    recommended: '空き4枠以上 / 電気アークと蒸気噴出に注意',
    objective: '補助Generatorを復旧し、Control Roomを再起動して組立制御Blueprintを回収する。',
    zoneIds: ['arrival', 'generator_hall', 'assembly_floor', 'control_room'],
    scene: './exploration/industrial.html',
    startPlayer: { x: 0, y: 1.7, z: 18, yaw: 0 },
  },
};

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function uniqueStrings(value) {
  return Array.isArray(value) ? [...new Set(value.map(String))] : [];
}

function nonNegativeInt(value, fallback = 0) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function normalizeLoot(value) {
  const result = {};
  if (!isObject(value)) return result;
  for (const [itemId, amount] of Object.entries(value)) {
    if (!ITEMS[itemId]) continue;
    const count = nonNegativeInt(amount);
    if (count > 0) result[itemId] = count;
  }
  return result;
}

function defaultResidentialArea() {
  return {
    discoveredZones: [],
    objective: { fuseRecovered: false, powerRestored: false, surveyUploaded: false, completed: false },
    resourcePoints: [], visits: 0, successfulReturns: 0, returnedLootTotal: 0,
    completedAt: null, rewardClaimed: false,
  };
}

function defaultIndustrialArea() {
  return {
    discoveredZones: [],
    objective: { generatorRestored: false, controlRoomOnline: false, shortcutOpened: false, blueprintRecovered: false, completed: false },
    resourcePoints: [], visits: 0, successfulReturns: 0, returnedLootTotal: 0,
    completedAt: null, rewardClaimed: false,
  };
}

export function makeDefaultExploration() {
  return {
    version: EXPLORATION_VERSION,
    areas: { residential: defaultResidentialArea(), industrial: defaultIndustrialArea() },
    depot: {},
    activeSession: null,
  };
}

function normalizeAreaBase(candidate, base, definition) {
  const source = isObject(candidate) ? candidate : {};
  return {
    ...base,
    ...source,
    discoveredZones: uniqueStrings(source.discoveredZones).filter((id) => definition.zoneIds.includes(id)),
    resourcePoints: uniqueStrings(source.resourcePoints),
    visits: nonNegativeInt(source.visits),
    successfulReturns: nonNegativeInt(source.successfulReturns),
    returnedLootTotal: nonNegativeInt(source.returnedLootTotal),
    completedAt: typeof source.completedAt === 'string' ? source.completedAt : null,
    rewardClaimed: Boolean(source.rewardClaimed),
  };
}

function normalizeResidentialArea(candidate) {
  const source = normalizeAreaBase(candidate, defaultResidentialArea(), EXPLORATION_AREAS.residential);
  const objective = isObject(candidate?.objective) ? candidate.objective : {};
  return {
    ...source,
    objective: {
      fuseRecovered: Boolean(objective.fuseRecovered),
      powerRestored: Boolean(objective.powerRestored),
      surveyUploaded: Boolean(objective.surveyUploaded),
      completed: Boolean(objective.completed),
    },
  };
}

function normalizeIndustrialArea(candidate) {
  const source = normalizeAreaBase(candidate, defaultIndustrialArea(), EXPLORATION_AREAS.industrial);
  const objective = isObject(candidate?.objective) ? candidate.objective : {};
  return {
    ...source,
    objective: {
      generatorRestored: Boolean(objective.generatorRestored),
      controlRoomOnline: Boolean(objective.controlRoomOnline),
      shortcutOpened: Boolean(objective.shortcutOpened),
      blueprintRecovered: Boolean(objective.blueprintRecovered),
      completed: Boolean(objective.completed),
    },
  };
}

function normalizeSession(candidate) {
  if (!isObject(candidate) || !EXPLORATION_AREAS[candidate.areaId]) return null;
  const definition = EXPLORATION_AREAS[candidate.areaId];
  const player = isObject(candidate.player) ? candidate.player : {};
  const start = definition.startPlayer;
  return {
    id: String(candidate.id || `expedition-${Date.now()}`),
    areaId: definition.id,
    startedAt: typeof candidate.startedAt === 'string' ? candidate.startedAt : new Date().toISOString(),
    loot: normalizeLoot(candidate.loot),
    collectedLootIds: uniqueStrings(candidate.collectedLootIds),
    player: {
      x: Number.isFinite(Number(player.x)) ? Number(player.x) : start.x,
      y: Number.isFinite(Number(player.y)) ? Number(player.y) : start.y,
      z: Number.isFinite(Number(player.z)) ? Number(player.z) : start.z,
      yaw: Number.isFinite(Number(player.yaw)) ? Number(player.yaw) : start.yaw,
    },
  };
}

export function normalizeExploration(candidate) {
  if (!isObject(candidate)) return makeDefaultExploration();
  const areas = isObject(candidate.areas) ? candidate.areas : {};
  return {
    version: EXPLORATION_VERSION,
    areas: {
      residential: normalizeResidentialArea(areas.residential),
      industrial: normalizeIndustrialArea(areas.industrial),
    },
    depot: normalizeLoot(candidate.depot),
    activeSession: normalizeSession(candidate.activeSession),
  };
}

export function ensureExplorationState(game) {
  const normalized = normalizeExploration(game?.exploration);
  if (!game) return normalized;
  if (isObject(game.exploration)) {
    for (const key of Object.keys(game.exploration)) {
      if (!Object.prototype.hasOwnProperty.call(normalized, key)) delete game.exploration[key];
    }
    Object.assign(game.exploration, normalized);
    return game.exploration;
  }
  game.exploration = normalized;
  return game.exploration;
}

export function explorationAreaState(game, areaId = RESIDENTIAL_AREA_ID) {
  const exploration = ensureExplorationState(game);
  const definition = EXPLORATION_AREAS[areaId];
  if (!definition) return { exists: false, unlocked: false, reason: 'unknown', definition: null, progress: null };
  const rank = Math.max(1, Number(game?.progression?.progressionRank || 1));
  const progress = exploration.areas[areaId];
  if (rank < definition.requiredRank) return { exists: true, unlocked: false, reason: 'rank', definition, progress, requiredRank: definition.requiredRank };
  return { exists: true, unlocked: true, reason: null, definition, progress, requiredRank: definition.requiredRank };
}

function makeSession(areaId) {
  const start = EXPLORATION_AREAS[areaId].startPlayer;
  return {
    id: globalThis.crypto?.randomUUID ? `expedition-${crypto.randomUUID()}` : `expedition-${Date.now()}`,
    areaId,
    startedAt: new Date().toISOString(),
    loot: {},
    collectedLootIds: [],
    player: { ...start },
  };
}

export function startExpedition(game, areaId = RESIDENTIAL_AREA_ID) {
  const state = explorationAreaState(game, areaId);
  if (!state.unlocked) return { changed: false, reason: state.reason, state };
  const exploration = ensureExplorationState(game);
  if (exploration.activeSession) {
    if (exploration.activeSession.areaId === areaId) return { changed: false, reason: 'already-active', session: exploration.activeSession, state };
    return { changed: false, reason: 'other-active', session: exploration.activeSession, state };
  }
  const session = makeSession(areaId);
  exploration.activeSession = session;
  exploration.areas[areaId].visits += 1;
  return { changed: true, session, state: explorationAreaState(game, areaId) };
}

export function updateExplorationPlayer(game, player) {
  const exploration = ensureExplorationState(game);
  const session = exploration.activeSession;
  if (!session || !isObject(player)) return false;
  for (const key of ['x', 'y', 'z', 'yaw']) {
    const value = Number(player[key]);
    if (Number.isFinite(value)) session.player[key] = value;
  }
  return true;
}

export function discoverExplorationZone(game, zoneId) {
  const exploration = ensureExplorationState(game);
  const session = exploration.activeSession;
  if (!session) return { changed: false, reason: 'no-session' };
  const definition = EXPLORATION_AREAS[session.areaId];
  const area = exploration.areas[session.areaId];
  if (!definition?.zoneIds.includes(zoneId)) return { changed: false, reason: 'unknown-zone' };
  if (area.discoveredZones.includes(zoneId)) return { changed: false, reason: 'known-zone' };
  area.discoveredZones.push(zoneId);
  return { changed: true, zoneId, discovered: area.discoveredZones.length };
}

function canAddSessionLoot(session, itemId, amount = 1) {
  if (!session || !ITEMS[itemId]) return false;
  const simulated = { ...session.loot };
  for (let index = 0; index < Math.max(0, nonNegativeInt(amount)); index += 1) {
    const def = ITEMS[itemId];
    const current = Number(simulated[itemId] || 0);
    if (!(current > 0 && current % def.stack !== 0) && usedSlots(simulated) >= EXPLORATION_MAX_SLOTS) return false;
    simulated[itemId] = current + 1;
  }
  return true;
}

export function canAddExplorationLoot(game, itemId, amount = 1) {
  return canAddSessionLoot(ensureExplorationState(game).activeSession, itemId, amount);
}

export function collectExplorationLoot(game, lootId, itemId, amount = 1) {
  const exploration = ensureExplorationState(game);
  const session = exploration.activeSession;
  const count = Math.max(1, nonNegativeInt(amount, 1));
  if (!session) return { changed: false, reason: 'no-session' };
  if (!ITEMS[itemId]) return { changed: false, reason: 'unknown-item' };
  if (session.collectedLootIds.includes(String(lootId))) return { changed: false, reason: 'collected' };
  if (!canAddSessionLoot(session, itemId, count)) return { changed: false, reason: 'full' };
  session.loot[itemId] = Number(session.loot[itemId] || 0) + count;
  session.collectedLootIds.push(String(lootId));
  return { changed: true, itemId, amount: count, total: session.loot[itemId] };
}

function grantBlueprintReward(game, area, blueprintId, researchData, resourcePoint) {
  if (area.rewardClaimed) return false;
  game.progression ??= {};
  game.progression.blueprints = uniqueStrings(game.progression.blueprints);
  if (!game.progression.blueprints.includes(blueprintId)) game.progression.blueprints.push(blueprintId);
  game.progression.researchData = nonNegativeInt(game.progression.researchData) + researchData;
  if (resourcePoint && !area.resourcePoints.includes(resourcePoint)) area.resourcePoints.push(resourcePoint);
  area.rewardClaimed = true;
  return true;
}

export function advanceResidentialObjective(game, step) {
  const exploration = ensureExplorationState(game);
  if (!exploration.activeSession || exploration.activeSession.areaId !== RESIDENTIAL_AREA_ID) return { changed: false, reason: 'no-session', progress: exploration.areas.residential };
  const area = exploration.areas.residential;
  const objective = area.objective;
  if (step === 'fuse') {
    if (objective.fuseRecovered) return { changed: false, reason: 'done', progress: area };
    objective.fuseRecovered = true;
  } else if (step === 'power') {
    if (!objective.fuseRecovered) return { changed: false, reason: 'needs-fuse', progress: area };
    if (objective.powerRestored) return { changed: false, reason: 'done', progress: area };
    objective.powerRestored = true;
  } else if (step === 'survey') {
    if (!objective.powerRestored) return { changed: false, reason: 'needs-power', progress: area };
    if (objective.surveyUploaded) return { changed: false, reason: 'done', progress: area };
    objective.surveyUploaded = true;
    objective.completed = true;
    area.completedAt ||= new Date().toISOString();
    grantBlueprintReward(game, area, RESIDENTIAL_BLUEPRINT_ID, 1, 'residential-copper-network');
  } else return { changed: false, reason: 'unknown-step', progress: area };
  return { changed: true, step, completed: objective.completed, progress: area };
}

export function advanceIndustrialObjective(game, step) {
  const exploration = ensureExplorationState(game);
  if (!exploration.activeSession || exploration.activeSession.areaId !== INDUSTRIAL_AREA_ID) return { changed: false, reason: 'no-session', progress: exploration.areas.industrial };
  const area = exploration.areas.industrial;
  const objective = area.objective;
  if (step === 'generator') {
    if (objective.generatorRestored) return { changed: false, reason: 'done', progress: area };
    objective.generatorRestored = true;
  } else if (step === 'control') {
    if (!objective.generatorRestored) return { changed: false, reason: 'needs-generator', progress: area };
    if (objective.controlRoomOnline) return { changed: false, reason: 'done', progress: area };
    objective.controlRoomOnline = true;
  } else if (step === 'shortcut') {
    if (!objective.controlRoomOnline) return { changed: false, reason: 'needs-control', progress: area };
    if (objective.shortcutOpened) return { changed: false, reason: 'done', progress: area };
    objective.shortcutOpened = true;
  } else if (step === 'blueprint') {
    if (!objective.controlRoomOnline) return { changed: false, reason: 'needs-control', progress: area };
    if (objective.blueprintRecovered) return { changed: false, reason: 'done', progress: area };
    objective.blueprintRecovered = true;
    objective.completed = true;
    area.completedAt ||= new Date().toISOString();
    grantBlueprintReward(game, area, INDUSTRIAL_BLUEPRINT_ID, 2, 'industrial-electronics-cache');
  } else return { changed: false, reason: 'unknown-step', progress: area };
  return { changed: true, step, completed: objective.completed, progress: area };
}

function lootCount(loot) {
  return Object.values(loot || {}).reduce((sum, amount) => sum + nonNegativeInt(amount), 0);
}

export function returnFromExpedition(game) {
  const exploration = ensureExplorationState(game);
  const session = exploration.activeSession;
  if (!session) return { changed: false, reason: 'no-session', moved: 0 };
  const moved = lootCount(session.loot);
  for (const [itemId, amount] of Object.entries(session.loot)) exploration.depot[itemId] = Number(exploration.depot[itemId] || 0) + nonNegativeInt(amount);
  const area = exploration.areas[session.areaId];
  if (area) { area.successfulReturns += 1; area.returnedLootTotal += moved; }
  exploration.activeSession = null;
  return { changed: true, moved, depot: { ...exploration.depot } };
}

export function abandonExpedition(game) {
  const exploration = ensureExplorationState(game);
  const session = exploration.activeSession;
  if (!session) return { changed: false, reason: 'no-session', lost: 0 };
  const lost = lootCount(session.loot);
  exploration.activeSession = null;
  return { changed: true, lost };
}

function canAddFactoryInventory(inventory, itemId) {
  const def = ITEMS[itemId];
  if (!def) return false;
  const current = Number(inventory[itemId] || 0);
  if (current > 0 && current % def.stack !== 0) return true;
  return usedSlots(inventory) < EXPLORATION_MAX_SLOTS;
}

export function claimExplorationDepot(game) {
  const exploration = ensureExplorationState(game);
  game.inventory ??= {};
  let moved = 0;
  for (const itemId of Object.keys(exploration.depot)) {
    let remaining = nonNegativeInt(exploration.depot[itemId]);
    while (remaining > 0 && canAddFactoryInventory(game.inventory, itemId)) {
      game.inventory[itemId] = Number(game.inventory[itemId] || 0) + 1;
      remaining -= 1;
      moved += 1;
      game.discoveredItems ??= [];
      if (!game.discoveredItems.includes(itemId)) game.discoveredItems.push(itemId);
    }
    if (remaining > 0) exploration.depot[itemId] = remaining;
    else delete exploration.depot[itemId];
  }
  return { changed: moved > 0, moved, depot: { ...exploration.depot } };
}

export function explorationProgressSummary(game, areaId = RESIDENTIAL_AREA_ID) {
  const exploration = ensureExplorationState(game);
  const area = exploration.areas[areaId];
  const definition = EXPLORATION_AREAS[areaId];
  if (!area || !definition) return null;
  const discovered = area.discoveredZones.length;
  const zoneTotal = definition.zoneIds.length;
  return {
    completed: Boolean(area.objective?.completed),
    discovered,
    zoneTotal,
    discoveryRatio: zoneTotal ? discovered / zoneTotal : 0,
    resourcePoints: area.resourcePoints.length,
    returnedLootTotal: area.returnedLootTotal,
    successfulReturns: area.successfulReturns,
    active: exploration.activeSession?.areaId === areaId,
    depotItems: lootCount(exploration.depot),
    shortcutOpened: Boolean(area.objective?.shortcutOpened),
  };
}

export function residentialProgressSummary(game) {
  return explorationProgressSummary(game, RESIDENTIAL_AREA_ID);
}

export function industrialProgressSummary(game) {
  return explorationProgressSummary(game, INDUSTRIAL_AREA_ID);
}
