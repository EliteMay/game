import assert from 'node:assert/strict';
import {
  POST_CLEAR_OBJECTIVES,
  applyOptimizationResults,
  evaluateOptimizationSnapshot,
  makeDefaultPostClearOptimization,
  normalizePostClearOptimization,
} from '../games/scrap-factory/post-clear-optimization.js';
import { makeDefaultGameSave } from '../games/scrap-factory/storage.js';

const strongSnapshot = {
  unlocked: true,
  power: { status: 'ok', reserve: 320 },
  storage: { capacity: 4200, remaining: 2200 },
  logistics: { mk3: 22, adaptiveSplitters: 5, warehouses: 3 },
  redundancy: { finalAutomation: true, experimentalPowerSystems: 2, advancedDronePorts: 7 },
};

const locked = evaluateOptimizationSnapshot({ ...strongSnapshot, unlocked: false });
assert.equal(locked.length, POST_CLEAR_OBJECTIVES.length);
assert.equal(locked.every((objective) => objective.locked && !objective.done), true, 'optimization objectives must stay locked before Main Clear');

const completed = evaluateOptimizationSnapshot(strongSnapshot);
assert.equal(completed.every((objective) => objective.done), true, 'representative optimized factory snapshot should satisfy all objectives');

const partial = evaluateOptimizationSnapshot({
  unlocked: true,
  power: { status: 'shortage', reserve: 500 },
  storage: { capacity: 3600, remaining: 900 },
  logistics: { mk3: 18, adaptiveSplitters: 2, warehouses: 2 },
  redundancy: { finalAutomation: false, experimentalPowerSystems: 3, advancedDronePorts: 8 },
});
assert.equal(partial.find((objective) => objective.id === 'power_headroom')?.done, false, 'power reserve cannot hide a current shortage');
assert.equal(partial.find((objective) => objective.id === 'storage_headroom')?.done, false, 'storage objective requires both total capacity and free headroom');
assert.equal(partial.find((objective) => objective.id === 'logistics_backbone')?.done, false, 'logistics objective requires adaptive splitter redundancy');
assert.equal(partial.find((objective) => objective.id === 'redundant_automation')?.done, false, 'redundancy objective requires the current final automation graph to remain valid');

const game = makeDefaultGameSave();
assert.deepEqual(game.postClearOptimization, makeDefaultPostClearOptimization(), 'new save must include additive post-clear optimization state');
const beforeClear = applyOptimizationResults(game, completed, new Date('2026-09-06T00:00:00Z'));
assert.equal(beforeClear.changed, false, 'optimization history must not record before Main Clear');
assert.equal(game.postClearOptimization.completedObjectiveIds.length, 0);

game.finalChapter.mainClearedAt = '2026-09-06T00:00:00.000Z';
const first = applyOptimizationResults(game, completed, new Date('2026-09-06T00:10:00Z'));
assert.equal(first.changed, true);
assert.deepEqual(new Set(first.newlyCompleted), new Set(POST_CLEAR_OBJECTIVES.map((objective) => objective.id)));
assert.equal(first.mastered, true);
assert.equal(typeof game.postClearOptimization.masteredAt, 'string');

const regressed = applyOptimizationResults(game, partial, new Date('2026-09-06T00:20:00Z'));
assert.equal(regressed.changed, false, 'historical optimization completions must not be revoked when the factory is later rebuilt');
assert.equal(game.postClearOptimization.completedObjectiveIds.length, POST_CLEAR_OBJECTIVES.length);

const normalized = normalizePostClearOptimization({
  version: 999,
  completedObjectiveIds: ['power_headroom', 'unknown', 'power_headroom'],
  completedAt: { power_headroom: '2026-09-06T00:00:00.000Z', unknown: 'bad' },
  masteredAt: 123,
});
assert.deepEqual(normalized.completedObjectiveIds, ['power_headroom']);
assert.deepEqual(normalized.completedAt, { power_headroom: '2026-09-06T00:00:00.000Z' });
assert.equal(normalized.masteredAt, null);
assert.equal(game.schemaVersion, 1, 'post-clear content must not create a Rank/Save schema break');
assert.equal(game.progression.progressionRank, 1, 'test fixture must preserve existing Rank contract');

console.log('Post-clear Factory Optimization tests passed');
