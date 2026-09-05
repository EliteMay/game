import * as core from './progression-core.js';
import * as phase6b from './progression-phase6b.js';

export * from './progression-phase6b.js';

export const RESEARCH = {
  ...phase6b.RESEARCH,
  experimental_technology: {
    ...phase6b.RESEARCH.experimental_technology,
    description: 'Central Coreから復元した設計Dataを統合し、Advanced Drone、Experimental Power System、完全自動Component製造、Autonomous Industrial Core Recipeを解放する。',
    unlocks: [
      'tier:experimental',
      'production:autonomous_core',
      'production:automated_components',
      'building:advanced_drone_port',
      'building:experimental_power_system',
    ],
  },
};

const PHASE6C_BUILDING_RANKS = {
  advanced_drone_port: 7,
  advanced_drone_port_copper: 7,
  advanced_drone_port_plastic: 7,
  advanced_drone_port_electronics: 7,
  advanced_drone_port_scrap: 7,
  experimental_power_system: 7,
  fabricator_core: 7,
  assembler_plate: 5,
  assembler_motor: 5,
  assembler_circuit: 5,
};

const PHASE6C_BUILDING_RESEARCH = {
  advanced_drone_port: 'experimental_technology',
  advanced_drone_port_copper: 'experimental_technology',
  advanced_drone_port_plastic: 'experimental_technology',
  advanced_drone_port_electronics: 'experimental_technology',
  advanced_drone_port_scrap: 'experimental_technology',
  experimental_power_system: 'experimental_technology',
  fabricator_core: 'experimental_technology',
  assembler_plate: 'advanced_assembly',
  assembler_motor: 'advanced_assembly',
  assembler_circuit: 'advanced_assembly',
};

export function requiredBuildingRank(type) {
  return PHASE6C_BUILDING_RANKS[type] || phase6b.requiredBuildingRank(type);
}

export function buildingUnlockState(game, type) {
  if (!Object.prototype.hasOwnProperty.call(PHASE6C_BUILDING_RANKS, type)) {
    return phase6b.buildingUnlockState(game, type);
  }
  const progression = core.ensureProgressionState(game);
  const requiredRank = requiredBuildingRank(type);
  const requiredResearch = PHASE6C_BUILDING_RESEARCH[type] || null;
  if (progression.progressionRank < requiredRank) {
    return { unlocked: false, reason: 'rank', requiredRank, requiredResearch };
  }
  const researched = !requiredResearch
    || progression.completedResearch.includes(requiredResearch)
    || progression.unlocks.includes(`building:${type}`)
    || (type.startsWith('advanced_drone_port') && progression.unlocks.includes('building:advanced_drone_port'));
  return { unlocked: researched, reason: researched ? null : 'research', requiredRank, requiredResearch };
}

export function isBuildingUnlocked(game, type) {
  return buildingUnlockState(game, type).unlocked;
}

export function researchState(game, researchId) {
  if (researchId !== 'experimental_technology') return phase6b.researchState(game, researchId);
  const progression = core.ensureProgressionState(game);
  const definition = RESEARCH.experimental_technology;
  if (progression.completedResearch.includes(researchId)) {
    return { ...definition, exists: true, completed: true, available: false, reason: 'completed' };
  }
  if (progression.progressionRank < definition.requiredRank) {
    return { ...definition, exists: true, completed: false, available: false, reason: 'rank' };
  }
  if (definition.requiredBlueprint && !progression.blueprints.includes(definition.requiredBlueprint)) {
    return { ...definition, exists: true, completed: false, available: false, reason: 'blueprint' };
  }
  if (progression.researchData < definition.researchDataCost) {
    return { ...definition, exists: true, completed: false, available: false, reason: 'data' };
  }
  return { ...definition, exists: true, completed: false, available: true, reason: null };
}

export function completeResearch(game, researchId) {
  if (researchId !== 'experimental_technology') return phase6b.completeResearch(game, researchId);
  const progression = core.ensureProgressionState(game);
  const state = researchState(game, researchId);
  if (!state.available) return { changed: false, state, progression };
  progression.researchData -= state.researchDataCost;
  if (!progression.completedResearch.includes(researchId)) progression.completedResearch.push(researchId);
  for (const unlock of state.unlocks || []) if (!progression.unlocks.includes(unlock)) progression.unlocks.push(unlock);
  progression.history.push({ type: 'research', id: researchId, at: new Date().toISOString() });
  progression.history = progression.history.slice(-100);
  return { changed: true, state: researchState(game, researchId), progression };
}
