import assert from 'node:assert/strict';
import { makeDefaultExploration } from '../games/scrap-factory/exploration.js';
import {
  PLAYABLE_MAX_RANK,
  analyzeRank6DroneLine,
  buildingUnlockState,
  claimRankUp,
  completeResearch,
  makeDefaultProgression,
  rankProgress,
  researchState,
} from '../games/scrap-factory/progression.js';

function baseGame(rank = 6) {
  const progression = makeDefaultProgression();
  progression.progressionRank = rank;
  progression.researchData = 3;
  return {
    money: 5000,
    lifetimeRevenue: 5000,
    inventory: {},
    discoveredItems: ['metal_scrap'],
    tutorialStats: { collected: 100, processed: 100, automationComplete: true },
    progression,
    exploration: makeDefaultExploration(),
    buildings: [],
  };
}

assert.equal(PLAYABLE_MAX_RANK, 7, 'Phase 5-A should extend the playable cap to Rank 7');

{
  const game = baseGame(5);
  assert.equal(buildingUnlockState(game, 'drone_port').unlocked, false);
  assert.equal(buildingUnlockState(game, 'drone_port').reason, 'rank');
  game.progression.progressionRank = 6;
  assert.equal(buildingUnlockState(game, 'drone_port').reason, 'research');
}

{
  const game = baseGame(6);
  assert.equal(researchState(game, 'drone_control_systems').reason, 'blueprint');
  game.progression.blueprints.push('military_drone_control_blueprint');
  assert.equal(researchState(game, 'drone_control_systems').available, true);
  assert.equal(completeResearch(game, 'drone_control_systems').changed, true);
  assert.ok(game.progression.unlocks.includes('building:drone_port'));
}

{
  const game = baseGame(6);
  game.progression.blueprints.push('military_drone_control_blueprint');
  completeResearch(game, 'drone_control_systems');
  game.exploration.areas.military.objective.completed = true;
  game.exploration.areas.military.objective.shortcutOpened = true;
  game.exploration.areas.military.discoveredZones = ['checkpoint', 'security_yard', 'drone_bay'];
  game.exploration.areas.military.resourcePoints = ['military-alloy-cache'];
  game.buildings = [
    { id: 'drone-port', type: 'drone_port', x: 0, z: 0, rotation: 0, input: {}, output: { rare_alloy: 1 }, progress: 0 },
    { id: 'mk2', type: 'conveyor_mk2', x: 2.5, z: 0, rotation: 0, input: {}, output: {}, progress: 0 },
    { id: 'warehouse', type: 'industrial_storage', x: 5, z: 0, rotation: 0, input: {}, output: {}, progress: 0 },
  ];
  game.discoveredItems.push('rare_alloy');

  const line = analyzeRank6DroneLine(game);
  assert.equal(line.qualifies, true, 'secured military resource point + Drone Port route should qualify');
  assert.equal(line.storageId, 'warehouse');
  assert.equal(line.throughput, 3);

  const progress = rankProgress(game);
  assert.equal(progress.mandatory.done, true);
  assert.ok(progress.optionalDone >= 2);
  assert.equal(progress.eligible, true);

  const ranked = claimRankUp(game);
  assert.equal(ranked.changed, true);
  assert.equal(ranked.rank, 7);
  assert.equal(game.progression.progressionRank, 7);
  assert.equal(rankProgress(game).phaseCap, true);
  assert.equal(claimRankUp(game).reason, 'phase-cap');
}

{
  const game = baseGame(6);
  game.progression.blueprints.push('military_drone_control_blueprint');
  completeResearch(game, 'drone_control_systems');
  game.exploration.areas.military.objective.completed = true;
  game.exploration.areas.military.resourcePoints = [];
  game.buildings = [
    { id: 'drone-port', type: 'drone_port', x: 0, z: 0, rotation: 0, input: {}, output: { rare_alloy: 1 } },
    { id: 'mk2', type: 'conveyor_mk2', x: 2.5, z: 0, rotation: 0 },
    { id: 'warehouse', type: 'industrial_storage', x: 5, z: 0, rotation: 0, output: {} },
  ];
  assert.equal(analyzeRank6DroneLine(game).qualifies, false, 'Drone Port must not count before the military resource point is secured');
}

console.log('Phase 5-A drone progression tests passed.');
