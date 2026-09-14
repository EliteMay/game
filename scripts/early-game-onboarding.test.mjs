import assert from 'node:assert/strict';
import {
  claimRankUp,
  makeDefaultProgression,
  rankProgress,
} from '../games/scrap-factory/progression.js';
import { makeDefaultHomeState } from '../games/scrap-factory/home-system.js';
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
        objective: { completed: false },
      },
      industrial: {
        discoveredZones: [],
        returnedLootTotal: 0,
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
    inventory: {},
    discoveredItems: ['metal_scrap'],
    tutorialStats: {
      movedToScrapyard: false,
      collected: 0,
      returned: false,
      processed: 0,
      automationComplete: false,
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
  assert.equal(result.tutorialChanged, true);
  assert.equal(game.home.tutorial.basicStep, 3, 'fresh tutorial should begin at the Home exit instead of Bed / move / PC chores');
  assert.deepEqual(game.home.tutorial.completedSteps, ['bed', 'move', 'pc']);
  assert.equal(game.money, 40);
}

{
  const game = freshGame();
  game.money = 88;
  game.home.tutorial.events.manualSale = true;
  const first = applyEarlyGameRuntime(game);
  assert.equal(first.grant.granted, true);
  assert.equal(game.money, 88 + STARTER_CONTRACT_GRANT);
  assert.equal(game.progression.unlocks.includes(STARTER_CONTRACT_UNLOCK), true);
  assert.equal(game.home.tutorial.rewardClaimed, true, 'FIRST PAY replaces the old +$50 tutorial completion reward');

  const second = applyEarlyGameRuntime(game);
  assert.equal(second.grant.granted, false);
  assert.equal(game.money, 88 + STARTER_CONTRACT_GRANT, 'starter grant must be idempotent across repeated runtime checks');
}

{
  const game = freshGame();
  game.home = makeDefaultHomeState({ existingSave: true });
  game.home.tutorial.events.manualSale = true;
  game.money = 88;
  const result = applyEarlyGameRuntime(game);
  assert.equal(result.changed, false, 'legacy saves must not be rewritten by the fresh-start onboarding pass');
  assert.equal(game.money, 88);
}

{
  const game = crushedLine(freshGame(1));
  const progress = rankProgress(game);
  assert.equal(progress.mandatory.done, true);
  assert.equal(progress.optionalRequired, 0);
  assert.equal(progress.eligible, true, 'fresh Rank 1 should promote as soon as the first automated line exists');
  const result = claimRankUp(game);
  assert.equal(result.changed, true);
  assert.equal(game.progression.progressionRank, 2);
  assert.equal(game.progression.researchData, 1);
}

{
  const game = ironLine(freshGame(2));
  const progress = rankProgress(game);
  assert.equal(progress.mandatory.done, true);
  assert.equal(progress.optionalRequired, 0);
  assert.equal(progress.eligible, true);
  const result = claimRankUp(game);
  assert.equal(result.changed, true);
  assert.equal(game.progression.progressionRank, 3);
  assert.equal(game.progression.researchData, 2);
}

{
  const game = freshGame(3);
  game.exploration.areas.residential.objective.completed = true;
  game.exploration.areas.residential.discoveredZones = ['entry', 'homes-a', 'homes-b'];
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
}

console.log('Early-game onboarding regression tests passed.');
