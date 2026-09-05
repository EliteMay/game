import * as core from './progression-core.js';

const PHASE4B_BUILDING_RANKS = {
  smart_sorter: 5,
};

export function requiredBuildingRank(type) {
  return PHASE4B_BUILDING_RANKS[type] || core.requiredBuildingRank(type);
}

export function buildingUnlockState(game, type) {
  if (!Object.prototype.hasOwnProperty.call(PHASE4B_BUILDING_RANKS, type)) {
    return core.buildingUnlockState(game, type);
  }
  const progression = core.ensureProgressionState(game);
  const requiredRank = requiredBuildingRank(type);
  return {
    unlocked: progression.progressionRank >= requiredRank,
    reason: progression.progressionRank >= requiredRank ? null : 'rank',
    requiredRank,
    requiredResearch: null,
  };
}

export function isBuildingUnlocked(game, type) {
  return buildingUnlockState(game, type).unlocked;
}
