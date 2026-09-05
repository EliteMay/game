import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILDINGS, BUILD_MENU_ORDER, ITEMS, RECIPES } from '../games/scrap-factory/config.js';
import {
  CENTRAL_CORE_EXPERIMENTAL_BLUEPRINT,
  FINAL_COMPONENT_IDS,
  TRI_LAB_FABRICATION_BLUEPRINT,
  consumeFinalComponentSet,
  finalComponentSetStatus,
} from '../games/scrap-factory/final-chapter.js';
import {
  RESEARCH_AREA_ID,
  RESEARCH_COMPONENTS,
  advanceResearchObjective,
  collectResearchCargo,
  makeDefaultExploration,
  normalizeExploration,
  researchCentralState,
  returnFromExpedition,
  startExpedition,
} from '../games/scrap-factory/exploration.js';
import {
  PLAYABLE_MAX_RANK,
  completeResearch,
  isBuildingUnlocked,
  makeDefaultProgression,
  researchState,
} from '../games/scrap-factory/progression.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function gameAt(rank = 7) {
  return {
    money: 20000,
    lifetimeRevenue: 20000,
    inventory: Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])),
    discoveredItems: ['metal_scrap', 'rare_alloy'],
    tutorialStats: { collected: 100, processed: 100, automationComplete: true },
    buildings: [],
    progression: { ...makeDefaultProgression(), progressionRank: rank, researchData: 8 },
    exploration: makeDefaultExploration(),
  };
}

function recoverAndSecureThreeLabs(game) {
  startExpedition(game, RESEARCH_AREA_ID);
  advanceResearchObjective(game, 'access');
  for (const labId of ['robotics', 'materials', 'energy']) {
    assert.equal(advanceResearchObjective(game, labId).changed, true);
    assert.equal(collectResearchCargo(game, RESEARCH_COMPONENTS[labId].id).changed, true);
  }
  const returned = returnFromExpedition(game);
  assert.equal(returned.secured, 3);
  return returned;
}

assert.equal(PLAYABLE_MAX_RANK, 7, 'Phase 6-B must keep Rank 7 as the Rank-Up cap');
assert.deepEqual(BUILD_MENU_ORDER.slice(0, 5), ['crusher', 'smelter', 'conveyor', 'storage', 'seller'], 'Quick Build 1-5 must remain stable');
assert.ok(ITEMS.ai_control_module && ITEMS.experimental_frame && ITEMS.experimental_power_module, 'Rank 7 final components must be configured');
assert.equal(BUILDINGS.fabricator.recipe, 'fabricator_experimental_set');
assert.equal(BUILDINGS.fabricator.powerUse, 110);
assert.equal(Object.keys(RECIPES.fabricator_experimental_set.input).length <= 4, true, 'final-tier Fabricator batch must respect the <=4 input requirement');
assert.deepEqual(Object.keys(RECIPES.fabricator_experimental_set.output).sort(), [...FINAL_COMPONENT_IDS].sort());

{
  const normalized = normalizeExploration({
    version: 1,
    areas: {
      research: {
        objective: { accessRelayOnline: true, roboticsRecovered: true, materialsRecovered: true, energyRecovered: true, labsCompleted: true },
        securedComponents: Object.values(RESEARCH_COMPONENTS).map((entry) => entry.id),
      },
    },
  });
  assert.equal(normalized.version, 1, 'Exploration Schema must remain v1');
  assert.equal(normalized.areas.research.objective.labsCompleted, true, 'Phase 6-A Lab progress must survive Phase 6-B normalization');
  assert.deepEqual(normalized.areas.research.centralCore, {
    fabricationSetInstalled: false,
    stabilizerOnline: false,
    archiveRecovered: false,
    rewardClaimed: false,
  });
}

{
  const game = gameAt(7);
  assert.equal(researchState(game, 'experimental_fabrication').reason, 'blueprint');
  const returned = recoverAndSecureThreeLabs(game);
  assert.equal(returned.fabricationBlueprintGranted, true, 'normal return with all three Special Cargo should grant the fabrication blueprint');
  assert.ok(game.progression.blueprints.includes(TRI_LAB_FABRICATION_BLUEPRINT));
  assert.equal(researchState(game, 'experimental_fabrication').available, true);
  assert.equal(completeResearch(game, 'experimental_fabrication').changed, true);
  assert.equal(isBuildingUnlocked(game, 'fabricator'), true, 'Tri-Lab Fabrication research must unlock Fabricator');
}

{
  const game = gameAt(7);
  game.exploration.areas.research.objective = {
    ...game.exploration.areas.research.objective,
    accessRelayOnline: true,
    roboticsRecovered: true,
    materialsRecovered: true,
    energyRecovered: true,
    labsCompleted: true,
  };
  game.exploration.areas.research.securedComponents = Object.values(RESEARCH_COMPONENTS).map((entry) => entry.id);
  assert.equal(game.progression.blueprints.includes(TRI_LAB_FABRICATION_BLUEPRINT), false, 'legacy Phase 6-A save intentionally starts without the new synthetic blueprint');
  assert.equal(researchState(game, 'experimental_fabrication').available, true, 'legacy 3/3 secured cargo must satisfy the fabrication gate without another expedition');
  assert.equal(completeResearch(game, 'experimental_fabrication').changed, true);
  assert.ok(game.progression.blueprints.includes(TRI_LAB_FABRICATION_BLUEPRINT), 'completing compatibility research should materialize the blueprint in progression history');
}

{
  const game = gameAt(7);
  game.inventory.ai_control_module = 1;
  game.buildings.push({ id: 'warehouse', type: 'logistics_warehouse', output: { experimental_frame: 1 }, input: {} });
  game.buildings.push({ id: 'queued', type: 'fabricator', output: {}, input: { experimental_power_module: 1 } });
  const blocked = finalComponentSetStatus(game);
  assert.equal(blocked.ready, false, 'machine input queues must not count as Central Core installation stock');
  const failed = consumeFinalComponentSet(game);
  assert.equal(failed.changed, false, 'component consumption must be atomic when the set is incomplete');
  assert.equal(game.inventory.ai_control_module, 1, 'failed atomic consume must not remove available parts');
  assert.equal(game.buildings[0].output.experimental_frame, 1);

  game.buildings.push({ id: 'fabricator-output', type: 'fabricator', output: { experimental_power_module: 1 }, input: {} });
  assert.equal(finalComponentSetStatus(game).ready, true);
  const consumed = consumeFinalComponentSet(game);
  assert.equal(consumed.changed, true);
  assert.equal(game.inventory.ai_control_module, 0);
  assert.equal(game.buildings[0].output.experimental_frame, 0);
  assert.equal(game.buildings[2].output.experimental_power_module, 0);
  assert.equal(game.buildings[1].input.experimental_power_module, 1, 'Central Core install must not consume machine input queues');
}

{
  const game = gameAt(7);
  recoverAndSecureThreeLabs(game);
  assert.equal(completeResearch(game, 'experimental_fabrication').changed, true);
  assert.equal(startExpedition(game, RESEARCH_AREA_ID).changed, true);

  assert.equal(advanceResearchObjective(game, 'central').reason, 'needs-components', 'Central Core must require Factory-manufactured final components after cargo is secured');
  game.inventory.ai_control_module = 1;
  game.inventory.experimental_frame = 1;
  game.buildings.push({ id: 'final-output', type: 'fabricator', input: {}, output: { experimental_power_module: 1 } });

  const central = advanceResearchObjective(game, 'central');
  assert.equal(central.changed, true);
  assert.equal(game.exploration.areas.research.objective.centralCoreUnlocked, true);
  assert.equal(game.exploration.areas.research.centralCore.fabricationSetInstalled, true);
  assert.equal(game.inventory.ai_control_module, 0);
  assert.equal(game.inventory.experimental_frame, 0);
  assert.equal(game.buildings[0].output.experimental_power_module, 0);
  assert.equal(advanceResearchObjective(game, 'central').reason, 'done', 'Central Core component set must not be consumed twice');

  assert.equal(advanceResearchObjective(game, 'archive').reason, 'needs-stabilizer');
  assert.equal(advanceResearchObjective(game, 'stabilizer').changed, true);
  const beforeData = game.progression.researchData;
  const archive = advanceResearchObjective(game, 'archive');
  assert.equal(archive.changed, true);
  assert.equal(archive.completed, true);
  assert.equal(game.exploration.areas.research.objective.completed, true, 'Central Archive recovery should complete the Research Facility, not Main Clear');
  assert.ok(game.progression.blueprints.includes(CENTRAL_CORE_EXPERIMENTAL_BLUEPRINT));
  assert.equal(game.progression.researchData, beforeData + 4, 'Central Core must guarantee the Research Data required for Experimental Technology');
  assert.equal(advanceResearchObjective(game, 'archive').reason, 'done');
  assert.equal(game.progression.researchData, beforeData + 4, 'Central Core reward must remain idempotent');

  const coreState = researchCentralState(game);
  assert.equal(coreState.archiveRecovered, true);
  assert.equal(coreState.completed, true);
  assert.equal(researchState(game, 'experimental_technology').available, true);
  assert.equal(completeResearch(game, 'experimental_technology').changed, true);
  assert.ok(game.progression.unlocks.includes('tier:experimental'));
}

{
  const game = gameAt(7);
  startExpedition(game, RESEARCH_AREA_ID);
  advanceResearchObjective(game, 'access');
  for (const labId of ['robotics', 'materials', 'energy']) advanceResearchObjective(game, labId);
  assert.equal(advanceResearchObjective(game, 'central').reason, 'needs-cargo', 'Lab recovery alone must not bypass normal-return Special Cargo security');
}

{
  const config = fs.readFileSync(path.join(root, 'games/scrap-factory/config.js'), 'utf8');
  const researchHtml = fs.readFileSync(path.join(root, 'games/scrap-factory/exploration/research.html'), 'utf8');
  const explorationEntrypoint = fs.readFileSync(path.join(root, 'games/scrap-factory/exploration.js'), 'utf8');
  const progressionEntrypoint = fs.readFileSync(path.join(root, 'games/scrap-factory/progression.js'), 'utf8');
  assert.ok(config.includes('fabricator_experimental_set'));
  assert.ok(explorationEntrypoint.includes('exploration-core-v5.js'), 'exploration entrypoint must use Phase 6-B core');
  assert.ok(progressionEntrypoint.includes('progression-phase6b.js'), 'progression entrypoint must use Phase 6-B layer');
  assert.match(researchHtml, /research-phase6b\.js/, 'Research Facility must load the Phase 6-B Central Core runtime');
}

console.log('Phase 6-B Fabricator / Central Core tests passed.');
