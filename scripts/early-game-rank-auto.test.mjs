import assert from 'node:assert/strict';
import { makeDefaultProgression } from '../games/scrap-factory/progression.js';
import { makeDefaultHomeState } from '../games/scrap-factory/home-system.js';
import { EARLY_GAME_ONBOARDING_UNLOCK } from '../games/scrap-factory/early-game-contract.js';
import {
  advanceAutomaticRank,
  advanceFreshEarlyRank,
  rankUpPresentation,
} from '../games/scrap-factory/early-game-rank-runtime.js';

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

function freshGame(rank = 1) {
  const progression = { ...makeDefaultProgression(), progressionRank: rank };
  progression.unlocks = [...(progression.unlocks || []), EARLY_GAME_ONBOARDING_UNLOCK];
  return {
    money: 40,
    lifetimeRevenue: 0,
    sessionCount: 1,
    inventory: {},
    discoveredItems: ['metal_scrap'],
    tutorialStats: {
      collected: 0,
      processed: 0,
      metalScrapCollected: 6,
      crushedMetalAutoSold: 3,
      ironIngotProduced: 0,
    },
    progression,
    exploration: {
      areas: {
        residential: {
          discoveredZones: [],
          returnedLootTotal: 0,
          visits: 0,
          objective: { completed: false },
        },
      },
      activeSession: null,
    },
    home: makeDefaultHomeState({ existingSave: false }),
    buildings: [],
  };
}

function crushedLine(game) {
  game.home.tutorial.events.manualSale = true;
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
  game.home.tutorial.events.manualSale = true;
  game.tutorialStats.ironIngotProduced = 5;
  game.buildings = [
    building('hopper', 'hopper', -7.5, 0, 0, true),
    building('belt-a', 'conveyor', -5, 0),
    building('crusher', 'crusher', -2.5, 0),
    building('belt-b', 'conveyor', 0, 0),
    building('smelter', 'smelter', 2.5, 0),
    building('belt-c', 'conveyor', 5, 0),
    building('seller', 'seller', 7.5, 0, Math.PI, true),
  ];
  return game;
}

{
  const game = freshGame(1);
  const result = advanceAutomaticRank(game);
  assert.equal(result.changed, false, 'Rank 1 must not auto-promote before FACTORY ONLINE is complete');
  assert.equal(game.progression.progressionRank, 1);
}

{
  const game = crushedLine(freshGame(1));
  const result = advanceFreshEarlyRank(game);
  assert.equal(result.changed, true, 'Fresh Rank 1 should auto-promote once FACTORY ONLINE is complete');
  assert.equal(result.fromRank, 1);
  assert.equal(result.toRank, 2);
  assert.equal(game.progression.progressionRank, 2);
  assert.equal(game.progression.researchData, 1, 'Rank 2 reward should still be granted');
  assert.equal(game.progression.history.at(-1)?.type, 'rank-up');
  const presentation = rankUpPresentation(result);
  assert.equal(presentation.title, 'RANK 2');
  assert.match(presentation.detail, /Smelter/);
}

{
  const game = ironLine(freshGame(2));
  game.progression.researchData = 1;
  const result = advanceAutomaticRank(game);
  assert.equal(result.changed, true, 'Fresh Rank 2 should auto-promote once BASIC PRODUCTION is complete');
  assert.equal(result.fromRank, 2);
  assert.equal(result.toRank, 3);
  assert.equal(game.progression.progressionRank, 3);
  assert.equal(game.progression.researchData, 3, 'Rank 3 reward should add two Research Data after the Rank 2 reward');
}

{
  const game = freshGame(3);
  game.progression.researchData = 3;
  game.exploration.areas.residential.objective.completed = true;
  game.exploration.areas.residential.discoveredZones = ['entry', 'apartments', 'shops'];
  const result = advanceAutomaticRank(game);
  assert.equal(result.changed, true, 'Fresh Rank 3 should also auto-promote once its exploration contract is complete');
  assert.equal(result.fromRank, 3);
  assert.equal(result.toRank, 4);
  assert.equal(game.progression.progressionRank, 4);
  assert.equal(game.progression.researchData, 4, 'Rank 4 reward should be granted automatically');
}

{
  const game = crushedLine(freshGame(1));
  game.progression.unlocks = game.progression.unlocks.filter((id) => id !== EARLY_GAME_ONBOARDING_UNLOCK);
  game.sessionCount = 2;
  game.lifetimeRevenue = 250;
  game.tutorialStats.collected = 10;
  const result = advanceAutomaticRank(game);
  assert.equal(result.changed, true, 'Existing saves should use the same automatic Rank claim once their legacy conditions are complete');
  assert.equal(result.toRank, 2);
  assert.equal(game.progression.progressionRank, 2);
}

{
  const game = freshGame(7);
  const result = advanceAutomaticRank(game);
  assert.equal(result.changed, false, 'Rank 7 is the progression cap and must never create Rank 8');
  assert.equal(result.reason, 'rank-cap');
  assert.equal(game.progression.progressionRank, 7);
}

console.log('Automatic rank progression tests passed.');
