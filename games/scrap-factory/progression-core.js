import { BUILDINGS, ITEMS, RECIPES } from './config.js';
import { findDirectionalRoute, findDirectionalRoutes } from './logistics.js';
import {
  GENERATOR_FUEL_SECONDS,
  buildingPowerGeneration,
  computePowerSnapshot,
  generatorActive,
} from './power.js';

export const PROGRESSION_VERSION = 1;
export const PLAYABLE_MAX_RANK = 6;
export const PHASE_ONE_MAX_RANK = PLAYABLE_MAX_RANK;
export const RANK4_STABLE_FUEL_SECONDS = 30;
export const RANK4_EXTENDED_FUEL_SECONDS = 120;

export const RESEARCH = {
  basic_fabrication: {
    id: 'basic_fabrication', title: 'Basic Fabrication', name: '基本製作技術', category: 'Production',
    requiredRank: 2, researchDataCost: 1,
    description: '鉄インゴットを手作業で鉄板へ加工する基本工程を解放する。',
    unlocks: ['handcraft:iron_plate'],
  },
  scrap_yard_survey: {
    id: 'scrap_yard_survey', title: 'Scrap Yard Survey', name: '廃材置き場調査', category: 'Exploration',
    requiredRank: 3, researchDataCost: 1, requiredBlueprint: 'scrap_yard_survey_blueprint',
    description: '廃住宅街の調査Terminalから持ち帰ったBlueprintを解析し、Exploration Research Iを確立する。',
    unlocks: ['research:exploration_i'],
  },
  grid_storage: {
    id: 'grid_storage', title: 'Grid Storage', name: '電力蓄電技術', category: 'Power',
    requiredRank: 4, researchDataCost: 2,
    description: '余剰電力を蓄え、発電不足時に自動放電するグリッドバッテリーを解放する。',
    unlocks: ['building:battery'],
  },
  advanced_assembly: {
    id: 'advanced_assembly', title: 'Recovered Assembly Control', name: '高度組立制御', category: 'Production',
    requiredRank: 5, researchDataCost: 2, requiredBlueprint: 'abandoned_factory_assembly_blueprint',
    description: '廃工場から回収した組立制御Blueprintを解析し、アセンブラーと高度部品製作を解放する。',
    unlocks: ['building:assembler', 'handcraft:circuit', 'handcraft:motor'],
  },
};

const BUILDING_UNLOCK_RANK = {
  smelter: 2,
  storage: 2,
  conveyor_mk2: 4,
  splitter: 4,
  merger: 4,
  generator: 4,
  power_pole: 4,
  battery: 4,
  industrial_storage: 5,
  assembler: 5,
};

const BUILDING_RESEARCH_UNLOCK = {
  battery: 'grid_storage',
  assembler: 'advanced_assembly',
};

const HAND_CRAFT_RESEARCH_UNLOCK = {
  iron_plate: 'basic_fabrication',
  circuit: 'advanced_assembly',
  motor: 'advanced_assembly',
};

const RANK_REWARDS = {
  2: { researchData: 1 },
  3: { researchData: 2 },
  4: { researchData: 1 },
  5: { researchData: 0 },
  6: { researchData: 1 },
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
    Number(building?.input?.[itemId] || 0) > 0 || Number(building?.output?.[itemId] || 0) > 0
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
  if (!acceptsItem(target, itemId)) return false;
  return Boolean(findDirectionalRoute(game?.buildings || [], source, itemId, acceptsItem, target?.id));
}

function routesTo(game, source, target, itemId) {
  if (!acceptsItem(target, itemId)) return [];
  return findDirectionalRoutes(game?.buildings || [], source, itemId, acceptsItem, target?.id);
}

function routeBundle(productId, routes) {
  const valid = routes.filter(Boolean);
  if (!valid.length) return null;
  const nodeTypes = valid.flatMap((route) => route.nodeTypes || []);
  const throughputs = valid.map((route) => Number(route.throughput || 0)).filter((value) => value > 0);
  return { productId, routes: valid, nodeTypes, throughput: throughputs.length ? Math.min(...throughputs) : 0 };
}

function candidateScore(candidate) {
  return (candidate.qualifies ? 1000 : 0)
    + (candidate.usesMk2 ? 100 : 0)
    + Math.round(candidate.throughput * 10)
    - candidate.nodeTypes.length * 0.001;
}

export function analyzeRank4AdvancedLine(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const hoppers = buildings.filter((building) => building.type === 'hopper');
  const crushers = buildings.filter((building) => building.type === 'crusher');
  const smelters = buildings.filter((building) => building.type === 'smelter');
  const finals = buildings.filter((building) => ['seller', 'storage', 'industrial_storage'].includes(building.type));
  let best = null;

  for (const hopper of hoppers) {
    const crushedCandidates = [];
    const ironCandidates = [];
    for (const crusher of crushers) {
      const inputRoutes = routesTo(game, hopper, crusher, 'metal_scrap');
      if (!inputRoutes.length) continue;
      for (const inputRoute of inputRoutes) {
        for (const target of finals) {
          for (const finalRoute of routesTo(game, crusher, target, 'crushed_metal')) {
            const bundle = routeBundle('crushed_metal', [inputRoute, finalRoute]);
            if (bundle) crushedCandidates.push(bundle);
          }
        }
        for (const smelter of smelters) {
          const processRoutes = routesTo(game, crusher, smelter, 'crushed_metal');
          for (const processRoute of processRoutes) {
            for (const target of finals) {
              for (const finalRoute of routesTo(game, smelter, target, 'iron_ingot')) {
                const bundle = routeBundle('iron_ingot', [inputRoute, processRoute, finalRoute]);
                if (bundle) ironCandidates.push(bundle);
              }
            }
          }
        }
      }
    }
    for (const crushed of crushedCandidates) {
      for (const iron of ironCandidates) {
        const nodeTypes = [...crushed.nodeTypes, ...iron.nodeTypes];
        const candidate = {
          qualifies: nodeTypes.includes('splitter') && nodeTypes.includes('merger'),
          productTypes: ['crushed_metal', 'iron_ingot'],
          usesSplitter: nodeTypes.includes('splitter'),
          usesMerger: nodeTypes.includes('merger'),
          usesMk2: nodeTypes.includes('conveyor_mk2'),
          throughput: Math.min(crushed.throughput, iron.throughput),
          nodeTypes,
        };
        if (!best || candidateScore(candidate) > candidateScore(best)) best = candidate;
      }
    }
  }

  return best || { qualifies: false, productTypes: [], usesSplitter: false, usesMerger: false, usesMk2: false, throughput: 0, nodeTypes: [] };
}

function generatorFuelRunway(building) {
  const current = Math.max(0, Number(building?.powerFuelSeconds || 0));
  const queued = Math.max(0, Math.floor(Number(building?.input?.metal_scrap || 0)));
  return current + queued * GENERATOR_FUEL_SECONDS;
}

export function analyzeRank4Power(game) {
  const snapshot = computePowerSnapshot(game);
  const demand = Math.max(0, Number(snapshot.coveredDemand || 0));
  const active = (game?.buildings || [])
    .filter((building) => buildingPowerGeneration(building) > 0 && generatorActive(building))
    .map((building) => ({ id: building.id, generation: buildingPowerGeneration(building), fuelRunwaySeconds: generatorFuelRunway(building) }))
    .sort((a, b) => b.fuelRunwaySeconds - a.fuelRunwaySeconds || b.generation - a.generation || String(a.id).localeCompare(String(b.id)));

  const ownGeneration = active.reduce((sum, entry) => sum + entry.generation, 0);
  const selected = [];
  let selectedGeneration = 0;
  for (const entry of active) {
    selected.push(entry);
    selectedGeneration += entry.generation;
    if (selectedGeneration + 1e-9 >= demand) break;
  }
  const fuelRunwaySeconds = selectedGeneration + 1e-9 >= demand && selected.length ? Math.min(...selected.map((entry) => entry.fuelRunwaySeconds)) : 0;
  const selfPowered = snapshot.enabled && demand > 0 && snapshot.status === 'ok' && snapshot.uncoveredIds.size === 0 && ownGeneration + 1e-9 >= demand;
  return {
    selfPowered,
    stable: selfPowered && fuelRunwaySeconds >= RANK4_STABLE_FUEL_SECONDS,
    ownGeneration,
    demand,
    reserve: Math.max(0, ownGeneration - demand),
    fuelRunwaySeconds,
    activeGenerators: active.length,
  };
}

export function hasAutomatedCrushedMetalLine(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const hoppers = buildings.filter((building) => building.type === 'hopper');
  const crushers = buildings.filter((building) => building.type === 'crusher');
  const sellers = buildings.filter((building) => building.type === 'seller');
  return hoppers.some((hopper) => crushers.some((crusher) => hasPath(game, hopper, crusher, 'metal_scrap') && sellers.some((seller) => hasPath(game, crusher, seller, 'crushed_metal'))));
}

export function hasAutomatedIronLine(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const hoppers = buildings.filter((building) => building.type === 'hopper');
  const crushers = buildings.filter((building) => building.type === 'crusher');
  const smelters = buildings.filter((building) => building.type === 'smelter');
  const sellers = buildings.filter((building) => building.type === 'seller');
  return hoppers.some((hopper) => crushers.some((crusher) => smelters.some((smelter) => (
    hasPath(game, hopper, crusher, 'metal_scrap') && hasPath(game, crusher, smelter, 'crushed_metal') && sellers.some((seller) => hasPath(game, smelter, seller, 'iron_ingot'))
  ))));
}

export function analyzeRank5AssemblerLine(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const sources = buildings.filter((building) => ['hopper', 'storage', 'industrial_storage'].includes(building.type));
  const assemblers = buildings.filter((building) => building.type === 'assembler');
  const finals = buildings.filter((building) => ['seller', 'storage', 'industrial_storage'].includes(building.type));
  const recipe = RECIPES.assembler_control_unit;
  let best = null;

  for (const assembler of assemblers) {
    const inputRoutes = [];
    let inputsConnected = true;
    for (const itemId of Object.keys(recipe.input)) {
      let bestInput = null;
      for (const source of sources) {
        if (source.id === assembler.id) continue;
        const route = routesTo(game, source, assembler, itemId)[0];
        if (route && (!bestInput || route.throughput > bestInput.throughput)) bestInput = route;
      }
      if (!bestInput) { inputsConnected = false; break; }
      inputRoutes.push(bestInput);
    }
    if (!inputsConnected) continue;

    for (const target of finals) {
      if (target.id === assembler.id) continue;
      for (const outputRoute of routesTo(game, assembler, target, 'control_unit')) {
        const allRoutes = [...inputRoutes, outputRoute];
        const throughput = Math.min(...allRoutes.map((route) => Number(route.throughput || 0)));
        const nodeTypes = allRoutes.flatMap((route) => route.nodeTypes || []);
        const candidate = { qualifies: true, assemblerId: assembler.id, throughput, nodeTypes, usesMk2: nodeTypes.includes('conveyor_mk2') };
        if (!best || candidate.throughput > best.throughput) best = candidate;
      }
    }
  }

  return best || { qualifies: false, assemblerId: null, throughput: 0, nodeTypes: [], usesMk2: false };
}

function inferLegacyProgression(game) {
  const base = makeDefaultProgression();
  const buildingTypes = new Set((game?.buildings || []).map((building) => building?.type));
  const discovered = new Set(game?.discoveredItems || []);
  const usedSmelter = buildingTypes.has('smelter') || discovered.has('iron_ingot') || Number(game?.inventory?.iron_ingot || 0) > 0 || buildingContentsInclude(game, 'iron_ingot');
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
  base.history.push({ type: 'legacy-migration', rank: base.progressionRank, at: new Date().toISOString() });
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
    for (const key of Object.keys(current)) if (!Object.prototype.hasOwnProperty.call(normalized, key)) delete current[key];
    Object.assign(current, normalized);
    return current;
  }
  game.progression = normalized;
  return normalized;
}

export function requiredBuildingRank(type) { return BUILDING_UNLOCK_RANK[type] || 1; }
export function requiredBuildingResearch(type) { return BUILDING_RESEARCH_UNLOCK[type] || null; }

export function buildingUnlockState(game, type) {
  const progression = ensureProgressionState(game);
  const requiredRank = requiredBuildingRank(type);
  const requiredResearch = requiredBuildingResearch(type);
  const legacy = progression.legacyUnlocks.includes(`building:${type}`);
  if (legacy) return { unlocked: true, reason: null, requiredRank, requiredResearch };
  if (progression.progressionRank < requiredRank) return { unlocked: false, reason: 'rank', requiredRank, requiredResearch };
  if (requiredResearch && !progression.completedResearch.includes(requiredResearch) && !progression.unlocks.includes(`building:${type}`)) {
    return { unlocked: false, reason: 'research', requiredRank, requiredResearch };
  }
  return { unlocked: true, reason: null, requiredRank, requiredResearch };
}

export function isBuildingUnlocked(game, type) { return buildingUnlockState(game, type).unlocked; }

export function isHandCraftUnlocked(game, craftId) {
  const requiredResearch = HAND_CRAFT_RESEARCH_UNLOCK[craftId];
  if (!requiredResearch) return true;
  const progression = ensureProgressionState(game);
  return progression.completedResearch.includes(requiredResearch) || progression.unlocks.includes(`handcraft:${craftId}`);
}

function bufferAmount(building) {
  return Object.values(building?.output || {}).reduce((sum, amount) => sum + Math.max(0, Number(amount || 0)), 0);
}

function metrics(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const discovered = new Set(game?.discoveredItems || []);
  const residential = game?.exploration?.areas?.residential || {};
  const industrial = game?.exploration?.areas?.industrial || {};
  const advancedLine = analyzeRank4AdvancedLine(game);
  const rank4Power = analyzeRank4Power(game);
  const assemblerLine = analyzeRank5AssemblerLine(game);
  const industrialStorageUsed = buildings.some((building) => building.type === 'industrial_storage' && bufferAmount(building) > 0);
  return {
    collected: Number(game?.tutorialStats?.collected || 0),
    processed: Number(game?.tutorialStats?.processed || 0),
    revenue: Number(game?.lifetimeRevenue || 0),
    playerBuilt: buildings.filter((building) => !building.permanent).length,
    crushers: buildings.filter((building) => building.type === 'crusher').length,
    smelters: buildings.filter((building) => building.type === 'smelter').length,
    discoveredCount: discovered.size,
    discoveredIronIngot: discovered.has('iron_ingot'),
    discoveredCableBundle: discovered.has('cable_bundle'),
    discoveredCircuit: discovered.has('circuit'),
    discoveredMotor: discovered.has('motor'),
    autoCrushedLine: hasAutomatedCrushedMetalLine(game),
    autoIronLine: hasAutomatedIronLine(game),
    residentialObjective: Boolean(residential?.objective?.completed),
    residentialZones: Array.isArray(residential.discoveredZones) ? residential.discoveredZones.length : 0,
    residentialReturnedLoot: Number(residential?.returnedLootTotal || 0),
    industrialObjective: Boolean(industrial?.objective?.completed),
    industrialShortcut: Boolean(industrial?.objective?.shortcutOpened),
    rank4AdvancedLine: advancedLine.qualifies,
    rank4UsesMk2: advancedLine.usesMk2,
    rank4Throughput: advancedLine.throughput,
    rank4StableSelfPower: rank4Power.stable,
    rank4FuelRunway: rank4Power.fuelRunwaySeconds,
    rank4PowerReserve: rank4Power.reserve,
    gridStorageResearched: game?.progression?.completedResearch?.includes('grid_storage') || false,
    advancedAssemblyResearched: game?.progression?.completedResearch?.includes('advanced_assembly') || false,
    assemblerLine: assemblerLine.qualifies,
    assemblerThroughput: assemblerLine.throughput,
    industrialStorageUsed,
  };
}

export function getRankDefinition(rank) {
  if (rank === 1) return {
    rank: 1, nextRank: 2, title: '最初の自動化',
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
  if (rank === 2) return {
    rank: 2, nextRank: 3, title: '基本工場',
    mandatory: { id: 'auto_iron', label: 'Crusher → Smelterを含む鉄インゴット完全自動ラインを成立', test: (m) => m.autoIronLine },
    optionalRequired: 2,
    optionals: [
      { id: 'revenue_750', label: '累計売上 $750', test: (m) => m.revenue >= 750 },
      { id: 'discover_ingot', label: '鉄インゴットを発見', test: (m) => m.discoveredIronIngot },
      { id: 'buildings_8', label: '自作設備を8台設置', test: (m) => m.playerBuilt >= 8 },
      { id: 'process_10', label: '粉砕を10回完了', test: (m) => m.processed >= 10 },
      { id: 'smelter_2', label: 'Smelterを2台設置', test: (m) => m.smelters >= 2 },
    ],
    rewards: ['Rank 3 Progression', 'Research Data +2', '廃住宅街 / Exploration入口'],
  };
  if (rank === 3) return {
    rank: 3, nextRank: 4, title: '新素材と探索',
    mandatory: { id: 'residential_objective', label: '廃住宅街のMain Objectiveを完了', test: (m) => m.residentialObjective },
    optionalRequired: 2,
    optionals: [
      { id: 'residential_zones_3', label: '廃住宅街の4区画中3区画を発見', test: (m) => m.residentialZones >= 3 },
      { id: 'residential_return_10', label: '廃住宅街から素材を累計10個持ち帰る', test: (m) => m.residentialReturnedLoot >= 10 },
      { id: 'discover_cable', label: 'ケーブル束を発見 / 製作', test: (m) => m.discoveredCableBundle },
      { id: 'revenue_1200', label: '累計売上 $1,200', test: (m) => m.revenue >= 1200 },
      { id: 'discover_6', label: '6種類のアイテムを発見', test: (m) => m.discoveredCount >= 6 },
    ],
    rewards: ['Splitter', 'Merger', 'Conveyor Mk.2', 'Generator', 'Power Pole', 'Research Data +1'],
  };
  if (rank === 4) return {
    rank: 4, nextRank: 5, title: '物流と電力',
    mandatory: {
      id: 'advanced_self_powered_line',
      label: `Splitter / Mergerを使う2種類の加工品ラインを、自前電力${RANK4_STABLE_FUEL_SECONDS}秒分以上で安定化`,
      test: (m) => m.rank4AdvancedLine && m.rank4StableSelfPower,
    },
    optionalRequired: 2,
    optionals: [
      { id: 'mk2_line', label: '複数製品ラインにConveyor Mk.2を使用', test: (m) => m.rank4UsesMk2 },
      { id: 'throughput_3', label: '複数製品ラインの実効帯域を3.0個/秒にする', test: (m) => m.rank4Throughput >= 3 },
      { id: 'grid_storage', label: 'Grid Storage研究を完了', test: (m) => m.gridStorageResearched },
      { id: 'fuel_120', label: `自前発電の燃料余裕を${RANK4_EXTENDED_FUEL_SECONDS}秒分以上確保`, test: (m) => m.rank4FuelRunway >= RANK4_EXTENDED_FUEL_SECONDS },
      { id: 'power_reserve_10', label: '自前発電の余力を10 Power以上確保', test: (m) => m.rank4PowerReserve >= 10 },
    ],
    rewards: ['Industrial Storage', 'Rank 5 Progression', '廃工場 / Exploration入口'],
  };
  if (rank === 5) return {
    rank: 5, nextRank: 6, title: '高度生産と廃工場復旧',
    mandatory: {
      id: 'industrial_assembler_line',
      label: '廃工場の主要設備を復旧し、回収技術でAssembler自動ラインを完成',
      test: (m) => m.industrialObjective && m.advancedAssemblyResearched && m.assemblerLine,
    },
    optionalRequired: 2,
    optionals: [
      { id: 'motor_production', label: '産業モーターを製作 / 発見', test: (m) => m.discoveredMotor },
      { id: 'circuit_production', label: '制御回路を製作 / 発見', test: (m) => m.discoveredCircuit },
      { id: 'industrial_storage_use', label: '産業倉庫を実際の生産Bufferとして使用', test: (m) => m.industrialStorageUsed },
      { id: 'industrial_shortcut', label: '廃工場のService Shortcutを開通', test: (m) => m.industrialShortcut },
      { id: 'assembler_efficiency', label: 'Assemblerラインの実効帯域を3.0個/秒にする', test: (m) => m.assemblerThroughput >= 3 },
    ],
    rewards: ['Rank 6 Progression', 'Research Data +1', '軍事施設 / 次Phase入口'],
  };
  return null;
}

export function rankProgress(game) {
  const progression = ensureProgressionState(game);
  const definition = getRankDefinition(progression.progressionRank);
  if (!definition) return {
    rank: progression.progressionRank,
    phaseCap: progression.progressionRank >= PLAYABLE_MAX_RANK,
    eligible: false,
    mandatory: null,
    optionals: [],
    optionalDone: 0,
    optionalRequired: 0,
    definition: null,
  };
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
  if (progression.progressionRank >= PLAYABLE_MAX_RANK) return { changed: false, reason: 'phase-cap', progression };
  const progress = rankProgress(game);
  if (!progress.eligible || !progress.definition) return { changed: false, reason: 'requirements', progress, progression };
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
  if (progression.completedResearch.includes(researchId)) return { ...definition, exists: true, completed: true, available: false, reason: 'completed' };
  if (progression.progressionRank < definition.requiredRank) return { ...definition, exists: true, completed: false, available: false, reason: 'rank' };
  if (definition.requiredBlueprint && !progression.blueprints.includes(definition.requiredBlueprint)) return { ...definition, exists: true, completed: false, available: false, reason: 'blueprint' };
  if (progression.researchData < definition.researchDataCost) return { ...definition, exists: true, completed: false, available: false, reason: 'data' };
  return { ...definition, exists: true, completed: false, available: true, reason: null };
}

export function completeResearch(game, researchId) {
  const progression = ensureProgressionState(game);
  const state = researchState(game, researchId);
  if (!state.available) return { changed: false, state, progression };
  progression.researchData -= state.researchDataCost;
  progression.completedResearch.push(researchId);
  for (const unlock of state.unlocks || []) if (!progression.unlocks.includes(unlock)) progression.unlocks.push(unlock);
  progression.history.push({ type: 'research', id: researchId, at: new Date().toISOString() });
  progression.history = progression.history.slice(-100);
  return { changed: true, state: researchState(game, researchId), progression };
}
