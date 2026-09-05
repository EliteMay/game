import assert from 'node:assert/strict';
import {
  findDirectionalRoute,
  logisticsOutputKeys,
  logisticsThroughput,
  smartSorterLaneForItem,
} from '../games/scrap-factory/logistics.js';
import {
  isBuildingUnlocked,
  makeDefaultProgression,
  requiredBuildingRank,
} from '../games/scrap-factory/progression.js';
import { analyzeFactory } from '../games/scrap-factory/factory-management.js';

const acceptsSeller = (building) => building.type === 'seller';
const sorter = { id: 'sorter', type: 'smart_sorter', x: 2.5, z: 0, rotation: 0 };

assert.equal(logisticsThroughput('smart_sorter'), 3);
assert.equal(smartSorterLaneForItem('circuit'), 'forward');
assert.equal(smartSorterLaneForItem('iron_ingot'), 'left');
assert.equal(smartSorterLaneForItem('tool_kit'), 'left');
assert.equal(smartSorterLaneForItem('metal_scrap'), 'right');
assert.deepEqual(logisticsOutputKeys(sorter, 'circuit'), ['2,0']);
assert.deepEqual(logisticsOutputKeys(sorter, 'iron_ingot'), ['1,-1']);
assert.deepEqual(logisticsOutputKeys(sorter, 'metal_scrap'), ['1,1']);

const source = { id: 'source', type: 'hopper', x: 0, z: 0 };
const sorterNetwork = [
  source,
  sorter,
  { id: 'east-belt', type: 'conveyor_mk2', x: 5, z: 0, rotation: 0 },
  { id: 'seller-advanced', type: 'seller', x: 7.5, z: 0 },
  { id: 'north-belt', type: 'conveyor_mk2', x: 2.5, z: -2.5, rotation: Math.PI / 2 },
  { id: 'seller-processed', type: 'seller', x: 2.5, z: -5 },
  { id: 'south-belt', type: 'conveyor_mk2', x: 2.5, z: 2.5, rotation: Math.PI * 1.5 },
  { id: 'seller-raw', type: 'seller', x: 2.5, z: 5 },
];

assert.equal(findDirectionalRoute(sorterNetwork, source, 'circuit', acceptsSeller)?.target.id, 'seller-advanced');
assert.equal(findDirectionalRoute(sorterNetwork, source, 'iron_ingot', acceptsSeller)?.target.id, 'seller-processed');
assert.equal(findDirectionalRoute(sorterNetwork, source, 'tool_kit', acceptsSeller)?.target.id, 'seller-processed');
assert.equal(findDirectionalRoute(sorterNetwork, source, 'metal_scrap', acceptsSeller)?.target.id, 'seller-raw');

const progression = makeDefaultProgression();
const progressionGame = {
  progression,
  buildings: [],
  inventory: {},
  discoveredItems: [],
  tutorialStats: {},
};
progression.progressionRank = 4;
assert.equal(requiredBuildingRank('smart_sorter'), 5);
assert.equal(isBuildingUnlocked(progressionGame, 'smart_sorter'), false);
progression.progressionRank = 5;
assert.equal(isBuildingUnlocked(progressionGame, 'smart_sorter'), true);

const analyticsGame = {
  progression: { ...makeDefaultProgression(), progressionRank: 5 },
  buildings: [
    { id: 'crusher', type: 'crusher', x: 0, z: 0, rotation: 0, input: { metal_scrap: 1 }, output: {}, progress: 0 },
    { id: 'belt', type: 'conveyor', x: 2.5, z: 0, rotation: 0 },
    { id: 'seller', type: 'seller', x: 5, z: 0, rotation: 0, input: {}, output: {} },
    { id: 'full-storage', type: 'storage', x: 10, z: 10, rotation: 0, input: {}, output: { iron_ingot: 120 } },
    { id: 'sorter-stats', type: 'smart_sorter', x: 15, z: 15, rotation: 0 },
  ],
  inventory: {},
  discoveredItems: [],
  tutorialStats: {},
};
const analytics = analyzeFactory(analyticsGame);
assert.ok(analytics.production.theoreticalPerMinute > 0, 'production statistics should expose theoretical output rate');
assert.ok(analytics.production.routeSupportedPerMinute > 0, 'production statistics should expose routed output capacity');
assert.equal(analytics.production.smartSorters, 1);
assert.ok(analytics.production.bottleneckCount >= 1, 'full storage should be detected as a bottleneck');
assert.ok(analytics.alerts.some((alert) => alert.kind === 'bottleneck' && alert.title.includes('満杯')));

console.log('Phase 4-B advanced logistics tests passed.');
