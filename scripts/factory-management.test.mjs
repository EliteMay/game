import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BUILD_MENU_ORDER } from '../games/scrap-factory/config.js';
import { analyzeFactory, CHALLENGES, challengeState, planProduction } from '../games/scrap-factory/factory-management.js';

const [featurePack, managementCss] = await Promise.all([
  readFile(new URL('../games/scrap-factory/feature-pack.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/factory-management.css', import.meta.url), 'utf8'),
]);

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
assert.ok(Array.isArray(factory.diagnostics), 'factory analyzer should expose per-building diagnostics');
assert.equal(factory.diagnostics.length, factory.totalBuildings, 'every building should have one primary diagnostic state');
assert.equal(factory.diagnostics.find((entry) => entry.buildingId === 'crusher')?.severity, 'warn', 'blocked production should become a warning diagnostic');
assert.equal(factory.diagnostics.find((entry) => entry.buildingId === 'dead-belt')?.status, '行き止まり', 'logistics diagnosis should reuse analyzer causes');
assert.equal(factory.diagnosticProblemCount, factory.diagnostics.filter((entry) => entry.severity !== 'ok').length);

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
assert.equal(capacityFactory.diagnostics.find((entry) => entry.buildingId === 'small-full')?.severity, 'warn');

const uncoveredPower = analyzeFactory({
  progression: { progressionRank: 4 },
  buildings: [
    { id: 'far-crusher', type: 'crusher', x: 30, z: 30, rotation: 0, input: { metal_scrap: 1 }, output: {} },
  ],
});
const powerDiagnostic = uncoveredPower.diagnostics.find((entry) => entry.buildingId === 'far-crusher');
assert.equal(powerDiagnostic?.severity, 'warn', 'unpowered consumers must be warning diagnostics');
assert.match(powerDiagnostic?.status || '', /NO POWER/, 'diagnostics must explain the power cause instead of only saying stopped');
assert.match(powerDiagnostic?.detail || '', /Power Pole|Factory Grid/, 'power diagnostics must include a next-check hint');

const ironPlan = planProduction('iron_ingot', 20);
const smelter = ironPlan.lines.find((line) => line.kind === 'machine' && line.machine === 'smelter');
const crusher = ironPlan.lines.find((line) => line.kind === 'machine' && line.machine === 'crusher');
const raw = ironPlan.lines.find((line) => line.kind === 'raw' && line.itemId === 'metal_scrap');
assert.ok(smelter && smelter.machines > 0);
assert.ok(crusher && crusher.machines > 0);
assert.equal(raw?.rate, 20);

assert.match(featurePack, /KeyV/, 'factory diagnostics must have a keyboard toggle');
assert.match(featurePack, /factory-diagnostic-overlay/, 'diagnostics must render as an on-demand gameplay overlay');
assert.match(featurePack, /data-locate-building/, 'Problems must be able to hand off to world location diagnostics');
assert.match(featurePack, /\.project\(world\.camera\)/, 'diagnostic labels must project real 3D building positions through the current camera');
assert.match(featurePack, /DIAGNOSTIC_WARN_LIMIT/, 'diagnostic overlay must cap warning label density');
assert.match(featurePack, /DIAGNOSTIC_HEALTHY_RANGE/, 'healthy diagnostic labels must be proximity-limited');
assert.match(featurePack, /data-tab="problems"/, 'factory management must expose a dedicated Problems view');
assert.match(featurePack, /data-tab="production"/, 'factory management must expose a dedicated Production view');
assert.doesNotMatch(featurePack, /Factory Management追加/, 'normal sessions should not announce implementation-history toasts');
assert.match(managementCss, /\.factory-diagnostic-overlay\s*\{[\s\S]*pointer-events:\s*none;/, 'diagnostic overlay must not block first-person input');
assert.match(managementCss, /\.diagnostic-label--warn/, 'warning diagnostics must have a distinct non-color-only state class');
assert.match(managementCss, /\.problem-row__icon/, 'problem severity must include an icon/text channel rather than color only');

console.log('Factory management and diagnostic tests passed');