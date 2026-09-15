// Compatibility entrypoint. Early Rank 1-3 rules are owned by progression-early-game.js.
// Later progression continues through progression-phase6c.js, which preserves the
// existing progression-phase6b.js compatibility chain and its Phase 6-B contracts.
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
