import assert from 'node:assert/strict';
import {
  INDUSTRIAL_AREA_ID,
  INDUSTRIAL_BLUEPRINT_ID,
  abandonExpedition,
  advanceIndustrialObjective,
  collectExplorationLoot,
  discoverExplorationZone,
  explorationAreaState,
  industrialProgressSummary,
  makeDefaultExploration,
  normalizeExploration,
  returnFromExpedition,
  startExpedition,
} from '../games/scrap-factory/exploration.js';
import {
  completeResearch,
  isBuildingUnlocked,
  isHandCraftUnlocked,
  makeDefaultProgression,
  researchState,
} from '../games/scrap-factory/progression.js';

function gameAt(rank = 5) {
  return {
    money: 0,
    lifetimeRevenue: 0,
    inventory: {
      metal_scrap: 0, copper_wire: 0, plastic: 0, e_waste: 0,
      crushed_metal: 0, iron_ingot: 0, iron_plate: 0, cable_bundle: 0, tool_kit: 0,
      circuit: 0, motor: 0, control_unit: 0,
    },
    discoveredItems: ['metal_scrap'],
    tutorialStats: { collected: 0, processed: 0, automationComplete: false },
    buildings: [],
    progression: { ...makeDefaultProgression(), progressionRank: rank, researchData: 0 },
    exploration: makeDefaultExploration(),
  };
}

{
  const game = gameAt(4);
  assert.equal(explorationAreaState(game, INDUSTRIAL_AREA_ID).unlocked, false, 'abandoned factory must stay locked before Rank 5');
  game.progression.progressionRank = 5;
  assert.equal(explorationAreaState(game, INDUSTRIAL_AREA_ID).unlocked, true, 'abandoned factory should unlock at Rank 5');
}

{
  const normalized = normalizeExploration({
    version: 999,
    areas: {
      residential: { discoveredZones: ['entrance'] },
      industrial: {
        discoveredZones: ['arrival', 'bad-zone', 'arrival'],
        objective: { generatorRestored: true, shortcutOpened: true },
      },
    },
  });
  assert.equal(normalized.version, 1, 'additive area expansion must not bump or reject the existing exploration schema');
  assert.deepEqual(normalized.areas.residential.discoveredZones, ['entrance']);
  assert.deepEqual(normalized.areas.industrial.discoveredZones, ['arrival']);
  assert.equal(normalized.areas.industrial.objective.generatorRestored, true);
  assert.equal(normalized.areas.industrial.objective.shortcutOpened, true);
}

{
  const game = gameAt(5);
  const started = startExpedition(game, INDUSTRIAL_AREA_ID);
  assert.equal(started.changed, true);
  assert.equal(game.exploration.activeSession.areaId, INDUSTRIAL_AREA_ID);

  for (const zone of ['arrival', 'generator_hall', 'assembly_floor', 'control_room']) {
    assert.equal(discoverExplorationZone(game, zone).changed, true);
  }
  assert.equal(discoverExplorationZone(game, 'control_room').reason, 'known-zone');

  assert.equal(advanceIndustrialObjective(game, 'control').reason, 'needs-generator');
  assert.equal(advanceIndustrialObjective(game, 'generator').changed, true);
  assert.equal(advanceIndustrialObjective(game, 'blueprint').reason, 'needs-control');
  assert.equal(advanceIndustrialObjective(game, 'control').changed, true);
  assert.equal(advanceIndustrialObjective(game, 'shortcut').changed, true);

  const beforeReward = game.progression.researchData;
  const blueprint = advanceIndustrialObjective(game, 'blueprint');
  assert.equal(blueprint.changed, true);
  assert.equal(blueprint.completed, true);
  assert.ok(game.progression.blueprints.includes(INDUSTRIAL_BLUEPRINT_ID), 'main objective must guarantee the recovered assembly blueprint');
  assert.equal(game.progression.researchData, beforeReward + 2, 'abandoned factory objective should grant exactly two Research Data');
  assert.equal(advanceIndustrialObjective(game, 'blueprint').changed, false);
  assert.equal(game.progression.researchData, beforeReward + 2, 'repeating blueprint interaction must not duplicate rewards');

  assert.equal(collectExplorationLoot(game, 'industrial-loot-a', 'e_waste', 2).changed, true);
  assert.equal(collectExplorationLoot(game, 'industrial-loot-b', 'iron_plate', 1).changed, true);
  const returned = returnFromExpedition(game);
  assert.equal(returned.changed, true);
  assert.equal(returned.moved, 3);
  const summary = industrialProgressSummary(game);
  assert.equal(summary.completed, true);
  assert.equal(summary.shortcutOpened, true);
  assert.equal(summary.discovered, 4);
  assert.equal(summary.successfulReturns, 1);
  assert.equal(summary.returnedLootTotal, 3);

  const research = researchState(game, 'advanced_assembly');
  assert.equal(research.available, true, 'guaranteed blueprint reward must immediately make Advanced Assembly researchable');
  assert.equal(completeResearch(game, 'advanced_assembly').changed, true);
  assert.equal(isBuildingUnlocked(game, 'assembler'), true);
  assert.equal(isHandCraftUnlocked(game, 'circuit'), true);
  assert.equal(isHandCraftUnlocked(game, 'motor'), true);
}

{
  const game = gameAt(5);
  startExpedition(game, INDUSTRIAL_AREA_ID);
  discoverExplorationZone(game, 'arrival');
  advanceIndustrialObjective(game, 'generator');
  collectExplorationLoot(game, 'temporary-industrial-loot', 'e_waste', 3);
  const lost = abandonExpedition(game);
  assert.equal(lost.changed, true);
  assert.equal(lost.lost, 3);
  assert.equal(game.exploration.activeSession, null);
  assert.deepEqual(game.exploration.depot, {}, 'abandoned industrial session loot must not enter the depot');
  assert.equal(game.exploration.areas.industrial.discoveredZones.includes('arrival'), true);
  assert.equal(game.exploration.areas.industrial.objective.generatorRestored, true, 'facility restoration progress must persist after abandon');
}

console.log('Industrial exploration regression tests passed.');
