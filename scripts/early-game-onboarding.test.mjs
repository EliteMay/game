import assert from 'node:assert/strict';
import {
  buildingUnlockState,
  claimRankUp,
  isBuildingUnlocked,
  makeDefaultProgression,
  rankProgress,
} from '../games/scrap-factory/progression.js';
import { makeDefaultHomeState } from '../games/scrap-factory/home-system.js';
import {
  EARLY_GAME_ONBOARDING_UNLOCK,
  EARLY_GAME_TARGETS,
  earlyGameContractObjective,
  earlyGameContractState,
  recordEarlyGameAutoSale,
  recordEarlyGamePickup,
  recordEarlyGameProduction,
} from '../games/scrap-factory/early-game-contract.js';
import {
  STARTER_CONTRACT_GRANT,
  STARTER_CONTRACT_UNLOCK,
  applyEarlyGameRuntime,
} from '../games/scrap-factory/early-game-runtime.js';

function building(id, type, x, z, rotation = 0, permanent = false) {
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
  };
}

function baseExploration() {
  return {
    version: 1,
    areas: {
      residential: {
        discoveredZones: [],
        returnedLootTotal: 0,
        visits: 0,
        objective: { completed: false },
      },
      industrial: {
        discoveredZones: [],
        returnedLootTotal: 0,
        visits: 0,
        objective: { completed: false, shortcutOpened: false },
      },
    },
    depot: {},
    activeSession: null,
  };
}

function freshGame(rank = 1) {
  return {
    money: 40,
    lifetimeRevenue: 0,
    sessionCount: 1,
    inventory: {},
    discoveredItems: ['metal_scrap'],
    tutorialStats: {
      movedToScrapyard: false,
      collected: 0,
      returned: false,
      processed: 0,
      automationComplete: false,
      metalScrapCollected: 0,
      crushedMetalAutoSold: 0,
      ironIngotProduced: 0,
    },
    progression: { ...makeDefaultProgression(), progressionRank: rank },
    exploration: baseExploration(),
    home: makeDefaultHomeState({ existingSave: false }),
    buildings: [],
  };
}

function crushedLine(game) {
  game.buildings = [
    building('hopper', 'hopper', -5, 0, 0, true),
    building('belt-a', 'conveyor', -2.5, 0),
    building('crusher', 'crusher', 0, 0),
    building('belt-b', 'conveyor', 2.5, 0),
    building('seller', 'seller', 5, 0, Math.PI, true),
  ];
  return game;
}

function ironLine(game) {
  game.buildings = [
    building('hopper', 'hopper', -7.5, 0, 0, true),
    building('belt-a', 'conveyor', -5, 0),
    building('crusher', 'crusher', -2.5, 0),
    building('belt-b', 'conveyor', 0, 0),
    building('smelter', 'smelter', 2.5, 0),
    building('belt-c', 'conveyor', 5, 0),
    building('seller', 'seller', 7.5, 0, Math.PI, true),
  ];
  game.discoveredItems = ['metal_scrap', 'crushed_metal', 'iron_ingot'];
  return game;
}

{
  const game = freshGame();
  const result = applyEarlyGameRuntime(game);
  assert.equal(result.enrollmentChanged, true);
  assert.equal(game.progression.unlocks.includes(EARLY_GAME_ONBOARDING_UNLOCK), true);
  assert.equal(result.tutorialChanged, true);
  assert.equal(game.home.tutorial.basicStatus, 'skipped', 'Fresh Start V2 must replace the legacy 15-step tutorial instead of running both');
  assert.equal(game.home.tutorial.skippedTutorials.includes('basic'), true);
  const objective = earlyGameContractObjective(game);
  assert.equal(objective.title, '01 SALVAGE');
  assert.match(objective.progress, /CONTRACT 1 \/ 5/);
  assert.match(objective.progress, /0 \/ 6/);
  assert.equal(game.money, 40);
}

{
  const game = freshGame();
  applyEarlyGameRuntime(game);
  game.money = 88;
  game.home.tutorial.events.manualSale = true;
  const earlySale = applyEarlyGameRuntime(game);
  assert.equal(earlySale.grant.granted, false, 'FIRST PAY must not grant before SALVAGE is complete');

  assert.equal(recordEarlyGamePickup(game, 'copper_wire', 4), 0);
  assert.equal(recordEarlyGamePickup(game, 'metal_scrap', 8), EARLY_GAME_TARGETS.metalScrapCollected);
  assert.equal(game.tutorialStats.metalScrapCollected, EARLY_GAME_TARGETS.metalScrapCollected, 'pickup telemetry should cap at the Contract target');

  const first = applyEarlyGameRuntime(game);
  assert.equal(first.grant.granted, true);
  assert.equal(game.money, 88 + STARTER_CONTRACT_GRANT);
  assert.equal(game.progression.unlocks.includes(STARTER_CONTRACT_UNLOCK), true);
  assert.equal(game.home.tutorial.rewardClaimed, true, 'FIRST PAY replaces the old +$50 tutorial completion reward');

  game.sessionCount = 2;
  const second = applyEarlyGameRuntime(game);
  assert.equal(second.grant.granted, false);
  assert.equal(game.money, 88 + STARTER_CONTRACT_GRANT, 'starter grant must be idempotent across reloads and repeated runtime checks');
  assert.equal(isBuildingUnlocked(game, 'seller'), false, 'enrollment marker keeps V2 rules after reload');
}

{
  const game = freshGame();
  game.home = makeDefaultHomeState({ existingSave: true });
  game.home.tutorial.events.manualSale = true;
  game.money = 88;
  const result = applyEarlyGameRuntime(game);
  assert.equal(result.changed, false, 'legacy saves must not be rewritten by the fresh-start onboarding pass');
  assert.equal(game.money, 88);
  assert.equal(earlyGameContractObjective(game), null);
}

{
  const game = freshGame();
  game.sessionCount = 2;
  const result = applyEarlyGameRuntime(game);
  assert.equal(result.changed, false, 'an already-played Home-format save without the V2 marker must retain the legacy onboarding contract');
  assert.equal(game.progression.unlocks.includes(EARLY_GAME_ONBOARDING_UNLOCK), false);
  assert.equal(isBuildingUnlocked(game, 'seller'), true);
}

{
  const game = crushedLine(freshGame(1));
  applyEarlyGameRuntime(game);
  assert.equal(isBuildingUnlocked(game, 'seller'), false, 'fresh Rank 1 must use the permanent Starter Seller instead of buying another one');
  assert.equal(buildingUnlockState(game, 'seller').requiredRank, 2);

  recordEarlyGamePickup(game, 'metal_scrap', 6);
  game.home.tutorial.events.manualSale = true;
  applyEarlyGameRuntime(game);

  let progress = rankProgress(game);
  assert.equal(progress.mandatory.done, false, 'SALVAGE and FIRST PAY alone must not complete FACTORY ONLINE');
  assert.equal(progress.optionalRequired, 0);

  recordEarlyGameAutoSale(game, 'crushed_metal', 2);
  progress = rankProgress(game);
  assert.equal(progress.mandatory.done, false, 'FACTORY ONLINE requires three automatic Crushed Metal sales');

  recordEarlyGameAutoSale(game, 'crushed_metal', 1);
  progress = rankProgress(game);
  assert.equal(progress.mandatory.done, true);
  assert.equal(progress.eligible, true);
  assert.equal(earlyGameContractObjective(game).title, '04 BASIC PRODUCTION');

  const result = claimRankUp(game);
  assert.equal(result.changed, true);
  assert.equal(game.progression.progressionRank, 2);
  assert.equal(game.progression.researchData, 1);
  assert.equal(isBuildingUnlocked(game, 'seller'), true, 'Seller construction becomes available after Rank 2');
}

{
  const game = ironLine(freshGame(2));
  applyEarlyGameRuntime(game);
  recordEarlyGameProduction(game, 'iron_ingot', 4);
  let progress = rankProgress(game);
  assert.equal(progress.mandatory.done, false, 'BASIC PRODUCTION requires five produced Iron Ingots');

  recordEarlyGameProduction(game, 'iron_ingot', 1);
  assert.equal(game.tutorialStats.ironIngotProduced, EARLY_GAME_TARGETS.ironIngotProduced);
  progress = rankProgress(game);
  assert.equal(progress.mandatory.done, true);
  assert.equal(progress.optionalRequired, 0);
  assert.equal(progress.eligible, true);
  assert.equal(earlyGameContractObjective(game).title, '01 SALVAGE', 'Contracts remain ordered when a fixture skips earlier Contract evidence');

  // A real Rank 2 save reached this point through Rank 1, so preserve that evidence
  // before checking the Rank 2 -> 3 transition in isolation.
  game.tutorialStats.metalScrapCollected = EARLY_GAME_TARGETS.metalScrapCollected;
  game.tutorialStats.crushedMetalAutoSold = EARLY_GAME_TARGETS.crushedMetalAutoSold;
  game.home.tutorial.events.manualSale = true;

  const result = claimRankUp(game);
  assert.equal(result.changed, true);
  assert.equal(game.progression.progressionRank, 3);
  assert.equal(game.progression.researchData, 2);
  assert.equal(earlyGameContractObjective(game).title, '05 BEYOND THE YARD');
}

{
  const game = ironLine(freshGame(2));
  applyEarlyGameRuntime(game);
  recordEarlyGamePickup(game, 'metal_scrap', 6);
  game.home.tutorial.events.manualSale = true;
  recordEarlyGameAutoSale(game, 'crushed_metal', 3);
  recordEarlyGameProduction(game, 'iron_ingot', 5);
  game.progression.progressionRank = 3;

  let objective = earlyGameContractObjective(game);
  assert.equal(objective.title, '05 BEYOND THE YARD');
  assert.match(objective.progress, /TRANSPORT READY/);
  assert.equal(earlyGameContractState(game).complete, false);

  game.exploration.areas.residential.visits = 1;
  assert.equal(earlyGameContractState(game).complete, true);
  assert.equal(earlyGameContractObjective(game), null, 'five-contract onboarding ends when the Residential Area expedition begins');
}

{
  const game = freshGame(3);
  applyEarlyGameRuntime(game);
  game.exploration.areas.residential.objective.completed = true;
  game.exploration.areas.residential.discoveredZones = ['entrance', 'row_houses', 'garage'];
  const progress = rankProgress(game);
  assert.equal(progress.mandatory.done, true);
  assert.equal(progress.optionalRequired, 1);
  assert.equal(progress.optionalDone, 1);
  assert.equal(progress.eligible, true, 'fresh Rank 3 should require only one supporting exploration objective');
}

{
  const legacyFixture = crushedLine(freshGame(1));
  delete legacyFixture.home;
  legacyFixture.lifetimeRevenue = 250;
  const progress = rankProgress(legacyFixture);
  assert.equal(progress.optionalRequired, 2, 'fixtures without fresh-home state retain the legacy progression contract');
  assert.equal(progress.eligible, false);
  assert.equal(isBuildingUnlocked(legacyFixture, 'seller'), true, 'legacy Rank 1 keeps the original Seller build contract');
}

console.log('Early-game onboarding regression tests passed.');
