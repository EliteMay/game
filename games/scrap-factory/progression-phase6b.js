import * as core from './progression-core.js';
import * as phase5c from './progression-phase5c.js';
import {
  CENTRAL_CORE_EXPERIMENTAL_BLUEPRINT,
  TRI_LAB_FABRICATION_BLUEPRINT,
  allResearchCargoSecured,
} from './final-chapter.js';

export * from './progression-phase5c.js';

export const RESEARCH = {
  ...phase5c.RESEARCH,
  experimental_fabrication: {
    id: 'experimental_fabrication',
    title: 'Tri-Lab Fabrication',
    name: '実験部品製造技術',
    category: 'Production',
    requiredRank: 7,
    researchDataCost: 1,
    requiredBlueprint: TRI_LAB_FABRICATION_BLUEPRINT,
    description: 'Robotics / Materials / Energy LabからFactoryへ確保した技術を統合し、Experimental Tier専用Fabricatorを解放する。',
    unlocks: ['building:fabricator'],
  },
  experimental_technology: {
    id: 'experimental_technology',
    title: 'Central Core Experimental Technology',
    name: '実験技術統合',
    category: 'Production',
    requiredRank: 7,
    researchDataCost: 4,
    requiredBlueprint: CENTRAL_CORE_EXPERIMENTAL_BLUEPRINT,
    description: 'Central Coreから復元した設計Dataを解析し、最終Experimental TierのCore Synthesis技術を確立する。',
    unlocks: ['tier:experimental', 'production:autonomous_core'],
  },
};

const PHASE6B_BUILDING_RANKS = {
  fabricator: 7,
};

const PHASE6B_BUILDING_RESEARCH = {
  fabricator: 'experimental_fabrication',
};

export function requiredBuildingRank(type) {
  return PHASE6B_BUILDING_RANKS[type] || phase5c.requiredBuildingRank(type);
}

export function buildingUnlockState(game, type) {
  if (!Object.prototype.hasOwnProperty.call(PHASE6B_BUILDING_RANKS, type)) {
    return phase5c.buildingUnlockState(game, type);
  }
  const progression = core.ensureProgressionState(game);
  const requiredRank = requiredBuildingRank(type);
  const requiredResearch = PHASE6B_BUILDING_RESEARCH[type];
  if (progression.progressionRank < requiredRank) {
    return { unlocked: false, reason: 'rank', requiredRank, requiredResearch };
  }
  const researched = progression.completedResearch.includes(requiredResearch)
    || progression.unlocks.includes(`building:${type}`);
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

function blueprintSatisfied(game, progression, definition) {
  if (!definition.requiredBlueprint) return true;
  if (progression.blueprints.includes(definition.requiredBlueprint)) return true;
  return definition.id === 'experimental_fabrication' && allResearchCargoSecured(game);
}

export function researchState(game, researchId) {
  if (!Object.prototype.hasOwnProperty.call(RESEARCH, researchId)
      || Object.prototype.hasOwnProperty.call(phase5c.RESEARCH, researchId)) {
    return phase5c.researchState(game, researchId);
  }
  const progression = core.ensureProgressionState(game);
  const definition = RESEARCH[researchId];
  if (progression.completedResearch.includes(researchId)) {
    return { ...definition, exists: true, completed: true, available: false, reason: 'completed' };
  }
  if (progression.progressionRank < definition.requiredRank) {
    return { ...definition, exists: true, completed: false, available: false, reason: 'rank' };
  }
  if (!blueprintSatisfied(game, progression, definition)) {
    return { ...definition, exists: true, completed: false, available: false, reason: 'blueprint' };
  }
  if (progression.researchData < definition.researchDataCost) {
    return { ...definition, exists: true, completed: false, available: false, reason: 'data' };
  }
  return { ...definition, exists: true, completed: false, available: true, reason: null };
}

export function completeResearch(game, researchId) {
  if (!Object.prototype.hasOwnProperty.call(RESEARCH, researchId)
      || Object.prototype.hasOwnProperty.call(phase5c.RESEARCH, researchId)) {
    return phase5c.completeResearch(game, researchId);
  }
  const progression = core.ensureProgressionState(game);
  const state = researchState(game, researchId);
  if (!state.available) return { changed: false, state, progression };
  if (state.requiredBlueprint && !progression.blueprints.includes(state.requiredBlueprint)) {
    progression.blueprints.push(state.requiredBlueprint);
  }
  progression.researchData -= state.researchDataCost;
  if (!progression.completedResearch.includes(researchId)) progression.completedResearch.push(researchId);
  for (const unlock of state.unlocks || []) if (!progression.unlocks.includes(unlock)) progression.unlocks.push(unlock);
  progression.history.push({ type: 'research', id: researchId, at: new Date().toISOString() });
  progression.history = progression.history.slice(-100);
  return { changed: true, state: researchState(game, researchId), progression };
}
