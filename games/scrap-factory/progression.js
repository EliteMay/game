// Compatibility entrypoint. Early Rank 1-3 rules are owned by progression-early-game.js.
// Later progression continues through the existing Phase 6-C chain.
export * from './progression-core.js';
export {
  PLAYABLE_MAX_RANK,
  RESEARCH,
  analyzeRank6DroneLine,
  buildingUnlockState,
  claimRankUp,
  completeResearch,
  getRankDefinition,
  isBuildingUnlocked,
  rankProgress,
  requiredBuildingRank,
  researchState,
} from './progression-early-game.js';
