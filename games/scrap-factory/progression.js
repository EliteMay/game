import { BUILDINGS, ITEMS } from './config.js';
import { findDirectionalRoute } from './logistics.js';

export const PROGRESSION_VERSION = 1;
export const PHASE_ONE_MAX_RANK = 3;

export const RESEARCH = {
  basic_fabrication: {
    id: 'basic_fabrication',
    title: 'Basic Fabrication',
    name: '基本製作技術',
    category: 'Production',
    requiredRank: 2,
    researchDataCost: 1,
    description: '鉄インゴットを手作業で鉄板へ加工する基本工程を解放する。',
    unlocks: ['handcraft:iron_plate'],
  },
  scrap_yard_survey: {
    id: 'scrap_yard_survey',
    title: 'Scrap Yard Survey',
    name: '廃材置き場調査',
    category: 'Exploration',
    requiredRank: 3,
    researchDataCost: 1,
    requiredBlueprint: 'scrap_yard_survey_blueprint',
    description: '探索Researchの入口。Blueprint未発見では研究できない。',
    unlocks: ['research:exploration_i'],
  },
};

const BUILDING_UNLOCK_RANK = {
  smelter: 2,
  storage: 2,
  generator: 4,
  power_pole: 4,
};

const RANK_REWARDS = {
  2: { researchData: 1 },
  3: { researchData: 2 },
};

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function uniqueStrings(value) {
  return Array.isArray(value) ? [...new Set(value.map(String))] : [];
}

function clampRank(value) {
  const rank = Math.floor(Number(value));
  if (!Number.isFinite(rank)) return 1;
  return Math.max(1, Math.min(7, rank));
}

export function makeDefaultProgression() {
  return {
    version: PROGRESSION_VERSION,
    progressionRank: 1,
    researchData: 0,
    blueprints: [],
    completedResearch: [],
    unlocks: [],
    legacyUnlocks: [],
    legacyMigrated: false,
    history: [],
  };
}

function buildingContentsInclude(game, itemId) {
  return (game?.buildings || []).some((building) => (
    Number(building?.input?.[itemId] || 0) > 0
    || Number(building?.output?.[itemId] || 0) > 0
  ));
}

function legacyUsedCrafting(game) {
  const inventory = game?.inventory || {};
  const discovered = new Set(game?.discoveredItems || []);
  return Number(inventory.iron_plate || 0) > 0
    || Number(inventory.tool_kit || 0) > 0
    || discovered.has('iron_plate')
    || discovered.has('tool_kit')
    || buildingContentsInclude(game, 'iron_plate')
    || buildingContentsInclude(game, 'tool_kit');
}

function acceptsItem(building, itemId) {
  const def = BUILDINGS[building?.type];
  const item = ITEMS[itemId];
  if (!def || !item) return false;
  return (def.accepts || []).includes(itemId) || (def.accepts || []).includes(item.category);
}

function hasPath(game, source, target, itemId) {
  return Boolean(findDirectionalRoute(game?.buildings || [], source, itemId, acceptsItem, target?.id));
}

export function hasAutomatedCrushedMetalLine(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const hoppers = buildings.filter((building) => building.type === 'hopper');
  const crushers = buildings.filter((building) => building.type === 'crusher');
  const sellers = buildings.filter((building) => building.type === 'seller');
  return hoppers.some((hopper) => crushers.some((crusher) => (
    hasPath(game, hopper, crusher, 'metal_scrap')
    && sellers.some((seller) => hasPath(game, crusher, seller, 'crushed_metal'))
  )));
}

export function hasAutomatedIronLine(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const hoppers = buildings.filter((building) => building.type === 'hopper');
  const crushers = buildings.filter((building) => building.type === 'crusher');
  const smelters = buildings.filter((building) => building.type === 'smelter');
  const sellers = buildings.filter((building) => building.type === 'seller');
  return hoppers.some((hopper) => crushers.some((crusher) => smelters.some((smelter) => (
    hasPath(game, hopper, crusher, 'metal_scrap')
    && hasPath(game, crusher, smelter, 'crushed_metal')
    && sellers.some((seller) => hasPath(game, smelter, seller, 'iron_ingot'))
  ))));
}

function inferLegacyProgression(game) {
  const base = makeDefaultProgression();
  const buildingTypes = new Set((game?.buildings || []).map((building) => building?.type));
  const discovered = new Set(game?.discoveredItems || []);
  const usedSmelter = buildingTypes.has('smelter')
    || discovered.has('iron_ingot')
    || Number(game?.inventory?.iron_ingot || 0) > 0
    || buildingContentsInclude(game, 'iron_ingot');
  const usedStorage = buildingTypes.has('storage');
  const fullIronLine = hasAutomatedIronLine(game);

  if (fullIronLine) base.progressionRank = 3;
  else if (usedSmelter || usedStorage) base.progressionRank = 2;

  if (usedSmelter) base.legacyUnlocks.push('building:smelter');
  if (usedStorage) base.legacyUnlocks.push('building:storage');
  if (legacyUsedCrafting(game)) {
    base.completedResearch.push('basic_fabrication');
    base.unlocks.push('handcraft:iron_plate');
  }

  base.researchData = base.progressionRank >= 3 ? 3 : base.progressionRank >= 2 ? 1 : 0;
  base.legacyMigrated = true;
  base.history.push({
    type: 'legacy-migration',
    rank: base.progressionRank,
    at: new Date().toISOString(),
  });
  return base;
}

export function normalizeProgression(candidate, game = null) {
  if (!isObject(candidate)) return inferLegacyProgression(game || {});
  const base = makeDefaultProgression();
  return {
    ...base,
    ...candidate,
    version: PROGRESSION_VERSION,
    progressionRank: clampRank(candidate.progressionRank),
    researchData: Math.max(0, Math.floor(Number(candidate.researchData || 0))),
    blueprints: uniqueStrings(candidate.blueprints),
    completedResearch: uniqueStrings(candidate.completedResearch),
    unlocks: uniqueStrings(candidate.unlocks),
    legacyUnlocks: uniqueStrings(candidate.legacyUnlocks),
    legacyMigrated: Boolean(candidate.legacyMigrated),
    history: Array.isArray(candidate.history) ? candidate.history.filter(isObject).slice(-100) : [],
  };
}

export function ensureProgressionState(game) {
  const current = game?.progression;
  const normalized = normalizeProgression(current, game);
  if (isObject(current)) {
    for (const key of Object.keys(current)) {
      if (!Object.prototype.hasOwnProperty.call(normalized, key)) delete current[key];
    }
    Object.assign(current, normalized);
    return current;
  }
  game.progression = normalized;
  return normalized;
}

export function requiredBuildingRank(type) {
  return BUILDING_UNLOCK_RANK[type] || 1;
}

export function isBuildingUnlocked(game, type) {
  const progression = ensureProgressionState(game);
  const requiredRank = requiredBuildingRank(type);
  if (progression.progressionRank >= requiredRank) return true;
  return progression.legacyUnlocks.includes(`building:${type}`);
}

export function isHandCraftUnlocked(game, craftId) {
  if (craftId !== 'iron_plate') return true;
  const progression = ensureProgressionState(game);
  return progression.completedResearch.includes('basic_fabrication')
    || progression.unlocks.includes('handcraft:iron_plate');
}

function metrics(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const discovered = new Set(game?.discoveredItems || []);
  return {
    collected: Number(game?.tutorialStats?.collected || 0),
    processed: Number(game?.tutorialStats?.processed || 0),
    revenue: Number(game?.lifetimeRevenue || 0),
    playerBuilt: buildings.filter((building) => !building.permanent).length,
    crushers: buildings.filter((building) => building.type === 'crusher').length,
    smelters: buildings.filter((building) => building.type === 'smelter').length,
    discoveredCount: discovered.size,
    discoveredIronIngot: discovered.has('iron_ingot'),
    autoCrushedLine: hasAutomatedCrushedMetalLine(game),
    autoIronLine: hasAutomatedIronLine(game),
  };
}

export function getRankDefinition(rank) {
  if (rank === 1) {
    return {
      rank: 1,
      nextRank: 2,
      title: '最初の自動化',
      mandatory: { id: 'auto_crushed', label: 'Hopper → Crusher → Seller の自動ラインを成立', test: (m) => m.autoCrushedLine },
      optionalRequired: 2,
      optionals: [
        { id: 'revenue_250', label: '累計売上 $250', test: (m) => m.revenue >= 250 },
        { id: 'collect_10', label: 'スクラップを10個回収', test: (m) => m.collected >= 10 },
        { id: 'process_5', label: '粉砕を5回完了', test: (m) => m.processed >= 5 },
        { id: 'crusher_2', label: 'Crusherを2台設置', test: (m) => m.crushers >= 2 },
        { id: 'discover_4', label: '4種類のアイテムを発見', test: (m) => m.discoveredCount >= 4 },
      ],
      rewards: ['Smelter', 'Storage', 'Research Tier 2', 'Research Data +1'],
    };
  }
  if (rank === 2) {
    return {
      rank: 2,
      nextRank: 3,
      title: '基本工場',
      mandatory: { id: 'auto_iron', label: 'Crusher → Smelterを含む鉄インゴット完全自動ラインを成立', test: (m) => m.autoIronLine },
      optionalRequired: 2,
      optionals: [
        { id: 'revenue_750', label: '累計売上 $750', test: (m) => m.revenue >= 750 },
        { id: 'discover_ingot', label: '鉄インゴットを発見', test: (m) => m.discoveredIronIngot },
        { id: 'buildings_8', label: '自作設備を8台設置', test: (m) => m.playerBuilt >= 8 },
        { id: 'process_10', label: '粉砕を10回完了', test: (m) => m.processed >= 10 },
        { id: 'smelter_2', label: 'Smelterを2台設置', test: (m) => m.smelters >= 2 },
      ],
      rewards: ['Rank 3 Progression', 'Research Data +2', 'Exploration Research入口'],
    };
  }
  return null;
}

export function rankProgress(game) {
  const progression = ensureProgressionState(game);
  const definition = getRankDefinition(progression.progressionRank);
  if (!definition) {
    return {
      rank: progression.progressionRank,
      phaseCap: progression.progressionRank >= PHASE_ONE_MAX_RANK,
      eligible: false,
      mandatory: null,
      optionals: [],
      optionalDone: 0,
      optionalRequired: 0,
      definition: null,
    };
  }
  const m = metrics(game);
  const mandatory = { ...definition.mandatory, done: Boolean(definition.mandatory.test(m)) };
  const optionals = definition.optionals.map((goal) => ({ ...goal, done: Boolean(goal.test(m)) }));
  const optionalDone = optionals.filter((goal) => goal.done).length;
  return {
    rank: progression.progressionRank,
    phaseCap: false,
    definition,
    mandatory,
    optionals,
    optionalDone,
    optionalRequired: definition.optionalRequired,
    eligible: mandatory.done && optionalDone >= definition.optionalRequired,
  };
}

export function claimRankUp(game) {
  const progression = ensureProgressionState(game);
  if (progression.progressionRank >= PHASE_ONE_MAX_RANK) {
    return { changed: false, reason: 'phase-cap', progression };
  }
  const progress = rankProgress(game);
  if (!progress.eligible || !progress.definition) {
    return { changed: false, reason: 'requirements', progress, progression };
  }
  const nextRank = progress.definition.nextRank;
  progression.progressionRank = nextRank;
  const reward = RANK_REWARDS[nextRank] || {};
  progression.researchData += Math.max(0, Number(reward.researchData || 0));
  progression.history.push({ type: 'rank-up', rank: nextRank, at: new Date().toISOString() });
  progression.history = progression.history.slice(-100);
  return { changed: true, rank: nextRank, reward, progression, progress: rankProgress(game) };
}

export function researchState(game, researchId) {
  const progression = ensureProgressionState(game);
  const definition = RESEARCH[researchId];
  if (!definition) return { id: researchId, exists: false, available: false, reason: 'unknown' };
  if (progression.completedResearch.includes(researchId)) {
    return { ...definition, exists: true, completed: true, available: false, reason: 'completed' };
  }
  if (progression.progressionRank < definition.requiredRank) {
    return { ...definition, exists: true, completed: false, available: false, reason: 'rank' };
  }
  if (definition.requiredBlueprint && !progression.blueprints.includes(definition.requiredBlueprint)) {
    return { ...definition, exists: true, completed: false, available: false, reason: 'blueprint' };
  }
  if (progression.researchData < definition.researchDataCost) {
    return { ...definition, exists: true, completed: false, available: false, reason: 'data' };
  }
  return { ...definition, exists: true, completed: false, available: true, reason: null };
}

export function completeResearch(game, researchId) {
  const progression = ensureProgressionState(game);
  const state = researchState(game, researchId);
  if (!state.available) return { changed: false, state, progression };
  progression.researchData -= state.researchDataCost;
  progression.completedResearch.push(researchId);
  for (const unlock of state.unlocks || []) {
    if (!progression.unlocks.includes(unlock)) progression.unlocks.push(unlock);
  }
  progression.history.push({ type: 'research', id: researchId, at: new Date().toISOString() });
  progression.history = progression.history.slice(-100);
  return { changed: true, state: researchState(game, researchId), progression };
}
