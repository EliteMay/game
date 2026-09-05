import assert from 'node:assert/strict';
import {
  MILITARY_AREA_ID,
  MILITARY_BLUEPRINT_ID,
  abandonExpedition,
  advanceMilitaryObjective,
  collectExplorationLoot,
  discoverExplorationZone,
  explorationAreaState,
  makeDefaultExploration,
  militaryProgressSummary,
  normalizeExploration,
  returnFromExpedition,
  startExpedition,
  updateExplorationHealth,
} from '../games/scrap-factory/exploration.js';
import {
  completeResearch,
  isBuildingUnlocked,
  makeDefaultProgression,
  researchState,
} from '../games/scrap-factory/progression.js';

function gameAt(rank = 6) {
  return {
    money: 0,
    lifetimeRevenue: 0,
    inventory: {
      metal_scrap: 0, copper_wire: 0, plastic: 0, e_waste: 0,
      crushed_metal: 0, iron_ingot: 0, iron_plate: 0, cable_bundle: 0, tool_kit: 0,
      circuit: 0, motor: 0, control_unit: 0, rare_alloy: 0,
    },
    discoveredItems: ['metal_scrap'],
    tutorialStats: { collected: 0, processed: 0, automationComplete: false },
    buildings: [],
    progression: { ...makeDefaultProgression(), progressionRank: rank, researchData: 0 },
    exploration: makeDefaultExploration(),
  };
}

{
  const game = gameAt(5);
  assert.equal(explorationAreaState(game, MILITARY_AREA_ID).unlocked, false, 'military facility must stay locked before Rank 6');
  game.progression.progressionRank = 6;
  assert.equal(explorationAreaState(game, MILITARY_AREA_ID).unlocked, true, 'military facility should unlock at Rank 6');
}

{
  const normalized = normalizeExploration({
    version: 1,
    areas: {
      residential: { discoveredZones: ['entrance'] },
      industrial: { discoveredZones: ['arrival'] },
      military: {
        discoveredZones: ['checkpoint', 'bad-zone', 'checkpoint'],
        objective: { accessCardRecovered: true, securityGridOffline: true },
      },
    },
    activeSession: {
      id: 'legacy-session',
      areaId: 'military',
      hp: 73,
      player: { x: 1, y: 1.7, z: 2, yaw: 0 },
    },
  });
  assert.equal(normalized.version, 1, 'military area must remain additive under exploration schema v1');
  assert.deepEqual(normalized.areas.military.discoveredZones, ['checkpoint']);
  assert.equal(normalized.areas.military.objective.securityGridOffline, true);
  assert.equal(normalized.activeSession.hp, 73);
}

{
  const game = gameAt(6);
  assert.equal(startExpedition(game, MILITARY_AREA_ID).changed, true);
  assert.equal(game.exploration.activeSession.hp, 100);
  assert.equal(updateExplorationHealth(game, 62), true);
  assert.equal(game.exploration.activeSession.hp, 62);

  for (const zone of ['checkpoint', 'security_yard', 'drone_bay', 'command_bunker']) {
    assert.equal(discoverExplorationZone(game, zone).changed, true);
  }

  assert.equal(advanceMilitaryObjective(game, 'security').reason, 'needs-access');
  assert.equal(advanceMilitaryObjective(game, 'access').changed, true);
  assert.equal(advanceMilitaryObjective(game, 'drone').reason, 'needs-security');
  assert.equal(advanceMilitaryObjective(game, 'security').changed, true);
  assert.equal(advanceMilitaryObjective(game, 'shortcut').changed, true);
  assert.equal(advanceMilitaryObjective(game, 'blueprint').reason, 'needs-drone');
  assert.equal(advanceMilitaryObjective(game, 'drone').changed, true);

  const beforeReward = game.progression.researchData;
  const blueprint = advanceMilitaryObjective(game, 'blueprint');
  assert.equal(blueprint.changed, true);
  assert.equal(blueprint.completed, true);
  assert.ok(game.progression.blueprints.includes(MILITARY_BLUEPRINT_ID), 'military objective must guarantee Drone Control Blueprint');
  assert.equal(game.progression.researchData, beforeReward + 3);
  assert.ok(game.exploration.areas.military.resourcePoints.includes('military-alloy-cache'), 'military objective must secure a drone-eligible resource point');
  assert.equal(advanceMilitaryObjective(game, 'blueprint').changed, false);
  assert.equal(game.progression.researchData, beforeReward + 3, 'blueprint reward must stay idempotent');

  assert.equal(collectExplorationLoot(game, 'military-test-loot', 'rare_alloy', 2).changed, true);
  const returned = returnFromExpedition(game);
  assert.equal(returned.moved, 2);
  const summary = militaryProgressSummary(game);
  assert.equal(summary.completed, true);
  assert.equal(summary.shortcutOpened, true);
  assert.equal(summary.discovered, 4);
  assert.equal(summary.resourcePoints, 1);

  const research = researchState(game, 'drone_control_systems');
  assert.equal(research.available, true, 'military blueprint and +3 data should make Drone Control research immediately available');
  assert.equal(completeResearch(game, 'drone_control_systems').changed, true);
  assert.equal(isBuildingUnlocked(game, 'drone_port'), true);
}

{
  const game = gameAt(6);
  startExpedition(game, MILITARY_AREA_ID);
  advanceMilitaryObjective(game, 'access');
  collectExplorationLoot(game, 'temporary-military-loot', 'e_waste', 3);
  const lost = abandonExpedition(game);
  assert.equal(lost.changed, true);
  assert.equal(lost.lost, 3);
  assert.equal(game.exploration.activeSession, null);
  assert.deepEqual(game.exploration.depot, {});
  assert.equal(game.exploration.areas.military.objective.accessCardRecovered, true, 'persistent objective state must survive abandon');
}

console.log('Military exploration regression tests passed.');
