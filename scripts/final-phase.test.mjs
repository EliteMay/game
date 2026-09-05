import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITEMS } from '../games/scrap-factory/config.js';
import { makeDefaultExploration } from '../games/scrap-factory/exploration.js';
import {
  MEGA_FACTORY_STABLE_SECONDS,
  acknowledgeMainClear,
  advanceMegaFactoryStability,
  advanceStableOperationState,
  analyzeMegaFactory,
  finalPhaseStatus,
} from '../games/scrap-factory/final-phase.js';
import { makeDefaultProgression } from '../games/scrap-factory/progression.js';
import { makeDefaultFinalChapter, makeDefaultGameSave } from '../games/scrap-factory/storage.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GRID = 2.5;

function gameAtFinal() {
  const progression = makeDefaultProgression();
  progression.progressionRank = 7;
  progression.researchData = 20;
  progression.completedResearch.push('advanced_assembly', 'experimental_fabrication', 'experimental_technology');
  progression.unlocks.push(
    'tier:experimental',
    'production:autonomous_core',
    'production:automated_components',
    'building:advanced_drone_port',
    'building:experimental_power_system',
  );
  const exploration = makeDefaultExploration();
  exploration.areas.residential.objective.completed = true;
  exploration.areas.residential.resourcePoints = ['residential-copper-network'];
  exploration.areas.industrial.objective.completed = true;
  exploration.areas.industrial.resourcePoints = ['industrial-electronics-cache'];
  exploration.areas.military.objective.completed = true;
  exploration.areas.military.resourcePoints = ['military-alloy-cache'];
  return {
    schemaVersion: 1,
    money: 99999,
    lifetimeRevenue: 99999,
    inventory: Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])),
    discoveredItems: ['metal_scrap', 'rare_alloy', 'autonomous_industrial_core'],
    tutorialStats: { collected: 100, processed: 100, automationComplete: true },
    progression,
    exploration,
    finalChapter: makeDefaultFinalChapter(),
    buildings: [],
  };
}

function buildMegaFactory() {
  const game = gameAtFinal();
  const byCell = new Map();
  const add = (id, type, gx, gz, extra = {}) => {
    const cell = `${gx},${gz}`;
    assert.equal(byCell.has(cell), false, `fixture collision at ${cell}`);
    const building = {
      id,
      type,
      x: gx * GRID,
      z: gz * GRID,
      rotation: 0,
      input: {},
      output: {},
      progress: 0,
      powerFuelSeconds: 0,
      powerStored: 0,
      logisticsCursor: 0,
      permanent: false,
      ...extra,
    };
    byCell.set(cell, building);
    game.buildings.push(building);
    return building;
  };

  for (let x = -12; x <= 40; x += 1) add(`bus-${x}`, 'conveyor_mk3', x, 0);
  const bus = (x) => byCell.get(`${x},0`);
  const setBusType = (x, type) => { bus(x).type = type; bus(x).rotation = 0; };

  const addSource = (id, type, x, resourcePointId) => {
    setBusType(x, 'merger');
    add(`${id}-feed`, 'conveyor_mk3', x, 1, { rotation: Math.PI / 2 });
    return add(id, type, x, 2, { resourcePointId });
  };

  const addMachineStation = (id, type, x, { returnToBus = true, extra = {} } = {}) => {
    setBusType(x, 'splitter');
    add(`${id}-input`, 'conveyor_mk3', x, 1, { rotation: Math.PI * 1.5 });
    const machine = add(id, type, x, 2, extra);
    if (returnToBus) {
      setBusType(x + 2, 'merger');
      add(`${id}-out-a`, 'conveyor_mk3', x + 1, 2, { rotation: 0 });
      add(`${id}-out-b`, 'conveyor_mk3', x + 2, 2, { rotation: Math.PI / 2 });
      add(`${id}-out-c`, 'conveyor_mk3', x + 2, 1, { rotation: Math.PI / 2 });
    }
    return machine;
  };

  addSource('src-scrap', 'advanced_drone_port_scrap', -10, 'industrial-scrap-reserve');
  addSource('src-copper', 'advanced_drone_port_copper', -8, 'residential-copper-network');
  addSource('src-plastic', 'advanced_drone_port_plastic', -6, 'residential-polymer-stockpile');
  addSource('src-electronics', 'advanced_drone_port_electronics', -4, 'industrial-electronics-cache');
  addSource('src-alloy', 'advanced_drone_port', -2, 'military-alloy-cache');

  addMachineStation('crusher-final', 'crusher', 2);
  addMachineStation('smelter-final', 'smelter', 6);
  addMachineStation('assembler-plate-final', 'assembler_plate', 10);
  addMachineStation('assembler-motor-final', 'assembler_motor', 14);
  addMachineStation('assembler-circuit-final', 'assembler_circuit', 18);
  addMachineStation('assembler-control-final', 'assembler', 22);
  addMachineStation('experimental-power-a', 'experimental_power_system', 26, {
    returnToBus: false,
    extra: { powerFuelSeconds: 20 },
  });
  add('experimental-power-b', 'experimental_power_system', 28, 3, { powerFuelSeconds: 20 });
  addMachineStation('fabricator-set-final', 'fabricator', 30);
  const core = addMachineStation('fabricator-core-final', 'fabricator_core', 34);
  const storage = addMachineStation('storage-final', 'logistics_warehouse', 38, { returnToBus: false });

  for (let x = -10; x <= 38; x += 2) add(`pole-${x}`, 'power_pole', x, -2);
  core.output.autonomous_industrial_core = 1;
  return { game, core, storage };
}

assert.equal(MEGA_FACTORY_STABLE_SECONDS, 180);

{
  const state = makeDefaultFinalChapter();
  const jump = advanceStableOperationState(state, true, 60, new Date('2026-09-05T13:00:00Z'));
  assert.equal(jump.state.megaFactoryStableSeconds, 1, 'one delayed frame must not grant offline/background time');
  const interrupted = advanceStableOperationState({ ...jump.state, megaFactoryStableSeconds: 30, megaFactoryBestSeconds: 30 }, false, 1);
  assert.equal(interrupted.state.megaFactoryStableSeconds, 0);
  assert.equal(interrupted.state.megaFactoryBestSeconds, 30);
  assert.equal(interrupted.cleared, false);
}

{
  const { game, storage } = buildMegaFactory();
  const analysis = analyzeMegaFactory(game);
  assert.equal(analysis.stable, true, `Mega Factory fixture should be stable: ${analysis.missing.map((entry) => entry.id).join(', ')}`);
  assert.equal(analysis.conditions.finalAutomation, true);
  assert.equal(analysis.conditions.noPowerShortage, true);
  assert.equal(analysis.conditions.finalStorageAvailable, true);
  assert.equal(analysis.conditions.routeFlow, true);

  for (let i = 0; i < 30; i += 1) advanceMegaFactoryStability(game, 1);
  assert.equal(Math.floor(game.finalChapter.megaFactoryStableSeconds), 30);

  storage.output.autonomous_industrial_core = 1800;
  const stopped = advanceMegaFactoryStability(game, 1);
  assert.equal(stopped.analysis.conditions.finalStorageAvailable, false);
  assert.equal(stopped.state.megaFactoryStableSeconds, 0, 'continuous timer must reset when stability breaks');
  assert.equal(Math.floor(stopped.state.megaFactoryBestSeconds), 30);

  storage.output = {};
  const clearAt = new Date('2026-09-05T13:30:00Z');
  let result = null;
  for (let i = 0; i < MEGA_FACTORY_STABLE_SECONDS; i += 1) {
    result = advanceMegaFactoryStability(game, 1, clearAt);
  }
  assert.equal(result.justCleared, true);
  assert.equal(result.cleared, true);
  assert.equal(game.finalChapter.mainClearedAt, clearAt.toISOString());
  assert.equal(Math.floor(game.finalChapter.megaFactoryStableSeconds), MEGA_FACTORY_STABLE_SECONDS);

  storage.output.autonomous_industrial_core = 1800;
  const afterClear = advanceMegaFactoryStability(game, 1);
  assert.equal(afterClear.cleared, true, 'Main Clear is a historical milestone and must not be revoked by later optimization changes');
  assert.equal(afterClear.state.mainClearedAt, clearAt.toISOString());

  assert.equal(acknowledgeMainClear(game, new Date('2026-09-05T13:31:00Z')), true);
  assert.equal(acknowledgeMainClear(game, new Date('2026-09-05T13:32:00Z')), false);
  const status = finalPhaseStatus(game);
  assert.equal(status.cleared, true);
  assert.equal(status.acknowledged, true);
  assert.equal(status.progress, 1);
}

{
  const save = makeDefaultGameSave();
  assert.equal(save.schemaVersion, 1);
  assert.equal(save.progression.version, 1);
  assert.equal(save.exploration.version, 1);
  assert.deepEqual(save.finalChapter, makeDefaultFinalChapter());
}

{
  const html = fs.readFileSync(path.join(root, 'games/scrap-factory/index.html'), 'utf8');
  const progressionEntry = fs.readFileSync(path.join(root, 'games/scrap-factory/progression-ui.js'), 'utf8');
  const finalUi = fs.readFileSync(path.join(root, 'games/scrap-factory/final-phase-ui.js'), 'utf8');
  assert.ok(html.includes('src="./progression-ui.js"'), 'production HTML must load progression/final phase UI');
  assert.ok(progressionEntry.includes("import './final-phase-ui.js'"));
  assert.equal(finalUi.includes('MutationObserver'), false, 'Final Phase UI must not complete itself through a self-triggering MutationObserver');
  for (const marker of ['MEGA FACTORY', 'MAIN CLEAR', 'PERSIST_BUCKET_SECONDS', 'advanceMegaFactoryStability']) {
    assert.ok(finalUi.includes(marker), `Final Phase UI missing ${marker}`);
  }
}

console.log('Final Phase Mega Factory / Main Clear tests passed.');
