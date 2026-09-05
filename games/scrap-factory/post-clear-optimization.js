import { BUILDINGS } from './config.js';
import { analyzeFinalAutomation } from './final-automation.js';
import { computePowerSnapshot } from './power.js';
import { isStorageBuilding, storageAmount, storageCapacity } from './storage-capacity.js';

export const POST_CLEAR_OPTIMIZATION_VERSION = 1;

export const POST_CLEAR_OBJECTIVES = Object.freeze([
  {
    id: 'power_headroom',
    title: 'POWER HEADROOM',
    description: 'Main Clear後の工場でPower Shortageを起こさず、240 Power以上の余力を確保する。',
  },
  {
    id: 'storage_headroom',
    title: 'BUFFER RESERVE',
    description: 'Factory Storageを合計3,600容量以上へ拡張し、1,800以上の空きを維持する。',
  },
  {
    id: 'logistics_backbone',
    title: 'LOGISTICS BACKBONE',
    description: 'Mk.3 Conveyor 18基、Priority / Overflow系4基、Logistics Warehouse 2基以上で高密度物流を構成する。',
  },
  {
    id: 'redundant_automation',
    title: 'REDUNDANT AUTOMATION',
    description: '最終自動化Lineを維持したまま、Experimental Powerを2基、Advanced Drone Portを6基以上へ冗長化する。',
  },
]);

const OBJECTIVE_IDS = new Set(POST_CLEAR_OBJECTIVES.map((objective) => objective.id));

export function makeDefaultPostClearOptimization() {
  return {
    version: POST_CLEAR_OPTIMIZATION_VERSION,
    completedObjectiveIds: [],
    completedAt: {},
    masteredAt: null,
  };
}

function validTimestamp(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function normalizePostClearOptimization(candidate) {
  const base = makeDefaultPostClearOptimization();
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return base;
  const completedObjectiveIds = Array.isArray(candidate.completedObjectiveIds)
    ? [...new Set(candidate.completedObjectiveIds.map(String).filter((id) => OBJECTIVE_IDS.has(id)))]
    : [];
  const completedAt = {};
  if (candidate.completedAt && typeof candidate.completedAt === 'object' && !Array.isArray(candidate.completedAt)) {
    for (const id of completedObjectiveIds) {
      const timestamp = validTimestamp(candidate.completedAt[id]);
      if (timestamp) completedAt[id] = timestamp;
    }
  }
  return {
    version: POST_CLEAR_OPTIMIZATION_VERSION,
    completedObjectiveIds,
    completedAt,
    masteredAt: validTimestamp(candidate.masteredAt),
  };
}

function countByType(buildings) {
  const counts = {};
  for (const building of buildings) counts[building.type] = Number(counts[building.type] || 0) + 1;
  return counts;
}

function clampRatio(value) {
  return Math.min(1, Math.max(0, Number(value || 0)));
}

function ratioForParts(parts) {
  if (!parts.length) return 0;
  return clampRatio(parts.reduce((sum, value) => sum + clampRatio(value), 0) / parts.length);
}

export function buildOptimizationSnapshot(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const counts = countByType(buildings);
  const power = computePowerSnapshot(game || {});
  const finalAutomation = analyzeFinalAutomation(game || {});
  let capacity = 0;
  let used = 0;
  for (const building of buildings) {
    if (!isStorageBuilding(building)) continue;
    capacity += storageCapacity(building);
    used += storageAmount(building);
  }
  const advancedDronePorts = buildings.filter((building) => String(building.type || '').startsWith('advanced_drone_port')).length;
  const adaptiveSplitters = Number(counts.priority_splitter || 0) + Number(counts.overflow_splitter || 0);
  return {
    unlocked: Boolean(game?.finalChapter?.mainClearedAt),
    power: {
      status: power.status,
      reserve: Math.max(0, Number(power.reserve || 0)),
    },
    storage: {
      capacity,
      remaining: Math.max(0, capacity - used),
    },
    logistics: {
      mk3: Number(counts.conveyor_mk3 || 0),
      adaptiveSplitters,
      warehouses: Number(counts.logistics_warehouse || 0),
    },
    redundancy: {
      finalAutomation: Boolean(finalAutomation.qualifies),
      experimentalPowerSystems: Number(finalAutomation.experimentalPowerSystems || 0),
      advancedDronePorts,
    },
  };
}

function lockedState(objective) {
  return {
    ...objective,
    locked: true,
    done: false,
    ratio: 0,
    detail: 'MAIN CLEAR後に解放',
  };
}

export function evaluateOptimizationSnapshot(snapshot) {
  return POST_CLEAR_OBJECTIVES.map((objective) => {
    if (!snapshot?.unlocked) return lockedState(objective);
    if (objective.id === 'power_headroom') {
      const reserve = Math.max(0, Number(snapshot.power?.reserve || 0));
      const healthy = snapshot.power?.status === 'ok';
      return {
        ...objective,
        locked: false,
        done: healthy && reserve >= 240,
        ratio: ratioForParts([healthy ? 1 : 0, reserve / 240]),
        detail: (healthy ? 'GRID OK' : 'POWER ALERT') + ' / 余力 ' + Math.floor(reserve) + ' / 240',
      };
    }
    if (objective.id === 'storage_headroom') {
      const capacity = Math.max(0, Number(snapshot.storage?.capacity || 0));
      const remaining = Math.max(0, Number(snapshot.storage?.remaining || 0));
      return {
        ...objective,
        locked: false,
        done: capacity >= 3600 && remaining >= 1800,
        ratio: ratioForParts([capacity / 3600, remaining / 1800]),
        detail: '容量 ' + Math.floor(capacity) + ' / 3600 ・ 空き ' + Math.floor(remaining) + ' / 1800',
      };
    }
    if (objective.id === 'logistics_backbone') {
      const mk3 = Math.max(0, Number(snapshot.logistics?.mk3 || 0));
      const splitters = Math.max(0, Number(snapshot.logistics?.adaptiveSplitters || 0));
      const warehouses = Math.max(0, Number(snapshot.logistics?.warehouses || 0));
      return {
        ...objective,
        locked: false,
        done: mk3 >= 18 && splitters >= 4 && warehouses >= 2,
        ratio: ratioForParts([mk3 / 18, splitters / 4, warehouses / 2]),
        detail: 'Mk.3 ' + mk3 + '/18 ・ Priority/Overflow ' + splitters + '/4 ・ Warehouse ' + warehouses + '/2',
      };
    }
    const finalAutomation = Boolean(snapshot.redundancy?.finalAutomation);
    const powerSystems = Math.max(0, Number(snapshot.redundancy?.experimentalPowerSystems || 0));
    const dronePorts = Math.max(0, Number(snapshot.redundancy?.advancedDronePorts || 0));
    return {
      ...objective,
      locked: false,
      done: finalAutomation && powerSystems >= 2 && dronePorts >= 6,
      ratio: ratioForParts([finalAutomation ? 1 : 0, powerSystems / 2, dronePorts / 6]),
      detail: (finalAutomation ? 'FINAL LINE OK' : 'FINAL LINE BREAK') + ' ・ Experimental Power ' + powerSystems + '/2 ・ Advanced Drone ' + dronePorts + '/6',
    };
  });
}

function timestamp(now) {
  const date = now instanceof Date ? now : new Date(now);
  return date.toISOString();
}

export function applyOptimizationResults(game, objectiveStates, now = new Date()) {
  const state = normalizePostClearOptimization(game?.postClearOptimization);
  if (!game || typeof game !== 'object') return { changed: false, newlyCompleted: [], mastered: false, state };
  game.postClearOptimization = state;
  if (!game.finalChapter?.mainClearedAt) return { changed: false, newlyCompleted: [], mastered: false, state };

  const newlyCompleted = [];
  const completed = new Set(state.completedObjectiveIds);
  for (const objective of objectiveStates || []) {
    if (!objective?.done || !OBJECTIVE_IDS.has(objective.id) || completed.has(objective.id)) continue;
    completed.add(objective.id);
    state.completedObjectiveIds.push(objective.id);
    state.completedAt[objective.id] = timestamp(now);
    newlyCompleted.push(objective.id);
  }

  let masteredNow = false;
  if (!state.masteredAt && POST_CLEAR_OBJECTIVES.every((objective) => completed.has(objective.id))) {
    state.masteredAt = timestamp(now);
    masteredNow = true;
  }
  return {
    changed: newlyCompleted.length > 0 || masteredNow,
    newlyCompleted,
    mastered: Boolean(state.masteredAt),
    masteredNow,
    state,
  };
}

export function optimizationStatus(game) {
  const snapshot = buildOptimizationSnapshot(game || {});
  const objectives = evaluateOptimizationSnapshot(snapshot);
  const state = normalizePostClearOptimization(game?.postClearOptimization);
  return {
    unlocked: snapshot.unlocked,
    snapshot,
    objectives,
    state,
    completed: state.completedObjectiveIds.length,
    total: POST_CLEAR_OBJECTIVES.length,
    mastered: Boolean(state.masteredAt),
  };
}

export function recordPostClearOptimization(game, now = new Date()) {
  const snapshot = buildOptimizationSnapshot(game || {});
  const objectives = evaluateOptimizationSnapshot(snapshot);
  const applied = applyOptimizationResults(game, objectives, now);
  return { ...applied, snapshot, objectives };
}
