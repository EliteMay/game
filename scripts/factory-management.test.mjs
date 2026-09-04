import assert from 'node:assert/strict';
import { analyzeFactory, CHALLENGES, challengeState, planProduction } from '../games/scrap-factory/factory-management.js';

const game = {
  lifetimeRevenue: 1200,
  playTimeSeconds: 1900,
  discoveredItems: ['metal_scrap', 'copper_wire', 'plastic', 'e_waste', 'crushed_metal', 'iron_ingot'],
  tutorialStats: { collected: 55, processed: 12, automationComplete: true },
  buildings: [
    { id: 'hopper', type: 'hopper', x: 0, z: 0, rotation: 0, permanent: true, input: {}, output: {} },
    { id: 'belt-1', type: 'conveyor', x: 2.5, z: 0, rotation: 0, permanent: false, input: {}, output: {} },
    { id: 'crusher', type: 'crusher', x: 5, z: 0, rotation: 0, permanent: false, input: { metal_scrap: 1 }, output: { crushed_metal: 3 }, progress: 0 },
    { id: 'dead-belt', type: 'conveyor', x: 0, z: 5, rotation: 0, permanent: false, input: {}, output: {} },
    ...Array.from({ length: 7 }, (_, index) => ({ id: `storage-${index}`, type: 'storage', x: 20 + index * 2.5, z: 20, rotation: 0, permanent: false, input: {}, output: {} })),
  ],
};

for (const challenge of CHALLENGES) {
  assert.equal(challengeState(game, challenge).done, true, `${challenge.id} should be complete`);
}

const factory = analyzeFactory(game);
assert.equal(factory.totalBuildings, 11);
assert.equal(factory.playerBuilt, 10);
assert.ok(factory.activeMachines >= 1);
assert.ok(factory.alerts.some((alert) => alert.title.includes('行き止まり')), 'dead-end conveyor should be reported');
assert.ok(factory.alerts.some((alert) => alert.title.includes('出力が滞留')), 'blocked crusher output should be reported');

const ironPlan = planProduction('iron_ingot', 20);
const smelter = ironPlan.lines.find((line) => line.kind === 'machine' && line.machine === 'smelter');
const crusher = ironPlan.lines.find((line) => line.kind === 'machine' && line.machine === 'crusher');
const raw = ironPlan.lines.find((line) => line.kind === 'raw' && line.itemId === 'metal_scrap');
assert.ok(smelter && smelter.machines > 0);
assert.ok(crusher && crusher.machines > 0);
assert.equal(raw?.rate, 20);

console.log('Factory management tests passed');
