import assert from 'node:assert/strict';
import {
  PLAYABLE_MAX_RANK,
  RANK4_STABLE_FUEL_SECONDS,
  analyzeRank4AdvancedLine,
  analyzeRank4Power,
  analyzeRank5AssemblerLine,
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
    id, type, x, z, rotation, permanent,
    input: {}, output: {}, progress: 0,
    powerFuelSeconds: 0, powerStored: 0, logisticsCursor: 0,
    ...extra,
  };
}

function baseGame(rank = 1) {
  return {
    money: 0,
    lifetimeRevenue: 0,
    inventory: {},
    discoveredItems: ['metal_scrap'],
    tutorialStats: { collected: 0, processed: 0, automationComplete: false },
    progression: { ...makeDefaultProgression(), progressionRank: rank },
    exploration: {
      version: 1,
      areas: {
        residential: { discoveredZones: [], objective: { completed: false }, returnedLootTotal: 0 },
        industrial: { discoveredZones: [], objective: { completed: false, shortcutOpened: false }, returnedLootTotal: 0 },
      },
      depot: {}, activeSession: null,
    },
    buildings: [],
  };
}

function rankOneLineGame() {
  const game = baseGame(1);
  game.lifetimeRevenue = 250;
  game.buildings = [
    building('hopper', 'hopper', -5, 0, 0, true),
    building('belt-a', 'conveyor', -2.5, 0, 0),
    building('crusher', 'crusher', 0, 0, 0),
    building('belt-b', 'conveyor', 2.5, 0, 0),
    building('seller', 'seller', 5, 0, Math.PI, true),
  ];
  return game;
}

function rankTwoLineGame() {
  const game = baseGame(2);
  game.lifetimeRevenue = 900;
  game.discoveredItems = ['metal_scrap', 'crushed_metal', 'iron_ingot'];
  game.tutorialStats = { collected: 15, processed: 12, automationComplete: true };
  game.progression.researchData = 1;
  game.buildings = [
    building('hopper', 'hopper', -7.5, 0, 0, true),
    building('belt-a', 'conveyor', -5, 0, 0),
    building('crusher', 'crusher', -2.5, 0, 0),
    building('belt-b', 'conveyor', 0, 0, 0),
    building('smelter', 'smelter', 2.5, 0, 0),
    building('belt-c', 'conveyor', 5, 0, 0),
    building('seller', 'seller', 7.5, 0, Math.PI, true),
    building('storage', 'storage', 0, 5, 0),
    building('extra-crusher', 'crusher', 2.5, 5, 0),
  ];
  return game;
}

function rankFourAdvancedGame() {
  const game = baseGame(4);
  game.lifetimeRevenue = 1800;
  game.discoveredItems = ['metal_scrap', 'crushed_metal', 'iron_ingot', 'copper_wire', 'plastic', 'cable_bundle'];
  game.tutorialStats = { collected: 30, processed: 20, automationComplete: true };
  game.progression.researchData = 2;
  game.buildings = [
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
    building('generator', 'generator', 0, -5, 0, false, { powerFuelSeconds: 24, input: { metal_scrap: 1 } }),
  ];
  return game;
}

function rankFiveAssemblerGame() {
  const game = baseGame(5);
  game.discoveredItems = ['metal_scrap', 'motor', 'circuit', 'control_unit'];
  game.progression.researchData = 0;
  game.progression.blueprints = ['abandoned_factory_assembly_blueprint'];
  game.progression.completedResearch = ['advanced_assembly'];
  game.progression.unlocks = ['building:assembler', 'handcraft:circuit', 'handcraft:motor'];
  game.exploration.areas.industrial.objective = {
    generatorRestored: true,
    controlRoomOnline: true,
    shortcutOpened: true,
    blueprintRecovered: true,
    completed: true,
  };
  game.buildings = [
    building('hopper', 'hopper', -5, 0, 0, true),
    building('in-a', 'conveyor_mk2', -2.5, 0, 0),
    building('assembler', 'assembler', 0, 0, 0),
    building('out-a', 'conveyor_mk2', 2.5, 0, 0),
    building('seller', 'seller', 5, 0, Math.PI, true),
    building('industrial-buffer', 'industrial_storage', 0, 5, 0, false, { output: { motor: 1 } }),
  ];
  return game;
}

{
  const game = rankOneLineGame();
  assert.equal(hasAutomatedCrushedMetalLine(game), true);
  let progress = rankProgress(game);
  assert.equal(progress.mandatory.done, true);
  assert.equal(progress.optionalDone, 1, 'revenue alone must remain only one optional goal');
  assert.equal(progress.eligible, false, 'cash alone must not rank up the factory');
  game.tutorialStats.collected = 10;
  progress = rankProgress(game);
  assert.equal(progress.eligible, true);
  assert.equal(claimRankUp(game).changed, true);
  assert.equal(game.progression.progressionRank, 2);
  assert.equal(game.progression.researchData, 1);
}

{
  const game = rankTwoLineGame();
  assert.equal(hasAutomatedIronLine(game), true);
  assert.equal(rankProgress(game).eligible, true);
  assert.equal(claimRankUp(game).changed, true);
  assert.equal(game.progression.progressionRank, 3);
  assert.equal(game.progression.researchData, 3);
}

{
  const game = rankTwoLineGame();
  game.progression.progressionRank = 3;
  for (const type of ['conveyor_mk2', 'splitter', 'merger', 'generator', 'power_pole', 'battery']) {
    assert.equal(requiredBuildingRank(type), 4);
    assert.equal(isBuildingUnlocked(game, type), false);
  }
  game.progression.progressionRank = 4;
  for (const type of ['conveyor_mk2', 'splitter', 'merger', 'generator', 'power_pole']) assert.equal(isBuildingUnlocked(game, type), true);
  assert.equal(isBuildingUnlocked(game, 'battery'), false);
  assert.equal(buildingUnlockState(game, 'battery').reason, 'research');
  assert.equal(requiredBuildingRank('industrial_storage'), 5);
  assert.equal(requiredBuildingRank('assembler'), 5);
  game.progression.progressionRank = 5;
  assert.equal(isBuildingUnlocked(game, 'industrial_storage'), true);
  assert.equal(isBuildingUnlocked(game, 'assembler'), false, 'Assembler must also require recovered assembly research');
}

{
  const game = rankFourAdvancedGame();
  const line = analyzeRank4AdvancedLine(game);
  assert.equal(PLAYABLE_MAX_RANK, 7, 'normal gameplay should now reach Rank 7');
  assert.equal(line.qualifies, true);
  assert.deepEqual(line.productTypes, ['crushed_metal', 'iron_ingot']);
  assert.equal(line.usesSplitter, true);
  assert.equal(line.usesMerger, true);
  assert.equal(line.usesMk2, true);
  assert.equal(line.throughput, 3);

  const power = analyzeRank4Power(game);
  assert.equal(power.selfPowered, true);
  assert.equal(power.stable, true, `fuel runway must cover at least ${RANK4_STABLE_FUEL_SECONDS}s`);
  assert.equal(power.ownGeneration, 80);
  assert.equal(power.demand, 66);
  assert.equal(power.reserve, 14);
  assert.equal(power.fuelRunwaySeconds, 48);

  const progress = rankProgress(game);
  assert.equal(progress.eligible, true);
  assert.equal(claimRankUp(game).changed, true);
  assert.equal(game.progression.progressionRank, 5);
  assert.equal(rankProgress(game).definition?.nextRank, 6, 'Rank 5 must expose the new Phase 4 progression goal');
  const blocked = claimRankUp(game);
  assert.equal(blocked.changed, false);
  assert.equal(blocked.reason, 'requirements', 'Rank 5 cannot skip the abandoned factory and assembler requirements');
}

{
  const game = rankFourAdvancedGame();
  game.buildings.find((entry) => entry.id === 'merger').type = 'conveyor_mk2';
  assert.equal(analyzeRank4AdvancedLine(game).qualifies, false);
  assert.equal(rankProgress(game).mandatory.done, false);
}

{
  const game = rankFourAdvancedGame();
  const generator = game.buildings.find((entry) => entry.id === 'generator');
  generator.powerFuelSeconds = 0;
  generator.input = { metal_scrap: 9 };
  assert.equal(analyzeRank4Power(game).selfPowered, false, 'queued fuel alone must not count as active own generation');
  assert.equal(rankProgress(game).mandatory.done, false);
}

{
  const game = rankTwoLineGame();
  game.progression.progressionRank = 4;
  game.progression.researchData = 2;
  assert.equal(researchState(game, 'grid_storage').available, true);
  assert.equal(completeResearch(game, 'grid_storage').changed, true);
  assert.equal(isBuildingUnlocked(game, 'battery'), true);
}

{
  const game = rankOneLineGame();
  game.progression.progressionRank = 2;
  game.progression.researchData = 1;
  assert.equal(isHandCraftUnlocked(game, 'iron_plate'), false);
  assert.equal(completeResearch(game, 'basic_fabrication').changed, true);
  assert.equal(isHandCraftUnlocked(game, 'iron_plate'), true);
}

{
  const game = rankFiveAssemblerGame();
  game.progression.completedResearch = [];
  game.progression.unlocks = [];
  game.progression.researchData = 2;
  game.progression.blueprints = [];
  assert.equal(researchState(game, 'advanced_assembly').reason, 'blueprint');
  game.progression.blueprints.push('abandoned_factory_assembly_blueprint');
  assert.equal(researchState(game, 'advanced_assembly').available, true);
  assert.equal(completeResearch(game, 'advanced_assembly').changed, true);
  assert.equal(isBuildingUnlocked(game, 'assembler'), true);
  assert.equal(isHandCraftUnlocked(game, 'circuit'), true);
  assert.equal(isHandCraftUnlocked(game, 'motor'), true);
}

{
  const game = rankFiveAssemblerGame();
  const line = analyzeRank5AssemblerLine(game);
  assert.equal(line.qualifies, true, 'Hopper -> Mk2 -> Assembler -> Mk2 -> Seller should be a valid automated advanced line');
  assert.equal(line.throughput, 3);
  const progress = rankProgress(game);
  assert.equal(progress.mandatory.done, true, 'industrial objective + research + assembler topology should satisfy the mandatory Rank 5 goal');
  assert.ok(progress.optionalDone >= 2, 'fixture should satisfy at least two Phase 4 optional goals');
  assert.equal(progress.eligible, true);
  const result = claimRankUp(game);
  assert.equal(result.changed, true);
  assert.equal(game.progression.progressionRank, 6);
  assert.equal(game.progression.researchData, 1);
  const next = claimRankUp(game);
  assert.equal(next.changed, false);
  assert.equal(next.reason, 'requirements', 'Rank 6 must require the Military Facility and Drone automation loop before Rank 7');
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
  assert.equal(migrated.progressionRank, 2);
  assert.equal(isBuildingUnlocked(legacy, 'smelter'), true);
  assert.equal(isBuildingUnlocked(legacy, 'storage'), true);
  assert.equal(isHandCraftUnlocked(legacy, 'iron_plate'), true);
}

console.log('Progression regression tests passed.');
