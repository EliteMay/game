import assert from 'node:assert/strict';
import { BUILDINGS, BUILD_MENU_ORDER, RECIPES } from '../games/scrap-factory/config.js';
import {
  assignDroneResourcePoint,
  droneBuildingTypeForPoint,
  dronePortAssignments,
  droneRecipeForPort,
  droneResourcePointForPort,
  securedDroneResourcePoints,
} from '../games/scrap-factory/drone-routes.js';
import { makeDefaultExploration } from '../games/scrap-factory/exploration.js';
import {
  buildingUnlockState,
  analyzeRank6DroneLine,
  makeDefaultProgression,
} from '../games/scrap-factory/progression.js';
import {
  computePowerSnapshot,
  generatorFuelSeconds,
  tickGeneratorFuel,
} from '../games/scrap-factory/power.js';
import { storageCapacity } from '../games/scrap-factory/storage-capacity.js';

function gameAtRank(rank = 6) {
  const progression = makeDefaultProgression();
  progression.progressionRank = rank;
  progression.completedResearch.push('drone_control_systems');
  progression.unlocks.push('building:drone_port');
  const exploration = makeDefaultExploration();
  exploration.areas.residential.resourcePoints = ['residential-copper-network'];
  exploration.areas.industrial.resourcePoints = ['industrial-electronics-cache'];
  exploration.areas.military.resourcePoints = ['military-alloy-cache'];
  exploration.areas.military.objective.completed = true;
  return {
    money: 10000,
    inventory: {},
    discoveredItems: ['rare_alloy'],
    progression,
    exploration,
    buildings: [],
  };
}

assert.deepEqual(
  BUILD_MENU_ORDER.slice(0, 5),
  ['crusher', 'smelter', 'conveyor', 'storage', 'seller'],
  'Phase 5-C must preserve the Quick Build 1-5 contract',
);

{
  const game = gameAtRank(6);
  const points = securedDroneResourcePoints(game);
  assert.deepEqual(points.map((point) => point.id), [
    'residential-copper-network',
    'industrial-electronics-cache',
    'military-alloy-cache',
  ]);

  const legacyPort = { id: 'legacy-port', type: 'drone_port', resourcePointId: null, progress: 4, output: { rare_alloy: 2 } };
  assert.equal(droneResourcePointForPort(game, legacyPort)?.id, 'military-alloy-cache', 'legacy Drone Port should fall back to the historical military route');
  assert.equal(droneRecipeForPort(game, legacyPort)?.id, 'drone_military_alloy');

  const copper = assignDroneResourcePoint(game, legacyPort, 'residential-copper-network');
  assert.equal(copper.changed, true);
  assert.equal(legacyPort.resourcePointId, 'residential-copper-network');
  assert.equal(legacyPort.type, 'drone_port_copper');
  assert.equal(legacyPort.progress, 0, 'route changes reset only partial cycle progress');
  assert.deepEqual(legacyPort.output, { rare_alloy: 2 }, 'route changes must preserve existing output buffers');
  assert.equal(droneRecipeForPort(game, legacyPort)?.id, 'drone_residential_copper');
  assert.equal(droneRecipeForPort(game, legacyPort)?.seconds, 8);
  assert.deepEqual(droneRecipeForPort(game, legacyPort)?.output, { copper_wire: 1 });

  const electronics = assignDroneResourcePoint(game, legacyPort, 'industrial-electronics-cache');
  assert.equal(electronics.changed, true);
  assert.equal(legacyPort.type, 'drone_port_electronics');
  assert.equal(droneRecipeForPort(game, legacyPort)?.id, 'drone_industrial_electronics');
  assert.equal(droneRecipeForPort(game, legacyPort)?.seconds, 10);
  assert.deepEqual(droneRecipeForPort(game, legacyPort)?.output, { e_waste: 1 });

  const military = assignDroneResourcePoint(game, legacyPort, 'military-alloy-cache');
  assert.equal(military.changed, true);
  assert.equal(legacyPort.type, 'drone_port');
  assert.equal(droneRecipeForPort(game, legacyPort)?.seconds, 12);
  assert.deepEqual(droneRecipeForPort(game, legacyPort)?.output, { rare_alloy: 1 });
  assert.equal(droneBuildingTypeForPoint('residential-copper-network'), 'drone_port_copper');
}

{
  const game = gameAtRank(6);
  game.buildings = [
    { id: 'copper-port', type: 'drone_port_copper', resourcePointId: 'residential-copper-network', x: 0, z: 0, rotation: 0, output: { copper_wire: 1 } },
    { id: 'belt', type: 'conveyor_mk2', x: 2.5, z: 0, rotation: 0 },
    { id: 'storage', type: 'logistics_warehouse', x: 5, z: 0, rotation: 0, output: {} },
  ];
  assert.equal(analyzeRank6DroneLine(game).qualifies, false, 'a non-military route must not satisfy the existing Rank 6→7 mandatory military line');

  game.buildings.push(
    { id: 'military-port', type: 'drone_port', resourcePointId: 'military-alloy-cache', x: 0, z: 5, rotation: 0, output: { rare_alloy: 1 } },
    { id: 'military-belt', type: 'conveyor_mk2', x: 2.5, z: 5, rotation: 0 },
    { id: 'military-storage', type: 'logistics_warehouse', x: 5, z: 5, rotation: 0, output: {} },
  );
  assert.equal(analyzeRank6DroneLine(game).qualifies, true, 'a military-assigned Drone Port should continue to satisfy the Rank 6→7 line');
  assert.equal(dronePortAssignments(game).length, 2);
}

{
  const rank5 = gameAtRank(5);
  assert.equal(buildingUnlockState(rank5, 'industrial_generator').unlocked, false);
  assert.equal(buildingUnlockState(rank5, 'logistics_warehouse').unlocked, false);
  const rank6 = gameAtRank(6);
  assert.equal(buildingUnlockState(rank6, 'industrial_generator').unlocked, true);
  assert.equal(buildingUnlockState(rank6, 'logistics_warehouse').unlocked, true);
}

{
  const warehouse = { type: 'logistics_warehouse', output: { metal_scrap: 1400 } };
  assert.equal(storageCapacity(warehouse), 1800);
  assert.equal(BUILDINGS.industrial_storage.storageCapacity, 600);
}

{
  const game = gameAtRank(6);
  const generator = {
    id: 'industrial-generator',
    type: 'industrial_generator',
    x: 0,
    z: 0,
    input: { metal_scrap: 1 },
    output: {},
    powerFuelSeconds: 0,
  };
  game.buildings = [generator];
  assert.equal(BUILDINGS.industrial_generator.powerGeneration, 180);
  assert.equal(generatorFuelSeconds(generator), 24);
  tickGeneratorFuel(game.buildings, 1);
  assert.equal(generator.input.metal_scrap, 0, 'Industrial Generator should consume one scrap when starting');
  assert.equal(generator.powerFuelSeconds, 23);
  const snapshot = computePowerSnapshot(game);
  assert.equal(snapshot.baseGeneration, 235, 'Starter Grid 55 + Industrial Generator 180 should be available');
}

assert.equal(RECIPES.drone_residential_copper.seconds, 8);
assert.equal(RECIPES.drone_industrial_electronics.seconds, 10);
assert.equal(RECIPES.drone_military_alloy.seconds, 12);

console.log('Phase 5-C automation / power / warehouse tests passed.');
