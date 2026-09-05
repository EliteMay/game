import assert from 'node:assert/strict';
import {
  directionFromRotation,
  findDirectionalRoute,
  findDirectionalRoutes,
  logisticsInputKeys,
  logisticsOutputKeys,
  logisticsThroughput,
  reverseRotation,
  rotateQuarter,
  selectDirectionalRoute,
} from '../games/scrap-factory/logistics.js';

const acceptsSeller = (building) => building.type === 'seller';

assert.equal(directionFromRotation(0).name, '東');
assert.equal(directionFromRotation(Math.PI / 2).name, '北');
assert.equal(directionFromRotation(Math.PI).name, '西');
assert.equal(directionFromRotation(Math.PI * 1.5).name, '南');
assert.equal(directionFromRotation(rotateQuarter(0)).name, '北');
assert.equal(directionFromRotation(reverseRotation(0)).name, '西');

const source = { id: 'crusher', type: 'crusher', x: 0, z: 0 };
const belt1 = { id: 'belt1', type: 'conveyor', x: 2.5, z: 0, rotation: 0 };
const belt2 = { id: 'belt2', type: 'conveyor', x: 5, z: 0, rotation: Math.PI / 2 };
const target = { id: 'seller', type: 'seller', x: 5, z: -2.5 };
const buildings = [source, belt1, belt2, target];
const route = findDirectionalRoute(buildings, source, 'crushed_metal', acceptsSeller);
assert.ok(route, 'east then north route should resolve');
assert.equal(route.target.id, 'seller');
assert.deepEqual(route.path.map(({ x, z }) => [x, z]), [[0, 0], [2.5, 0], [5, 0], [5, -2.5]]);
assert.equal(route.throughput, 1.5, 'Mk.1 route should expose 1.5 items/s throughput');

belt1.rotation = Math.PI;
assert.equal(
  findDirectionalRoute(buildings, source, 'crushed_metal', acceptsSeller),
  null,
  'belt pointing back into source must not pull an item out backwards',
);
belt1.rotation = 0;

const splitter = { id: 'splitter', type: 'splitter', x: 2.5, z: 0, rotation: 0 };
assert.deepEqual(logisticsInputKeys(splitter), ['0,0'], 'splitter should have one rear input');
assert.deepEqual(new Set(logisticsOutputKeys(splitter)), new Set(['2,0', '1,-1', '1,1']), 'splitter should output forward and both sides');

const splitBuildings = [
  { id: 'hopper', type: 'hopper', x: 0, z: 0 },
  splitter,
  { id: 'east-belt', type: 'conveyor_mk2', x: 5, z: 0, rotation: 0 },
  { id: 'seller-east', type: 'seller', x: 7.5, z: 0 },
  { id: 'north-belt', type: 'conveyor_mk2', x: 2.5, z: -2.5, rotation: Math.PI / 2 },
  { id: 'seller-north', type: 'seller', x: 2.5, z: -5 },
  { id: 'south-belt', type: 'conveyor_mk2', x: 2.5, z: 2.5, rotation: Math.PI * 1.5 },
  { id: 'seller-south', type: 'seller', x: 2.5, z: 5 },
];
const splitRoutes = findDirectionalRoutes(splitBuildings, splitBuildings[0], 'metal_scrap', acceptsSeller);
assert.equal(splitRoutes.length, 3, 'splitter should expose three valid target routes');
assert.deepEqual(splitRoutes.map((entry) => entry.target.id), ['seller-east', 'seller-north', 'seller-south']);
assert.ok(splitRoutes.every((entry) => entry.throughput === 3), 'Mk.2 splitter branches should preserve 3 items/s throughput');

let cursor = 0;
const chosen = [];
for (let i = 0; i < 6; i += 1) {
  const selection = selectDirectionalRoute(splitRoutes, cursor);
  chosen.push(selection.route.target.id);
  cursor = selection.nextCursor;
}
assert.deepEqual(chosen, [
  'seller-east', 'seller-north', 'seller-south',
  'seller-east', 'seller-north', 'seller-south',
], 'route selection should round-robin deterministically');

const merger = { id: 'merger', type: 'merger', x: 2.5, z: 0, rotation: 0 };
assert.deepEqual(new Set(logisticsInputKeys(merger)), new Set(['0,0', '1,-1', '1,1']), 'merger should accept rear and side inputs');
assert.deepEqual(logisticsOutputKeys(merger), ['2,0'], 'merger should have one forward output');

const mergerTail = [
  merger,
  { id: 'merge-out', type: 'conveyor_mk2', x: 5, z: 0, rotation: 0 },
  { id: 'merge-seller', type: 'seller', x: 7.5, z: 0 },
];
for (const mergeSource of [
  { id: 'west-source', type: 'hopper', x: 0, z: 0 },
  { id: 'north-source', type: 'hopper', x: 2.5, z: -2.5 },
  { id: 'south-source', type: 'hopper', x: 2.5, z: 2.5 },
]) {
  const mergeRoute = findDirectionalRoute([mergeSource, ...mergerTail], mergeSource, 'metal_scrap', acceptsSeller);
  assert.ok(mergeRoute, `${mergeSource.id} should enter merger through a valid input port`);
  assert.equal(mergeRoute.target.id, 'merge-seller');
  assert.equal(mergeRoute.throughput, 3);
}

const outputSideSource = { id: 'east-source', type: 'hopper', x: 5, z: 0 };
assert.equal(
  findDirectionalRoute([
    outputSideSource,
    merger,
    { id: 'west-tail', type: 'conveyor_mk2', x: 0, z: 0, rotation: Math.PI },
    { id: 'west-seller', type: 'seller', x: -2.5, z: 0 },
  ], outputSideSource, 'metal_scrap', acceptsSeller),
  null,
  'merger output side must not behave like an input',
);

const mk2Source = { id: 'mk2-source', type: 'hopper', x: 0, z: 0 };
const mk2 = { id: 'mk2', type: 'conveyor_mk2', x: 2.5, z: 0, rotation: 0 };
const mk2Seller = { id: 'mk2-seller', type: 'seller', x: 5, z: 0 };
const mk2Route = findDirectionalRoute([mk2Source, mk2, mk2Seller], mk2Source, 'metal_scrap', acceptsSeller);
assert.equal(mk2Route?.throughput, 3);
assert.equal(logisticsThroughput('conveyor_mk2'), 3);

const mixedRoute = findDirectionalRoute([
  mk2Source,
  mk2,
  { id: 'slow-belt', type: 'conveyor', x: 5, z: 0, rotation: 0 },
  { id: 'mixed-seller', type: 'seller', x: 7.5, z: 0 },
], mk2Source, 'metal_scrap', acceptsSeller);
assert.equal(mixedRoute?.throughput, 1.5, 'slowest route node should define effective throughput');

console.log('Directional logistics tests passed.');
