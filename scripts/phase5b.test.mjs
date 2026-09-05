import assert from 'node:assert/strict';
import {
  findDirectionalRoutes,
  logisticsOutputKeys,
  logisticsThroughput,
  selectDirectionalRoute,
} from '../games/scrap-factory/logistics.js';
import {
  isBuildingUnlocked,
  makeDefaultProgression,
  requiredBuildingRank,
} from '../games/scrap-factory/progression.js';

function gameAt(rank) {
  return {
    inventory: {},
    buildings: [],
    discoveredItems: ['metal_scrap'],
    tutorialStats: {},
    progression: { ...makeDefaultProgression(), progressionRank: rank },
    exploration: { version: 1, areas: {}, depot: {}, activeSession: null },
  };
}

function targetAccepts(building) {
  return !building.full && ['storage', 'industrial_storage', 'seller'].includes(building.type);
}

assert.equal(logisticsThroughput('conveyor_mk3'), 6, 'Conveyor Mk.3 should provide 6 items/s');
assert.equal(logisticsThroughput('priority_splitter'), 6, 'Priority Splitter should provide 6 items/s');
assert.equal(logisticsThroughput('overflow_splitter'), 6, 'Overflow Splitter should provide 6 items/s');

for (const type of ['conveyor_mk3', 'priority_splitter', 'overflow_splitter']) {
  assert.equal(requiredBuildingRank(type), 6, `${type} should unlock at Rank 6`);
  assert.equal(isBuildingUnlocked(gameAt(5), type), false, `${type} must remain locked at Rank 5`);
  assert.equal(isBuildingUnlocked(gameAt(6), type), true, `${type} should unlock at Rank 6`);
}

{
  const source = { id: 'source', type: 'hopper', x: 0, z: 0 };
  const mk3 = { id: 'mk3', type: 'conveyor_mk3', x: 2.5, z: 0, rotation: 0 };
  const seller = { id: 'seller', type: 'seller', x: 5, z: 0 };
  const routes = findDirectionalRoutes([source, mk3, seller], source, 'metal_scrap', targetAccepts);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].throughput, 6, 'pure Mk.3 route must expose 6 items/s');
}

{
  const source = { id: 'source', type: 'hopper', x: 0, z: 0 };
  const priority = { id: 'priority', type: 'priority_splitter', x: 2.5, z: 0, rotation: 0 };
  const main = { id: 'main-storage', type: 'industrial_storage', x: 5, z: 0, full: false };
  const north = { id: 'north-seller', type: 'seller', x: 2.5, z: -2.5 };
  const south = { id: 'south-seller', type: 'seller', x: 2.5, z: 2.5 };
  const buildings = [source, priority, main, north, south];

  const outputKeys = new Set(logisticsOutputKeys(priority));
  assert.deepEqual(outputKeys, new Set(['2,0', '1,-1', '1,1']), 'Priority Splitter keeps three physical outputs');

  let routes = findDirectionalRoutes(buildings, source, 'metal_scrap', targetAccepts);
  assert.deepEqual(routes.map((route) => route.priority), [0, 1, 1]);
  for (const cursor of [0, 1, 7, 99]) {
    assert.equal(selectDirectionalRoute(routes, cursor).route.target.id, 'main-storage', 'priority forward route must win while available');
  }

  main.full = true;
  routes = findDirectionalRoutes(buildings, source, 'metal_scrap', targetAccepts);
  assert.deepEqual(routes.map((route) => route.target.id), ['north-seller', 'south-seller']);
  let cursor = 0;
  const fallback = [];
  for (let index = 0; index < 4; index += 1) {
    const choice = selectDirectionalRoute(routes, cursor);
    fallback.push(choice.route.target.id);
    cursor = choice.nextCursor;
  }
  assert.deepEqual(fallback, ['north-seller', 'south-seller', 'north-seller', 'south-seller'], 'equal-priority backup lanes should still round-robin');
}

{
  const source = { id: 'source', type: 'hopper', x: 0, z: 0 };
  const overflow = { id: 'overflow', type: 'overflow_splitter', x: 2.5, z: 0, rotation: 0 };
  const main = { id: 'main-storage', type: 'industrial_storage', x: 5, z: 0, full: false };
  const overflowSeller = { id: 'overflow-seller', type: 'seller', x: 2.5, z: 2.5 };
  const unusedNorth = { id: 'north-seller', type: 'seller', x: 2.5, z: -2.5 };
  const buildings = [source, overflow, main, overflowSeller, unusedNorth];

  assert.deepEqual(logisticsOutputKeys(overflow), ['2,0', '1,1'], 'Overflow Splitter should expose forward main + right overflow only');

  let routes = findDirectionalRoutes(buildings, source, 'metal_scrap', targetAccepts);
  assert.deepEqual(routes.map((route) => [route.target.id, route.priority]), [
    ['main-storage', 0],
    ['overflow-seller', 2],
  ]);
  assert.equal(selectDirectionalRoute(routes, 0).route.target.id, 'main-storage', 'overflow seller must not receive while main storage accepts');

  main.full = true;
  routes = findDirectionalRoutes(buildings, source, 'metal_scrap', targetAccepts);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].target.id, 'overflow-seller', 'overflow seller becomes active only after main route is blocked');
}

console.log('Phase 5-B priority / overflow logistics regression tests passed.');
