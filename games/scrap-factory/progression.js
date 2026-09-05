// Compatibility entrypoint. Progression logic lives in progression-core.js so existing imports stay stable.
export * from './progression-core.js';
export { buildingUnlockState, isBuildingUnlocked, requiredBuildingRank } from './progression-phase4b.js';
