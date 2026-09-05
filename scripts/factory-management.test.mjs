import assert from 'node:assert/strict';
import { BUILD_MENU_ORDER } from '../games/scrap-factory/config.js';
import { analyzeFactory, CHALLENGES, challengeState, planProduction } from '../games/scrap-factory/factory-management.js';

assert.deepEqual(
  BUILD_MENU_ORDER.slice(0, 5),
  ['crusher', 'smelter', 'conveyor', 'storage', 'seller'],
  'quick-build 1-5 ordering is a public control contract',
);

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
assert.equal(factory.storageCapacity, 840, 'seven Small Storages should expose 840 total capacity');

const logisticsFactory = analyzeFactory({
  buildings: [
    { id: 'splitter', type: 'splitter', x: 0, z: 0, rotation: 0, input: {}, output: {} },
    { id: 'east-mk2', type: 'conveyor_mk2', x: 2.5, z: 0, rotation: 0, input: {}, output: {} },
    { id: 'north-mk2', type: 'conveyor_mk2', x: 0, z: -2.5, rotation: Math.PI / 2, input: {}, output: {} },
  ],
});
assert.equal(logisticsFactory.logisticsNodes, 3);
assert.equal(logisticsFactory.logisticsCapacity, 9);
assert.equal(
  logisticsFactory.alerts.some((alert) => alert.title.includes('分岐先が1本のみ')),
  false,
  'splitter with two connected output ports should not be reported as a one-branch splitter',
);

const underusedSplitter = analyzeFactory({
  buildings: [
    { id: 'splitter', type: 'splitter', x: 0, z: 0, rotation: 0, input: {}, output: {} },
    { id: 'east-mk2', type: 'conveyor_mk2', x: 2.5, z: 0, rotation: 0, input: {}, output: {} },
  ],
});
assert.ok(
  underusedSplitter.alerts.some((alert) => alert.title.includes('分岐先が1本のみ')),
  'splitter with only one valid output should be reported',
);

const capacityFactory = analyzeFactory({
  progression: { progressionRank: 4 },
  buildings: [
    { id: 'small-full', type: 'storage', x: 0, z: 0, rotation: 0, input: {}, output: { metal_scrap: 120 } },
    { id: 'industrial', type: 'industrial_storage', x: 2.5, z: 0, rotation: 0, input: {}, output: { iron_ingot: 200 } },
    { id: 'battery', type: 'battery', x: 5, z: 0, rotation: 0, input: {}, output: {}, powerStored: 500 },
    { id: 'crusher-power', type: 'crusher', x: 7.5, z: 0, rotation: 0, input: {}, output: {} },
  ],
});
assert.equal(capacityFactory.storageUsed, 320);
assert.equal(capacityFactory.storageCapacity, 720);
assert.equal(capacityFactory.storageFull, 1);
assert.ok(capacityFactory.alerts.some((alert) => alert.title.includes('満杯')), 'full storage should be a warning alert');
assert.equal(capacityFactory.power.enabled, true);
assert.equal(capacityFactory.power.demand, 18);
assert.equal(capacityFactory.power.batteryStored, 500);
assert.equal(capacityFactory.power.batteryCapacity, 960);

const ironPlan = planProduction('iron_ingot', 20);
const smelter = ironPlan.lines.find((line) => line.kind === 'machine' && line.machine === 'smelter');
const crusher = ironPlan.lines.find((line) => line.kind === 'machine' && line.machine === 'crusher');
const raw = ironPlan.lines.find((line) => line.kind === 'raw' && line.itemId === 'metal_scrap');
assert.ok(smelter && smelter.machines > 0);
assert.ok(crusher && crusher.machines > 0);
assert.equal(raw?.rate, 20);

console.log('Factory management tests passed');
