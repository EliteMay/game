import { BUILDINGS, ITEMS } from './config.js';
import { findDirectionalRoutes } from './logistics.js';
import * as core from './progression-core.js';
import * as phase4b from './progression-phase4b.js';

export const PLAYABLE_MAX_RANK = 7;
export const RESEARCH = {
  ...core.RESEARCH,
  drone_control_systems: {
    id: 'drone_control_systems',
    title: 'Recovered Drone Control',
    name: 'ドローン制御システム',
    category: 'Automation',
    requiredRank: 6,
    researchDataCost: 3,
    requiredBlueprint: 'military_drone_control_blueprint',
    description: '軍事施設から回収したDrone Control Blueprintを解析し、確保済みResource Pointの反復回収を自動化するDrone Portを解放する。',
    unlocks: ['building:drone_port'],
  },
};

function acceptsItem(building, itemId) {
  const def = BUILDINGS[building?.type];
  const item = ITEMS[itemId];
  if (!def || !item) return false;
  return (def.accepts || []).includes(itemId) || (def.accepts || []).includes(item.category);
}

export function requiredBuildingRank(type) {
  if (type === 'drone_port') return 6;
  return phase4b.requiredBuildingRank(type);
}

export function buildingUnlockState(game, type) {
  if (type !== 'drone_port') return phase4b.buildingUnlockState(game, type);
  const progression = core.ensureProgressionState(game);
  const requiredRank = 6;
  const requiredResearch = 'drone_control_systems';
  if (progression.progressionRank < requiredRank) {
    return { unlocked: false, reason: 'rank', requiredRank, requiredResearch };
  }
  const researched = progression.completedResearch.includes(requiredResearch)
    || progression.unlocks.includes('building:drone_port');
  return {
    unlocked: researched,
    reason: researched ? null : 'research',
    requiredRank,
    requiredResearch,
  };
}

export function isBuildingUnlocked(game, type) {
  return buildingUnlockState(game, type).unlocked;
}

export function analyzeRank6DroneLine(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const ports = buildings.filter((building) => building.type === 'drone_port');
  const targets = buildings.filter((building) => ['storage', 'industrial_storage'].includes(building.type));
  const military = game?.exploration?.areas?.military || {};
  const resourcePointSecured = Array.isArray(military.resourcePoints)
    && military.resourcePoints.includes('military-alloy-cache');
  let best = null;

  if (resourcePointSecured) {
    for (const port of ports) {
      for (const target of targets) {
        for (const route of findDirectionalRoutes(buildings, port, 'rare_alloy', acceptsItem, target.id)) {
          const candidate = {
            qualifies: true,
            dronePortId: port.id,
            storageId: target.id,
            throughput: Number(route.throughput || 0),
            nodeTypes: route.nodeTypes || [],
            resourcePointSecured,
          };
          if (!best || candidate.throughput > best.throughput) best = candidate;
        }
      }
    }
  }

  return best || {
    qualifies: false,
    dronePortId: null,
    storageId: null,
    throughput: 0,
    nodeTypes: [],
    resourcePointSecured,
  };
}

function phase5Metrics(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const military = game?.exploration?.areas?.military || {};
  const discovered = new Set(game?.discoveredItems || []);
  const droneLine = analyzeRank6DroneLine(game);
  return {
    militaryObjective: Boolean(military?.objective?.completed),
    militaryZones: Array.isArray(military.discoveredZones) ? military.discoveredZones.length : 0,
    militaryShortcut: Boolean(military?.objective?.shortcutOpened),
    droneControlResearched: game?.progression?.completedResearch?.includes('drone_control_systems') || false,
    droneLine: droneLine.qualifies,
    droneThroughput: droneLine.throughput,
    dronePorts: buildings.filter((building) => building.type === 'drone_port').length,
    rareAlloyDiscovered: discovered.has('rare_alloy'),
    rareAlloyBuffered: buildings.some((building) => Number(building?.output?.rare_alloy || 0) > 0),
  };
}

export function getRankDefinition(rank) {
  if (rank !== 6) return core.getRankDefinition(rank);
  return {
    rank: 6,
    nextRank: 7,
    title: '高度自動化',
    mandatory: {
      id: 'military_drone_logistics',
      label: '軍事施設でDrone Control技術を回収・研究し、Drone PortからFactory Storageへの自動回収Routeを成立',
      test: (m) => m.militaryObjective && m.droneControlResearched && m.droneLine,
    },
    optionalRequired: 2,
    optionals: [
      { id: 'military_zones_3', label: '軍事施設の4区画中3区画を発見', test: (m) => m.militaryZones >= 3 },
      { id: 'military_shortcut', label: '軍事施設のService Gateを開通', test: (m) => m.militaryShortcut },
      { id: 'rare_alloy', label: '軍用レア合金をDrone回収 / 発見', test: (m) => m.rareAlloyDiscovered },
      { id: 'drone_ports_2', label: 'Drone Portを2台設置', test: (m) => m.dronePorts >= 2 },
      { id: 'drone_throughput_3', label: 'Drone回収Routeの実効帯域を3.0個/秒にする', test: (m) => m.droneThroughput >= 3 },
    ],
    rewards: ['Rank 7 Progression', 'Research Data +2', '崩壊した研究施設 / Experimental Tier入口'],
  };
}

export function rankProgress(game) {
  const progression = core.ensureProgressionState(game);
  if (progression.progressionRank < 6) return core.rankProgress(game);
  if (progression.progressionRank >= PLAYABLE_MAX_RANK) {
    return {
      rank: progression.progressionRank,
      phaseCap: true,
      eligible: false,
      mandatory: null,
      optionals: [],
      optionalDone: 0,
      optionalRequired: 0,
      definition: null,
    };
  }
  const definition = getRankDefinition(6);
  const m = phase5Metrics(game);
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
  const progression = core.ensureProgressionState(game);
  if (progression.progressionRank < 6) return core.claimRankUp(game);
  if (progression.progressionRank >= PLAYABLE_MAX_RANK) return { changed: false, reason: 'phase-cap', progression };
  const progress = rankProgress(game);
  if (!progress.eligible) return { changed: false, reason: 'requirements', progress, progression };
  progression.progressionRank = 7;
  progression.researchData += 2;
  progression.history.push({ type: 'rank-up', rank: 7, at: new Date().toISOString() });
  progression.history = progression.history.slice(-100);
  return { changed: true, rank: 7, reward: { researchData: 2 }, progression, progress: rankProgress(game) };
}

export function researchState(game, researchId) {
  if (researchId !== 'drone_control_systems') return core.researchState(game, researchId);
  const progression = core.ensureProgressionState(game);
  const definition = RESEARCH[researchId];
  if (progression.completedResearch.includes(researchId)) {
    return { ...definition, exists: true, completed: true, available: false, reason: 'completed' };
  }
  if (progression.progressionRank < definition.requiredRank) {
    return { ...definition, exists: true, completed: false, available: false, reason: 'rank' };
  }
  if (!progression.blueprints.includes(definition.requiredBlueprint)) {
    return { ...definition, exists: true, completed: false, available: false, reason: 'blueprint' };
  }
  if (progression.researchData < definition.researchDataCost) {
    return { ...definition, exists: true, completed: false, available: false, reason: 'data' };
  }
  return { ...definition, exists: true, completed: false, available: true, reason: null };
}

export function completeResearch(game, researchId) {
  if (researchId !== 'drone_control_systems') return core.completeResearch(game, researchId);
  const progression = core.ensureProgressionState(game);
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
