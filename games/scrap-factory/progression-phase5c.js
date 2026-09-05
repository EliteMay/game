import * as core from './progression-core.js';
import * as phase5b from './progression-phase5b.js';

export * from './progression-phase5b.js';

const PHASE5C_BUILDING_RANKS = {
  industrial_generator: 6,
  logistics_warehouse: 6,
};

export function requiredBuildingRank(type) {
  return PHASE5C_BUILDING_RANKS[type] || phase5b.requiredBuildingRank(type);
}

export function buildingUnlockState(game, type) {
  if (!Object.prototype.hasOwnProperty.call(PHASE5C_BUILDING_RANKS, type)) {
    return phase5b.buildingUnlockState(game, type);
  }
  const progression = core.ensureProgressionState(game);
  const requiredRank = requiredBuildingRank(type);
  const unlocked = progression.progressionRank >= requiredRank;
  return {
    unlocked,
    reason: unlocked ? null : 'rank',
    requiredRank,
    requiredResearch: null,
  };
}

export function isBuildingUnlocked(game, type) {
  return buildingUnlockState(game, type).unlocked;
}
