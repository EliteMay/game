import assert from 'node:assert/strict';
import {
  directionFromRotation,
  findDirectionalRoute,
  reverseRotation,
  rotateQuarter,
} from '../games/scrap-factory/logistics.js';

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
const route = findDirectionalRoute(buildings, source, 'crushed_metal', (building) => building.type === 'seller');
assert.ok(route, 'east then north route should resolve');
assert.equal(route.target.id, 'seller');
assert.deepEqual(route.path.map(({ x, z }) => [x, z]), [[0, 0], [2.5, 0], [5, 0], [5, -2.5]]);

belt1.rotation = Math.PI;
assert.equal(
  findDirectionalRoute(buildings, source, 'crushed_metal', (building) => building.type === 'seller'),
  null,
  'belt pointing back into source must not pull an item out backwards',
);

console.log('Directional logistics tests passed.');
