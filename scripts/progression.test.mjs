import assert from 'node:assert/strict';
import {
  claimRankUp,
  completeResearch,
  hasAutomatedCrushedMetalLine,
  hasAutomatedIronLine,
  isBuildingUnlocked,
  isHandCraftUnlocked,
  makeDefaultProgression,
  normalizeProgression,
  rankProgress,
  researchState,
} from '../games/scrap-factory/progression.js';

function building(id, type, x, z, rotation = 0, permanent = false) {
  return { id, type, x, z, rotation, permanent, input: {}, output: {}, progress: 0 };
}

function rankOneLineGame() {
  return {
    money: 0,
    lifetimeRevenue: 250,
    inventory: {},
    discoveredItems: ['metal_scrap'],
    tutorialStats: { collected: 0, processed: 0, automationComplete: false },
    progression: makeDefaultProgression(),
    buildings: [
      building('hopper', 'hopper', -5, 0, 0, true),
      building('belt-a', 'conveyor', -2.5, 0, 0),
      building('crusher', 'crusher', 0, 0, 0),
      building('belt-b', 'conveyor', 2.5, 0, 0),
      building('seller', 'seller', 5, 0, Math.PI, true),
    ],
  };
}

function rankTwoLineGame() {
  return {
    money: 0,
    lifetimeRevenue: 900,
    inventory: {},
    discoveredItems: ['metal_scrap', 'crushed_metal', 'iron_ingot'],
    tutorialStats: { collected: 15, processed: 12, automationComplete: true },
    progression: { ...makeDefaultProgression(), progressionRank: 2, researchData: 1 },
    buildings: [
      building('hopper', 'hopper', -7.5, 0, 0, true),
      building('belt-a', 'conveyor', -5, 0, 0),
      building('crusher', 'crusher', -2.5, 0, 0),
      building('belt-b', 'conveyor', 0, 0, 0),
      building('smelter', 'smelter', 2.5, 0, 0),
      building('belt-c', 'conveyor', 5, 0, 0),
      building('seller', 'seller', 7.5, 0, Math.PI, true),
      building('storage', 'storage', 0, 5, 0),
      building('extra-crusher', 'crusher', 2.5, 5, 0),
    ],
  };
}

{
  const game = rankOneLineGame();
  assert.equal(hasAutomatedCrushedMetalLine(game), true, 'Rank 1 directional line should be detected');
  let progress = rankProgress(game);
  assert.equal(progress.mandatory.done, true, 'mandatory line should be complete');
  assert.equal(progress.optionalDone, 1, 'revenue alone must count as only one optional goal');
  assert.equal(progress.eligible, false, 'cash/revenue alone must not rank up the factory');

  game.tutorialStats.collected = 10;
  progress = rankProgress(game);
  assert.equal(progress.eligible, true, 'mandatory + two optional goals should enable Rank 2');
  const result = claimRankUp(game);
  assert.equal(result.changed, true);
  assert.equal(game.progression.progressionRank, 2);
  assert.equal(game.progression.researchData, 1);
  assert.equal(isBuildingUnlocked(game, 'smelter'), true);
  assert.equal(isBuildingUnlocked(game, 'storage'), true);
}

{
  const game = rankTwoLineGame();
  assert.equal(hasAutomatedIronLine(game), true, 'full hopper-crusher-smelter-seller line should be detected');
  const progress = rankProgress(game);
  assert.equal(progress.mandatory.done, true);
  assert.equal(progress.eligible, true, 'Rank 2 vertical slice should be able to reach Rank 3');
  const result = claimRankUp(game);
  assert.equal(result.changed, true);
  assert.equal(game.progression.progressionRank, 3);
  assert.equal(game.progression.researchData, 3);
}

{
  const game = rankOneLineGame();
  game.progression.progressionRank = 2;
  game.progression.researchData = 1;
  assert.equal(isHandCraftUnlocked(game, 'iron_plate'), false, 'new saves should research iron plate hand crafting');
  assert.equal(researchState(game, 'basic_fabrication').available, true);
  const result = completeResearch(game, 'basic_fabrication');
  assert.equal(result.changed, true);
  assert.equal(isHandCraftUnlocked(game, 'iron_plate'), true);
  assert.equal(game.progression.researchData, 0);
}

{
  const game = rankTwoLineGame();
  game.progression.progressionRank = 3;
  game.progression.researchData = 5;
  const special = researchState(game, 'scrap_yard_survey');
  assert.equal(special.available, false);
  assert.equal(special.reason, 'blueprint', 'special research must remain locked until its blueprint is discovered');
}

{
  const legacy = {
    inventory: { iron_plate: 1 },
    discoveredItems: ['metal_scrap', 'iron_plate'],
    tutorialStats: { collected: 8, processed: 1 },
    buildings: [
      building('hopper', 'hopper', -5, 0, 0, true),
      building('legacy-smelter', 'smelter', 0, 0, 0),
      building('legacy-storage', 'storage', 2.5, 0, 0),
      building('seller', 'seller', 7.5, 0, Math.PI, true),
    ],
  };
  const migrated = normalizeProgression(undefined, legacy);
  legacy.progression = migrated;
  assert.equal(migrated.legacyMigrated, true);
  assert.equal(migrated.progressionRank, 2, 'legacy Smelter/Storage use should infer at least Rank 2');
  assert.equal(isBuildingUnlocked(legacy, 'smelter'), true);
  assert.equal(isBuildingUnlocked(legacy, 'storage'), true);
  assert.equal(isHandCraftUnlocked(legacy, 'iron_plate'), true, 'used legacy hand crafting must stay available');
}

console.log('Progression regression tests passed.');
