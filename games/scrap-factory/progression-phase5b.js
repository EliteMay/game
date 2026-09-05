import * as phase5a from './progression-phase5a.js';

export * from './progression-phase5a.js';

const PHASE5B_BUILDING_RANKS = {
  conveyor_mk3: 6,
  priority_splitter: 6,
  overflow_splitter: 6,
};

export function requiredBuildingRank(type) {
  return PHASE5B_BUILDING_RANKS[type] || phase5a.requiredBuildingRank(type);
}

export function buildingUnlockState(game, type) {
  if (!Object.prototype.hasOwnProperty.call(PHASE5B_BUILDING_RANKS, type)) {
    return phase5a.buildingUnlockState(game, type);
  }
  const progression = phase5a.ensureProgressionState(game);
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
