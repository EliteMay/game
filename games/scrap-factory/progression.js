// Compatibility entrypoint. Core progression stays stable while later phases layer explicit overrides.
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
} from './progression-phase5c.js';
