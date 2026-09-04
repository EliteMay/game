import { BUILDINGS } from './config.js';

export const POWER_VERSION = 1;
export const POWER_ENABLE_RANK = 4;
export const STARTER_GRID_CAPACITY = 55;
export const STARTER_GRID_RADIUS = 17.5;
export const POWER_POLE_RADIUS = 10;
export const POWER_LINK_RANGE = 12.5;
export const GENERATOR_FUEL_SECONDS = 24;

function distance(a, b) {
  return Math.hypot(Number(a?.x || 0) - Number(b?.x || 0), Number(a?.z || 0) - Number(b?.z || 0));
}

function progressionRank(game) {
  const rank = Math.floor(Number(game?.progression?.progressionRank || 1));
  return Number.isFinite(rank) ? Math.max(1, Math.min(7, rank)) : 1;
}

export function powerEnabled(game) {
  return progressionRank(game) >= POWER_ENABLE_RANK;
}

export function buildingPowerUse(building) {
  return Math.max(0, Number(BUILDINGS[building?.type]?.powerUse || 0));
}

export function buildingPowerGeneration(building) {
  return Math.max(0, Number(BUILDINGS[building?.type]?.powerGeneration || 0));
}

export function generatorActive(building) {
  return buildingPowerGeneration(building) > 0 && Number(building?.powerFuelSeconds || 0) > 0;
}

export function tickGeneratorFuel(buildings, delta) {
  const elapsed = Math.max(0, Number(delta || 0));
  for (const building of buildings || []) {
    if (buildingPowerGeneration(building) <= 0) continue;
    building.input ??= {};
    let remaining = Math.max(0, Number(building.powerFuelSeconds || 0));
    if (remaining <= 0 && Number(building.input.metal_scrap || 0) > 0) {
      building.input.metal_scrap -= 1;
      remaining = GENERATOR_FUEL_SECONDS;
    }
    building.powerFuelSeconds = Math.max(0, remaining - elapsed);
  }
}

function starterGridCovers(building) {
  return Math.hypot(Number(building?.x || 0), Number(building?.z || 0)) <= STARTER_GRID_RADIUS;
}

function connectedPoleIds(buildings) {
  const poles = (buildings || []).filter((building) => building.type === 'power_pole');
  const generators = (buildings || []).filter((building) => buildingPowerGeneration(building) > 0);
  const connected = new Set();

  for (const pole of poles) {
    const anchored = starterGridCovers(pole) || generators.some((generator) => distance(generator, pole) <= POWER_LINK_RANGE);
    if (anchored) connected.add(pole.id);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const pole of poles) {
      if (connected.has(pole.id)) continue;
      if (poles.some((other) => connected.has(other.id) && distance(other, pole) <= POWER_LINK_RANGE)) {
        connected.add(pole.id);
        changed = true;
      }
    }
  }
  return connected;
}

function consumerCovered(building, poles, connected) {
  if (starterGridCovers(building)) return true;
  return poles.some((pole) => connected.has(pole.id) && distance(pole, building) <= POWER_POLE_RADIUS);
}

function consumerPriority(building) {
  const priorities = { crusher: 10, smelter: 20, storage: 30 };
  return priorities[building?.type] ?? 50;
}

export function computePowerSnapshot(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  if (!powerEnabled(game)) {
    return {
      enabled: false,
      status: 'legacy',
      generation: 0,
      demand: 0,
      coveredDemand: 0,
      poweredIds: new Set(buildings.map((building) => building.id)),
      unpoweredIds: new Set(),
      uncoveredIds: new Set(),
      connectedPoleIds: new Set(),
      activeGenerators: 0,
      starterCapacity: STARTER_GRID_CAPACITY,
    };
  }

  const poles = buildings.filter((building) => building.type === 'power_pole');
  const connected = connectedPoleIds(buildings);
  const consumers = buildings.filter((building) => buildingPowerUse(building) > 0);
  const uncovered = new Set(consumers.filter((building) => !consumerCovered(building, poles, connected)).map((building) => building.id));
  const activeGenerators = buildings.filter(generatorActive);
  const generation = STARTER_GRID_CAPACITY + activeGenerators.reduce((sum, building) => sum + buildingPowerGeneration(building), 0);
  const demand = consumers.reduce((sum, building) => sum + buildingPowerUse(building), 0);
  const covered = consumers.filter((building) => !uncovered.has(building.id));
  const coveredDemand = covered.reduce((sum, building) => sum + buildingPowerUse(building), 0);
  const powered = new Set();
  const unpowered = new Set(uncovered);
  let available = generation;

  const ordered = [...covered].sort((a, b) => (
    consumerPriority(a) - consumerPriority(b)
    || String(a.id).localeCompare(String(b.id))
  ));
  for (const building of ordered) {
    const use = buildingPowerUse(building);
    if (use <= available + 1e-9) {
      powered.add(building.id);
      available -= use;
    } else {
      unpowered.add(building.id);
    }
  }

  return {
    enabled: true,
    status: unpowered.size ? 'shortage' : 'ok',
    generation,
    demand,
    coveredDemand,
    reserve: Math.max(0, available),
    poweredIds: powered,
    unpoweredIds: unpowered,
    uncoveredIds: uncovered,
    connectedPoleIds: connected,
    activeGenerators: activeGenerators.length,
    starterCapacity: STARTER_GRID_CAPACITY,
  };
}

export function isBuildingPowered(game, building, snapshot = computePowerSnapshot(game)) {
  if (!snapshot.enabled || buildingPowerUse(building) <= 0) return true;
  return snapshot.poweredIds.has(building?.id);
}

export function powerReason(building, snapshot) {
  if (!snapshot?.enabled || buildingPowerUse(building) <= 0) return null;
  if (snapshot.poweredIds.has(building.id)) return null;
  if (snapshot.uncoveredIds.has(building.id)) return 'coverage';
  return 'shortage';
}

export function powerSummary(snapshot) {
  if (!snapshot?.enabled) return 'Starter Grid待機中 / Rank 4で電力管理開始';
  if (snapshot.status === 'shortage') {
    const uncovered = snapshot.uncoveredIds.size;
    return uncovered
      ? `POWER ALERT: 給電範囲外 ${uncovered}台 / ${snapshot.generation}供給 / ${snapshot.demand}需要`
      : `POWER ALERT: ${snapshot.generation}供給 / ${snapshot.demand}需要`;
  }
  return `POWER OK: ${snapshot.generation}供給 / ${snapshot.demand}需要 / 余力 ${Math.floor(snapshot.reserve || 0)}`;
}
