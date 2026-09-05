import * as v4 from './exploration-core-v4.js';
import {
  CENTRAL_CORE_EXPERIMENTAL_BLUEPRINT,
  TRI_LAB_FABRICATION_BLUEPRINT,
  allResearchCargoSecured,
  consumeFinalComponentSet,
  finalComponentSetStatus,
} from './final-chapter.js';

export * from './exploration-core-v4.js';

export const EXPLORATION_AREAS = {
  ...v4.EXPLORATION_AREAS,
  research: {
    ...v4.EXPLORATION_AREAS.research,
    objective: '3 Labの技術をFactoryへ持ち帰り、FabricatorでExperimental部品を製造してCentral Coreを復旧する。',
    recommended: '空き4枠以上 / Special Cargoは正常帰還で確定 / Central CoreはFactory製造部品3種が必要',
  },
};

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function uniqueStrings(value) {
  return Array.isArray(value) ? [...new Set(value.map(String))] : [];
}

function defaultCentralCore() {
  return {
    fabricationSetInstalled: false,
    stabilizerOnline: false,
    archiveRecovered: false,
    rewardClaimed: false,
  };
}

function normalizeCentralCore(candidate) {
  const source = isObject(candidate) ? candidate : {};
  return {
    fabricationSetInstalled: Boolean(source.fabricationSetInstalled),
    stabilizerOnline: Boolean(source.stabilizerOnline),
    archiveRecovered: Boolean(source.archiveRecovered),
    rewardClaimed: Boolean(source.rewardClaimed),
  };
}

export function makeDefaultExploration() {
  const base = v4.makeDefaultExploration();
  base.areas.research.centralCore = defaultCentralCore();
  return base;
}

export function normalizeExploration(candidate) {
  const normalized = v4.normalizeExploration(candidate);
  normalized.areas.research.centralCore = normalizeCentralCore(candidate?.areas?.research?.centralCore);
  const core = normalized.areas.research.centralCore;
  const objective = normalized.areas.research.objective;
  if (core.archiveRecovered) {
    core.fabricationSetInstalled = true;
    core.stabilizerOnline = true;
    objective.centralCoreUnlocked = true;
    objective.completed = true;
  } else if (core.stabilizerOnline || core.fabricationSetInstalled) {
    core.fabricationSetInstalled = true;
    objective.centralCoreUnlocked = true;
  }
  return normalized;
}

export function ensureExplorationState(game) {
  const normalized = normalizeExploration(game?.exploration);
  if (!game) return normalized;
  if (isObject(game.exploration)) {
    for (const key of Object.keys(game.exploration)) {
      if (!Object.prototype.hasOwnProperty.call(normalized, key)) delete game.exploration[key];
    }
    Object.assign(game.exploration, normalized);
    return game.exploration;
  }
  game.exploration = normalized;
  return normalized;
}

function ensureProgressionLists(game) {
  game.progression ??= {};
  game.progression.blueprints = uniqueStrings(game.progression.blueprints);
  game.progression.completedResearch = uniqueStrings(game.progression.completedResearch);
  game.progression.unlocks = uniqueStrings(game.progression.unlocks);
  const data = Math.floor(Number(game.progression.researchData || 0));
  game.progression.researchData = Number.isFinite(data) ? Math.max(0, data) : 0;
  return game.progression;
}

function grantTriLabFabricationBlueprint(game) {
  if (!allResearchCargoSecured(game)) return false;
  const progression = ensureProgressionLists(game);
  if (progression.blueprints.includes(TRI_LAB_FABRICATION_BLUEPRINT)) return false;
  progression.blueprints.push(TRI_LAB_FABRICATION_BLUEPRINT);
  return true;
}

function grantCentralCoreReward(game, area) {
  const central = area.centralCore;
  if (central.rewardClaimed) return false;
  const progression = ensureProgressionLists(game);
  if (!progression.blueprints.includes(CENTRAL_CORE_EXPERIMENTAL_BLUEPRINT)) {
    progression.blueprints.push(CENTRAL_CORE_EXPERIMENTAL_BLUEPRINT);
  }
  progression.researchData += 4;
  central.rewardClaimed = true;
  return true;
}

export function returnFromExpedition(game) {
  const result = v4.returnFromExpedition(game);
  if (!result.changed) return result;
  ensureExplorationState(game);
  const fabricationBlueprintGranted = grantTriLabFabricationBlueprint(game);
  return { ...result, fabricationBlueprintGranted };
}

export function advanceResearchObjective(game, step) {
  if (!['central', 'stabilizer', 'archive'].includes(step)) {
    const result = v4.advanceResearchObjective(game, step);
    ensureExplorationState(game);
    return result;
  }

  const exploration = ensureExplorationState(game);
  const session = exploration.activeSession;
  const area = exploration.areas.research;
  if (!session || session.areaId !== v4.RESEARCH_AREA_ID) {
    return { changed: false, reason: 'no-session', progress: area };
  }
  const objective = area.objective;
  const central = area.centralCore;

  if (step === 'central') {
    if (objective.centralCoreUnlocked) return { changed: false, reason: 'done', progress: area };
    if (!objective.labsCompleted) return { changed: false, reason: 'needs-labs', progress: area };
    if (!allResearchCargoSecured(game)) return { changed: false, reason: 'needs-cargo', progress: area };
    const components = finalComponentSetStatus(game);
    if (!components.ready) return { changed: false, reason: 'needs-components', components, progress: area };
    const consumed = consumeFinalComponentSet(game);
    if (!consumed.changed) return { changed: false, reason: 'needs-components', components: finalComponentSetStatus(game), progress: area };
    central.fabricationSetInstalled = true;
    objective.centralCoreUnlocked = true;
    return { changed: true, step, consumed: consumed.consumed, progress: area };
  }

  if (step === 'stabilizer') {
    if (!objective.centralCoreUnlocked || !central.fabricationSetInstalled) return { changed: false, reason: 'needs-central', progress: area };
    if (central.stabilizerOnline) return { changed: false, reason: 'done', progress: area };
    central.stabilizerOnline = true;
    return { changed: true, step, progress: area };
  }

  if (!central.stabilizerOnline) return { changed: false, reason: 'needs-stabilizer', progress: area };
  if (central.archiveRecovered) return { changed: false, reason: 'done', progress: area };
  central.archiveRecovered = true;
  objective.completed = true;
  area.completedAt ||= new Date().toISOString();
  const rewardGranted = grantCentralCoreReward(game, area);
  return { changed: true, step, completed: true, rewardGranted, progress: area };
}

export function researchCentralState(game) {
  const exploration = ensureExplorationState(game);
  const area = exploration.areas.research;
  const central = area.centralCore;
  return {
    labsCompleted: Boolean(area.objective.labsCompleted),
    securedComponents: area.securedComponents.length,
    finalComponents: finalComponentSetStatus(game),
    fabricationSetInstalled: central.fabricationSetInstalled,
    centralCoreUnlocked: Boolean(area.objective.centralCoreUnlocked),
    stabilizerOnline: central.stabilizerOnline,
    archiveRecovered: central.archiveRecovered,
    completed: Boolean(area.objective.completed),
  };
}

export function explorationProgressSummary(game, areaId = v4.RESIDENTIAL_AREA_ID) {
  const summary = v4.explorationProgressSummary(game, areaId);
  if (!summary || areaId !== v4.RESEARCH_AREA_ID) return summary;
  const central = researchCentralState(game);
  return {
    ...summary,
    finalComponentsReady: central.finalComponents.ready,
    finalComponentCounts: central.finalComponents.counts,
    fabricationSetInstalled: central.fabricationSetInstalled,
    centralCoreUnlocked: central.centralCoreUnlocked,
    stabilizerOnline: central.stabilizerOnline,
    archiveRecovered: central.archiveRecovered,
  };
}

export function researchProgressSummary(game) {
  return explorationProgressSummary(game, v4.RESEARCH_AREA_ID);
}
