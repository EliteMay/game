import { ITEMS, usedSlots } from './config.js';
import { HOME_RESPAWN_POSITION, backpackSlotCapacity, ensureHomeState } from './home-system.js';

export const EXPLORATION_VERSION = 1;
export const RESIDENTIAL_AREA_ID = 'residential';
export const INDUSTRIAL_AREA_ID = 'industrial';
export const MILITARY_AREA_ID = 'military';
export const RESEARCH_AREA_ID = 'research';
export const RESIDENTIAL_BLUEPRINT_ID = 'scrap_yard_survey_blueprint';
export const INDUSTRIAL_BLUEPRINT_ID = 'abandoned_factory_assembly_blueprint';
export const MILITARY_BLUEPRINT_ID = 'military_drone_control_blueprint';
export const EXPLORATION_MAX_SLOTS = 12;

export const RESEARCH_COMPONENTS = {
  robotics: {
    id: 'robotics-control-core',
    labId: 'robotics',
    name: 'AI制御コア試作機',
    shortName: 'AI CORE',
    description: 'Robotics Labから回収したExperimental Tier用の制御中枢。',
  },
  materials: {
    id: 'materials-alloy-sample',
    labId: 'materials',
    name: '実験合金サンプル',
    shortName: 'ALLOY SAMPLE',
    description: 'Materials Labの高耐熱・高強度材サンプル。',
  },
  energy: {
    id: 'energy-cell-prototype',
    labId: 'energy',
    name: '高密度Energy Cell試作機',
    shortName: 'ENERGY CELL',
    description: 'Energy Labから回収したExperimental Power用試作Cell。',
  },
};

const RESEARCH_COMPONENT_IDS = new Set(Object.values(RESEARCH_COMPONENTS).map((entry) => entry.id));

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
  military: {
    id: MILITARY_AREA_ID,
    name: '軍事施設',
    shortName: 'SECURITY FACILITY',
    requiredRank: 6,
    danger: 3,
    loot: ['e_waste', 'control_unit', 'rare_alloy'],
    recommended: '空き4枠以上 / Security TurretはAccess Cardで電源遮断可能',
    objective: 'CheckpointでAccess Cardを回収し、Security Gridを停止してDrone Control BayからBlueprintを回収する。',
    zoneIds: ['checkpoint', 'security_yard', 'drone_bay', 'command_bunker'],
    scene: './exploration/military.html',
    startPlayer: { x: 0, y: 1.7, z: 20, yaw: 0 },
  },
  research: {
    id: RESEARCH_AREA_ID,
    name: '崩壊した研究施設',
    shortName: 'RUINED RESEARCH FACILITY',
    requiredRank: 7,
    danger: 4,
    loot: ['control_unit', 'rare_alloy', 'e_waste'],
    recommended: '空き4枠以上 / 3 Labの環境Hazardは中央Access Relay復旧後に攻略',
    objective: '中央Access Relayを復旧し、Robotics / Materials / Energy Labの技術と特殊部品を回収して正常帰還する。',
    zoneIds: ['atrium', 'robotics_lab', 'materials_lab', 'energy_lab', 'central_core'],
    scene: './exploration/research.html',
    startPlayer: { x: 0, y: 1.7, z: 20, yaw: 0 },
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

function baseArea(objective) {
  return {
    discoveredZones: [],
    objective,
    resourcePoints: [],
    visits: 0,
    successfulReturns: 0,
    returnedLootTotal: 0,
    completedAt: null,
    rewardClaimed: false,
  };
}

function defaultResidentialArea() {
  return baseArea({ fuseRecovered: false, powerRestored: false, surveyUploaded: false, completed: false });
}

function defaultIndustrialArea() {
  return baseArea({ generatorRestored: false, controlRoomOnline: false, shortcutOpened: false, blueprintRecovered: false, completed: false });
}

function defaultMilitaryArea() {
  return baseArea({
    accessCardRecovered: false,
    securityGridOffline: false,
    droneBayOnline: false,
    shortcutOpened: false,
    blueprintRecovered: false,
    completed: false,
  });
}

function defaultResearchArea() {
  return {
    ...baseArea({
      accessRelayOnline: false,
      roboticsRecovered: false,
      materialsRecovered: false,
      energyRecovered: false,
      labsCompleted: false,
      shortcutOpened: false,
      centralCoreUnlocked: false,
      completed: false,
    }),
    securedComponents: [],
  };
}

export function makeDefaultExploration() {
  return {
    version: EXPLORATION_VERSION,
    areas: {
      residential: defaultResidentialArea(),
      industrial: defaultIndustrialArea(),
      military: defaultMilitaryArea(),
      research: defaultResearchArea(),
    },
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

function normalizeMilitaryArea(candidate) {
  const source = normalizeAreaBase(candidate, defaultMilitaryArea(), EXPLORATION_AREAS.military);
  const objective = isObject(candidate?.objective) ? candidate.objective : {};
  return {
    ...source,
    objective: {
      accessCardRecovered: Boolean(objective.accessCardRecovered),
      securityGridOffline: Boolean(objective.securityGridOffline),
      droneBayOnline: Boolean(objective.droneBayOnline),
      shortcutOpened: Boolean(objective.shortcutOpened),
      blueprintRecovered: Boolean(objective.blueprintRecovered),
      completed: Boolean(objective.completed),
    },
  };
}

function normalizeResearchArea(candidate) {
  const source = normalizeAreaBase(candidate, defaultResearchArea(), EXPLORATION_AREAS.research);
  const objective = isObject(candidate?.objective) ? candidate.objective : {};
  const roboticsRecovered = Boolean(objective.roboticsRecovered);
  const materialsRecovered = Boolean(objective.materialsRecovered);
  const energyRecovered = Boolean(objective.energyRecovered);
  return {
    ...source,
    securedComponents: uniqueStrings(candidate?.securedComponents).filter((id) => RESEARCH_COMPONENT_IDS.has(id)),
    objective: {
      accessRelayOnline: Boolean(objective.accessRelayOnline),
      roboticsRecovered,
      materialsRecovered,
      energyRecovered,
      labsCompleted: Boolean(objective.labsCompleted) || (roboticsRecovered && materialsRecovered && energyRecovered),
      shortcutOpened: Boolean(objective.shortcutOpened),
      centralCoreUnlocked: Boolean(objective.centralCoreUnlocked),
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
    researchCargo: uniqueStrings(candidate.researchCargo).filter((id) => RESEARCH_COMPONENT_IDS.has(id)),
    hp: Math.max(0, Math.min(100, Number.isFinite(Number(candidate.hp)) ? Number(candidate.hp) : 100)),
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
      military: normalizeMilitaryArea(areas.military),
      research: normalizeResearchArea(areas.research),
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
    researchCargo: [],
    hp: 100,
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
  const session = ensureExplorationState(game).activeSession;
  if (!session || !isObject(player)) return false;
  for (const key of ['x', 'y', 'z', 'yaw']) {
    const value = Number(player[key]);
    if (Number.isFinite(value)) session.player[key] = value;
  }
  return true;
}

export function updateExplorationHealth(game, hp) {
  const session = ensureExplorationState(game).activeSession;
  if (!session) return false;
  const value = Number(hp);
  if (!Number.isFinite(value)) return false;
  session.hp = Math.max(0, Math.min(100, value));
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

function canAddSessionLoot(game, session, itemId, amount = 1) {
  if (!session || !ITEMS[itemId]) return false;
  const simulated = { ...session.loot };
  for (let index = 0; index < Math.max(0, nonNegativeInt(amount)); index += 1) {
    const def = ITEMS[itemId];
    const current = Number(simulated[itemId] || 0);
    if (!(current > 0 && current % def.stack !== 0) && usedSlots(simulated) >= backpackSlotCapacity(game, EXPLORATION_MAX_SLOTS)) return false;
    simulated[itemId] = current + 1;
  }
  return true;
}

export function canAddExplorationLoot(game, itemId, amount = 1) {
  return canAddSessionLoot(game, ensureExplorationState(game).activeSession, itemId, amount);
}

export function collectExplorationLoot(game, lootId, itemId, amount = 1) {
  const exploration = ensureExplorationState(game);
  const session = exploration.activeSession;
  const count = Math.max(1, nonNegativeInt(amount, 1));
  if (!session) return { changed: false, reason: 'no-session' };
  if (!ITEMS[itemId]) return { changed: false, reason: 'unknown-item' };
  if (session.collectedLootIds.includes(String(lootId))) return { changed: false, reason: 'collected' };
  if (!canAddSessionLoot(game, session, itemId, count)) return { changed: false, reason: 'full' };
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

export function advanceMilitaryObjective(game, step) {
  const exploration = ensureExplorationState(game);
  if (!exploration.activeSession || exploration.activeSession.areaId !== MILITARY_AREA_ID) return { changed: false, reason: 'no-session', progress: exploration.areas.military };
  const area = exploration.areas.military;
  const objective = area.objective;
  if (step === 'access') {
    if (objective.accessCardRecovered) return { changed: false, reason: 'done', progress: area };
    objective.accessCardRecovered = true;
  } else if (step === 'security') {
    if (!objective.accessCardRecovered) return { changed: false, reason: 'needs-access', progress: area };
    if (objective.securityGridOffline) return { changed: false, reason: 'done', progress: area };
    objective.securityGridOffline = true;
  } else if (step === 'drone') {
    if (!objective.securityGridOffline) return { changed: false, reason: 'needs-security', progress: area };
    if (objective.droneBayOnline) return { changed: false, reason: 'done', progress: area };
    objective.droneBayOnline = true;
  } else if (step === 'shortcut') {
    if (!objective.securityGridOffline) return { changed: false, reason: 'needs-security', progress: area };
    if (objective.shortcutOpened) return { changed: false, reason: 'done', progress: area };
    objective.shortcutOpened = true;
  } else if (step === 'blueprint') {
    if (!objective.droneBayOnline) return { changed: false, reason: 'needs-drone', progress: area };
    if (objective.blueprintRecovered) return { changed: false, reason: 'done', progress: area };
    objective.blueprintRecovered = true;
    objective.completed = true;
    area.completedAt ||= new Date().toISOString();
    grantBlueprintReward(game, area, MILITARY_BLUEPRINT_ID, 3, 'military-alloy-cache');
  } else return { changed: false, reason: 'unknown-step', progress: area };
  return { changed: true, step, completed: objective.completed, progress: area };
}

function refreshResearchLabs(objective) {
  objective.labsCompleted = Boolean(objective.roboticsRecovered && objective.materialsRecovered && objective.energyRecovered);
  return objective.labsCompleted;
}

export function advanceResearchObjective(game, step) {
  const exploration = ensureExplorationState(game);
  if (!exploration.activeSession || exploration.activeSession.areaId !== RESEARCH_AREA_ID) return { changed: false, reason: 'no-session', progress: exploration.areas.research };
  const area = exploration.areas.research;
  const objective = area.objective;
  if (step === 'access') {
    if (objective.accessRelayOnline) return { changed: false, reason: 'done', progress: area };
    objective.accessRelayOnline = true;
  } else if (step === 'robotics') {
    if (!objective.accessRelayOnline) return { changed: false, reason: 'needs-access', progress: area };
    if (objective.roboticsRecovered) return { changed: false, reason: 'done', progress: area };
    objective.roboticsRecovered = true;
  } else if (step === 'materials') {
    if (!objective.accessRelayOnline) return { changed: false, reason: 'needs-access', progress: area };
    if (objective.materialsRecovered) return { changed: false, reason: 'done', progress: area };
    objective.materialsRecovered = true;
  } else if (step === 'energy') {
    if (!objective.accessRelayOnline) return { changed: false, reason: 'needs-access', progress: area };
    if (objective.energyRecovered) return { changed: false, reason: 'done', progress: area };
    objective.energyRecovered = true;
  } else if (step === 'shortcut') {
    if (!refreshResearchLabs(objective)) return { changed: false, reason: 'needs-labs', progress: area };
    if (objective.shortcutOpened) return { changed: false, reason: 'done', progress: area };
    objective.shortcutOpened = true;
  } else if (step === 'central') {
    return { changed: false, reason: 'phase-locked', progress: area };
  } else return { changed: false, reason: 'unknown-step', progress: area };
  refreshResearchLabs(objective);
  return { changed: true, step, labsCompleted: objective.labsCompleted, completed: objective.completed, progress: area };
}

function researchComponentForId(componentId) {
  return Object.values(RESEARCH_COMPONENTS).find((entry) => entry.id === componentId) || null;
}

export function collectResearchCargo(game, componentId) {
  const exploration = ensureExplorationState(game);
  const session = exploration.activeSession;
  const area = exploration.areas.research;
  const component = researchComponentForId(componentId);
  if (!session || session.areaId !== RESEARCH_AREA_ID) return { changed: false, reason: 'no-session', component };
  if (!component) return { changed: false, reason: 'unknown-component', component: null };
  const objectiveKey = `${component.labId}Recovered`;
  if (!area.objective?.[objectiveKey]) return { changed: false, reason: 'lab-not-recovered', component };
  if (area.securedComponents.includes(component.id)) return { changed: false, reason: 'secured', component };
  if (session.researchCargo.includes(component.id)) return { changed: false, reason: 'carried', component };
  session.researchCargo.push(component.id);
  return { changed: true, component, cargo: [...session.researchCargo] };
}

export function researchComponentState(game, labId) {
  const exploration = ensureExplorationState(game);
  const component = RESEARCH_COMPONENTS[labId] || null;
  if (!component) return { exists: false, component: null, recovered: false, carried: false, secured: false };
  const area = exploration.areas.research;
  const recovered = Boolean(area.objective?.[`${labId}Recovered`]);
  const carried = Boolean(exploration.activeSession?.areaId === RESEARCH_AREA_ID && exploration.activeSession.researchCargo?.includes(component.id));
  const secured = area.securedComponents.includes(component.id);
  return { exists: true, component, recovered, carried, secured, needsCollection: recovered && !carried && !secured };
}

function lootCount(loot) {
  return Object.values(loot || {}).reduce((sum, amount) => sum + nonNegativeInt(amount), 0);
}

export function returnFromExpedition(game) {
  const exploration = ensureExplorationState(game);
  const session = exploration.activeSession;
  if (!session) return { changed: false, reason: 'no-session', moved: 0 };
  const normalLootMoved = lootCount(session.loot);
  for (const [itemId, amount] of Object.entries(session.loot)) exploration.depot[itemId] = Number(exploration.depot[itemId] || 0) + nonNegativeInt(amount);
  const area = exploration.areas[session.areaId];
  let secured = 0;
  if (session.areaId === RESEARCH_AREA_ID && area) {
    area.securedComponents = uniqueStrings(area.securedComponents).filter((id) => RESEARCH_COMPONENT_IDS.has(id));
    for (const componentId of session.researchCargo || []) {
      if (!RESEARCH_COMPONENT_IDS.has(componentId) || area.securedComponents.includes(componentId)) continue;
      area.securedComponents.push(componentId);
      secured += 1;
    }
  }
  const moved = normalLootMoved + secured;
  if (area) {
    area.successfulReturns += 1;
    area.returnedLootTotal += moved;
  }
  exploration.activeSession = null;
  return { changed: true, moved, secured, depot: { ...exploration.depot } };
}

export function abandonExpedition(game) {
  const exploration = ensureExplorationState(game);
  const session = exploration.activeSession;
  if (!session) return { changed: false, reason: 'no-session', lost: 0 };
  const lost = lootCount(session.loot) + (session.researchCargo?.length || 0);
  exploration.activeSession = null;
  const home = ensureHomeState(game);
  if (home.respawnEnabled) game.player = { ...HOME_RESPAWN_POSITION };
  return { changed: true, lost };
}

function canAddFactoryInventory(game, inventory, itemId) {
  const def = ITEMS[itemId];
  if (!def) return false;
  const current = Number(inventory[itemId] || 0);
  if (current > 0 && current % def.stack !== 0) return true;
  return usedSlots(inventory) < backpackSlotCapacity(game, EXPLORATION_MAX_SLOTS);
}

export function claimExplorationDepot(game) {
  const exploration = ensureExplorationState(game);
  game.inventory ??= {};
  let moved = 0;
  for (const itemId of Object.keys(exploration.depot)) {
    let remaining = nonNegativeInt(exploration.depot[itemId]);
    while (remaining > 0 && canAddFactoryInventory(game, game.inventory, itemId)) {
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
    labsCompleted: Boolean(area.objective?.labsCompleted),
    securedComponents: Array.isArray(area.securedComponents) ? area.securedComponents.length : 0,
  };
}

export function residentialProgressSummary(game) {
  return explorationProgressSummary(game, RESIDENTIAL_AREA_ID);
}

export function industrialProgressSummary(game) {
  return explorationProgressSummary(game, INDUSTRIAL_AREA_ID);
}

export function militaryProgressSummary(game) {
  return explorationProgressSummary(game, MILITARY_AREA_ID);
}

export function researchProgressSummary(game) {
  return explorationProgressSummary(game, RESEARCH_AREA_ID);
}
