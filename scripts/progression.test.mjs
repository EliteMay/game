import assert from 'node:assert/strict';
import {
  PLAYABLE_MAX_RANK,
  RANK4_STABLE_FUEL_SECONDS,
  analyzeRank4AdvancedLine,
  analyzeRank4Power,
  buildingUnlockState,
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
  requiredBuildingRank,
} from '../games/scrap-factory/progression.js';

function building(id, type, x, z, rotation = 0, permanent = false, extra = {}) {
  return {
    id,
    type,
    x,
    z,
    rotation,
    permanent,
    input: {},
    output: {},
    progress: 0,
    powerFuelSeconds: 0,
    powerStored: 0,
    logisticsCursor: 0,
    ...extra,
  };
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

function rankFourAdvancedGame() {
  return {
    money: 0,
    lifetimeRevenue: 1800,
    inventory: {},
    discoveredItems: ['metal_scrap', 'crushed_metal', 'iron_ingot', 'copper_wire', 'plastic', 'cable_bundle'],
    tutorialStats: { collected: 30, processed: 20, automationComplete: true },
    progression: { ...makeDefaultProgression(), progressionRank: 4, researchData: 2 },
    buildings: [
      building('hopper', 'hopper', 0, 0, 0, true),
      building('splitter', 'splitter', 2.5, 0, 0),
      building('mk-a1', 'conveyor_mk2', 5, 0, 0),
      building('crusher-a', 'crusher', 7.5, 0, 0),
      building('mk-a2', 'conveyor_mk2', 10, 0, 0),
      building('merger', 'merger', 12.5, 0, 0),
      building('seller-a', 'seller', 15, 0, Math.PI, true),
      building('mk-b1', 'conveyor_mk2', 2.5, 2.5, 3 * Math.PI / 2),
      building('mk-b2', 'conveyor_mk2', 2.5, 5, 0),
      building('crusher-b', 'crusher', 5, 5, 0),
      building('mk-b3', 'conveyor_mk2', 7.5, 5, 0),
      building('smelter', 'smelter', 10, 5, 0),
      building('mk-b4', 'conveyor_mk2', 12.5, 5, 0),
      building('seller-b', 'seller', 15, 5, Math.PI, true),
      building('generator', 'generator', 0, -5, 0, false, {
        powerFuelSeconds: 24,
        input: { metal_scrap: 1 },
      }),
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
  const game = rankTwoLineGame();
  game.progression.progressionRank = 3;
  for (const type of ['conveyor_mk2', 'splitter', 'merger', 'generator', 'power_pole', 'battery']) {
    assert.equal(requiredBuildingRank(type), 4, `${type} should be a Rank 4 building`);
    assert.equal(isBuildingUnlocked(game, type), false, `${type} must stay locked at Rank 3`);
  }
  game.progression.progressionRank = 4;
  for (const type of ['conveyor_mk2', 'splitter', 'merger', 'generator', 'power_pole']) {
    assert.equal(isBuildingUnlocked(game, type), true, `${type} should unlock at Rank 4`);
  }
  assert.equal(isBuildingUnlocked(game, 'battery'), false, 'Battery also requires Grid Storage research at Rank 4');
  assert.equal(buildingUnlockState(game, 'battery').reason, 'research');
  assert.equal(isBuildingUnlocked(game, 'industrial_storage'), false, 'Industrial Storage must remain locked until Rank 5');
  assert.equal(requiredBuildingRank('industrial_storage'), 5);
  assert.equal(isBuildingUnlocked(game, 'conveyor'), true, 'Mk.1 conveyor must remain available before and after Rank 4');
}

{
  const game = rankFourAdvancedGame();
  const line = analyzeRank4AdvancedLine(game);
  assert.equal(PLAYABLE_MAX_RANK, 5, 'normal gameplay should now reach Rank 5');
  assert.equal(line.qualifies, true, 'Rank 4 line must use Splitter and Merger across two automated outputs');
  assert.deepEqual(line.productTypes, ['crushed_metal', 'iron_ingot']);
  assert.equal(line.usesSplitter, true);
  assert.equal(line.usesMerger, true);
  assert.equal(line.usesMk2, true);
  assert.equal(line.throughput, 3, 'all-Mk2 route should expose 3 items/sec effective throughput');

  const power = analyzeRank4Power(game);
  assert.equal(power.selfPowered, true, 'active generator capacity must cover Rank 4 factory demand without Starter Grid credit');
  assert.equal(power.stable, true, `generator fuel runway must cover at least ${RANK4_STABLE_FUEL_SECONDS}s`);
  assert.equal(power.ownGeneration, 80);
  assert.equal(power.demand, 66);
  assert.equal(power.reserve, 14);
  assert.equal(power.fuelRunwaySeconds, 48);

  const progress = rankProgress(game);
  assert.equal(progress.mandatory.done, true, 'advanced line + stable own power should satisfy Rank 4 mandatory goal');
  assert.ok(progress.optionalDone >= 2, 'Rank 4 should still require two optional goals');
  assert.equal(progress.eligible, true, 'Rank 4 fixture should be able to reach Rank 5');
  const result = claimRankUp(game);
  assert.equal(result.changed, true);
  assert.equal(game.progression.progressionRank, 5);
  assert.equal(isBuildingUnlocked(game, 'industrial_storage'), true, 'Rank 5 should make Industrial Storage naturally reachable');
  const cap = claimRankUp(game);
  assert.equal(cap.changed, false);
  assert.equal(cap.reason, 'phase-cap', 'Rank 5 is the current playable Rank-Up cap');
}

{
  const game = rankFourAdvancedGame();
  game.buildings.find((entry) => entry.id === 'merger').type = 'conveyor_mk2';
  assert.equal(analyzeRank4AdvancedLine(game).qualifies, false, 'removing Merger usage must invalidate the Rank 4 topology');
  assert.equal(rankProgress(game).mandatory.done, false);
}

{
  const game = rankFourAdvancedGame();
  const generator = game.buildings.find((entry) => entry.id === 'generator');
  generator.powerFuelSeconds = 0;
  generator.input = { metal_scrap: 9 };
  const power = analyzeRank4Power(game);
  assert.equal(power.selfPowered, false, 'queued fuel alone must not count as active own generation');
  assert.equal(power.stable, false);
  assert.equal(rankProgress(game).mandatory.done, false, 'inactive own generation must block Rank 5 progression');
}

{
  const game = rankTwoLineGame();
  game.progression.progressionRank = 4;
  game.progression.researchData = 2;
  const research = researchState(game, 'grid_storage');
  assert.equal(research.available, true, 'Grid Storage should become researchable at Rank 4 with enough data');
  const result = completeResearch(game, 'grid_storage');
  assert.equal(result.changed, true);
  assert.equal(game.progression.researchData, 0);
  assert.equal(isBuildingUnlocked(game, 'battery'), true, 'Grid Storage research should unlock the Battery');
  assert.ok(game.progression.unlocks.includes('building:battery'));

  game.progression.progressionRank = 5;
  assert.equal(isBuildingUnlocked(game, 'industrial_storage'), true, 'Industrial Storage should unlock at Rank 5');
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
