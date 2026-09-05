import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILDINGS, BUILD_MENU_ORDER, ITEMS, RECIPES } from '../games/scrap-factory/config.js';
import {
  DRONE_TIER_ADVANCED,
  assignDroneResourcePoint,
  securedDroneResourcePoints,
} from '../games/scrap-factory/drone-routes.js';
import { makeDefaultExploration } from '../games/scrap-factory/exploration.js';
import { analyzeFinalAutomation } from '../games/scrap-factory/final-automation.js';
import { assignProductionRecipe } from '../games/scrap-factory/production-recipes.js';
import {
  PLAYABLE_MAX_RANK,
  buildingUnlockState,
  completeResearch,
  makeDefaultProgression,
} from '../games/scrap-factory/progression.js';
import { makeDefaultGameSave } from '../games/scrap-factory/storage.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GRID = 2.5;

function gameAt(rank = 7) {
  const progression = makeDefaultProgression();
  progression.progressionRank = rank;
  progression.researchData = 20;
  const exploration = makeDefaultExploration();
  exploration.areas.residential.objective.completed = true;
  exploration.areas.residential.resourcePoints = ['residential-copper-network'];
  exploration.areas.industrial.objective.completed = true;
  exploration.areas.industrial.resourcePoints = ['industrial-electronics-cache'];
  exploration.areas.military.objective.completed = true;
  exploration.areas.military.resourcePoints = ['military-alloy-cache'];
  return {
    money: 99999,
    lifetimeRevenue: 99999,
    inventory: Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])),
    discoveredItems: ['metal_scrap', 'rare_alloy'],
    tutorialStats: { collected: 100, processed: 100, automationComplete: true },
    progression,
    exploration,
    buildings: [],
  };
}

function completeExperimentalTechnology(game) {
  game.progression.blueprints.push('central_core_experimental_blueprint');
  assert.equal(completeResearch(game, 'experimental_technology').changed, true);
}

assert.equal(PLAYABLE_MAX_RANK, 7);
assert.deepEqual(BUILD_MENU_ORDER.slice(0, 5), ['crusher', 'smelter', 'conveyor', 'storage', 'seller']);
assert.ok(ITEMS.autonomous_industrial_core);
assert.equal(Object.keys(RECIPES.fabricator_autonomous_core.input).length <= 4, true);
assert.deepEqual(RECIPES.fabricator_autonomous_core.output, { autonomous_industrial_core: 1 });
assert.equal(BUILDINGS.experimental_power_system.powerGeneration, 480);
assert.equal(BUILDINGS.experimental_power_system.powerFuelItem, 'rare_alloy');
assert.equal(BUILDINGS.advanced_drone_port.powerUse, 95);

{
  const game = gameAt();
  assert.equal(buildingUnlockState(game, 'advanced_drone_port').reason, 'research');
  assert.equal(buildingUnlockState(game, 'experimental_power_system').reason, 'research');
  assert.equal(buildingUnlockState(game, 'fabricator_core').reason, 'research');
  completeExperimentalTechnology(game);
  assert.equal(buildingUnlockState(game, 'advanced_drone_port').unlocked, true);
  assert.equal(buildingUnlockState(game, 'experimental_power_system').unlocked, true);
  assert.equal(buildingUnlockState(game, 'fabricator_core').unlocked, true);
  assert.ok(game.progression.unlocks.includes('production:autonomous_core'));
  assert.ok(game.progression.unlocks.includes('production:automated_components'));
}

{
  const game = gameAt();
  game.progression.completedResearch.push('experimental_technology');
  assert.equal(buildingUnlockState(game, 'advanced_drone_port').unlocked, true, 'legacy completed research must remain sufficient');
  assert.equal(buildingUnlockState(game, 'experimental_power_system').unlocked, true);
}

{
  const game = gameAt();
  completeExperimentalTechnology(game);
  const advanced = securedDroneResourcePoints(game, DRONE_TIER_ADVANCED);
  assert.deepEqual(
    advanced.map((point) => point.itemId).sort(),
    ['copper_wire', 'e_waste', 'metal_scrap', 'plastic', 'rare_alloy'].sort(),
  );

  const utilityPort = { id: 'utility', type: 'drone_port', resourcePointId: 'military-alloy-cache', progress: 4, output: { rare_alloy: 2 } };
  const blocked = assignDroneResourcePoint(game, utilityPort, 'residential-polymer-stockpile');
  assert.equal(blocked.changed, false);
  assert.equal(blocked.reason, 'tier-unavailable');
  assert.deepEqual(utilityPort.output, { rare_alloy: 2 });

  const advancedPort = { id: 'advanced', type: 'advanced_drone_port', resourcePointId: 'military-alloy-cache', progress: 3, output: { rare_alloy: 1 } };
  const changed = assignDroneResourcePoint(game, advancedPort, 'residential-polymer-stockpile');
  assert.equal(changed.changed, true);
  assert.equal(advancedPort.type, 'advanced_drone_port_plastic');
  assert.equal(advancedPort.progress, 0);
  assert.deepEqual(advancedPort.output, { rare_alloy: 1 });
}

{
  const game = gameAt();
  game.progression.completedResearch.push('advanced_assembly', 'experimental_fabrication', 'experimental_technology');
  const assembler = { id: 'assembler-test', type: 'assembler', input: { motor: 1 }, output: { control_unit: 2 }, progress: 3 };
  const blocked = assignProductionRecipe(game, assembler, 'assembler_iron_plate');
  assert.equal(blocked.changed, false);
  assert.equal(blocked.reason, 'buffer-conflict');
  assert.deepEqual(assembler.input, { motor: 1 });
  assert.deepEqual(assembler.output, { control_unit: 2 });

  assembler.input = {};
  const switched = assignProductionRecipe(game, assembler, 'assembler_iron_plate');
  assert.equal(switched.changed, true);
  assert.equal(assembler.type, 'assembler_plate');
  assert.equal(assembler.progress, 0);
  assert.deepEqual(assembler.output, { control_unit: 2 });

  const fabricator = { id: 'fabricator-test', type: 'fabricator', input: {}, output: { ai_control_module: 1 }, progress: 8 };
  assert.equal(assignProductionRecipe(game, fabricator, 'fabricator_autonomous_core').changed, true);
  assert.equal(fabricator.type, 'fabricator_core');
  assert.deepEqual(fabricator.output, { ai_control_module: 1 });
}

{
  const save = makeDefaultGameSave();
  assert.equal(save.schemaVersion, 1);
  assert.equal(save.inventory.autonomous_industrial_core, 0);
  assert.equal(save.exploration.version, 1);
  assert.equal(save.progression.version, 1);
}

function buildBusFactory() {
  const game = gameAt();
  game.progression.completedResearch.push('advanced_assembly', 'experimental_fabrication', 'experimental_technology');
  game.progression.unlocks.push(
    'tier:experimental',
    'production:autonomous_core',
    'production:automated_components',
    'building:advanced_drone_port',
    'building:experimental_power_system',
  );

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

  // One eastbound logistics bus. Sources merge from the south, machines receive
  // from a Splitter tap and return their output through a downstream Merger.
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
  const powerA = addMachineStation('experimental-power-a', 'experimental_power_system', 26, {
    returnToBus: false,
    extra: { powerFuelSeconds: 20 },
  });
  add('experimental-power-b', 'experimental_power_system', 28, 3, { powerFuelSeconds: 20 });
  addMachineStation('fabricator-set-final', 'fabricator', 30);
  const core = addMachineStation('fabricator-core-final', 'fabricator_core', 34);
  addMachineStation('storage-final', 'logistics_warehouse', 38, { returnToBus: false });

  // Pole row is separate from logistics. Every consumer is 10m from a pole and
  // poles are 5m apart, with the x=0 pole anchored by the Starter Grid.
  for (let x = -10; x <= 38; x += 2) add(`pole-${x}`, 'power_pole', x, -2);

  return { game, core, powerA };
}

{
  const { game, core, powerA } = buildBusFactory();
  const before = analyzeFinalAutomation(game);
  assert.equal(before.stages.advancedScrap, true);
  assert.equal(before.stages.advancedCopper, true);
  assert.equal(before.stages.advancedPlastic, true);
  assert.equal(before.stages.advancedElectronics, true);
  assert.equal(before.stages.advancedAlloy, true);
  assert.equal(before.stages.metallurgy, true);
  assert.equal(before.stages.plateAutomation, true);
  assert.equal(before.stages.motorAutomation, true);
  assert.equal(before.stages.circuitAutomation, true);
  assert.equal(before.stages.controlAutomation, true);
  assert.equal(before.stages.experimentalSetAutomation, true);
  assert.equal(before.stages.coreAutomation, true);
  assert.equal(before.stages.finalStorage, true);
  assert.equal(before.stages.experimentalPowerRouted, true);
  assert.equal(before.stages.experimentalPowerActive, true);
  assert.equal(powerA.powerFuelSeconds > 0, true);
  assert.equal(before.stages.poweredLine, true, `final line should be powered: ${before.missing.map((entry) => entry.id).join(', ')}`);
  assert.equal(before.topologyReady, true, `main-bus topology should be complete: ${before.missing.map((entry) => entry.id).join(', ')}`);
  assert.equal(before.stages.productProven, false);
  assert.equal(before.qualifies, false);

  core.output.autonomous_industrial_core = 1;
  game.discoveredItems.push('autonomous_industrial_core');
  const after = analyzeFinalAutomation(game);
  assert.equal(after.stages.productProven, true);
  assert.equal(after.qualifies, true, `completed main-bus line should qualify: ${after.missing.map((entry) => entry.id).join(', ')}`);
  assert.equal(after.finalStorageId, 'storage-final');
}

{
  const progressionEntrypoint = fs.readFileSync(path.join(root, 'games/scrap-factory/progression.js'), 'utf8');
  const progressionUi = fs.readFileSync(path.join(root, 'games/scrap-factory/progression-ui.js'), 'utf8');
  const automationUi = fs.readFileSync(path.join(root, 'games/scrap-factory/automation-ui.js'), 'utf8');
  const worldRuntime = fs.readFileSync(path.join(root, 'games/scrap-factory/world-runtime.js'), 'utf8');
  assert.ok(progressionEntrypoint.includes('progression-phase6c.js'));
  assert.ok(progressionUi.includes('progression-ui-v4.js'));
  for (const marker of ['Advanced Drone', 'Production Recipe Routing', 'Final Automation Contract', 'analyzeFinalAutomation']) {
    assert.ok(automationUi.includes(marker), `Automation UI missing ${marker}`);
  }
  for (const marker of ['advanced_drone_port', 'experimental_power_system', 'fabricator_core', 'assembler_circuit']) {
    assert.ok(worldRuntime.includes(marker), `World runtime missing ${marker}`);
  }
}

console.log('Phase 6-C final automation main-bus tests passed.');
