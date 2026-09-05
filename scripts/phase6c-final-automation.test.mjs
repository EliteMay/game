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

assert.equal(PLAYABLE_MAX_RANK, 7, 'Phase 6-C must keep Rank 7 as the Rank-Up cap');
assert.deepEqual(BUILD_MENU_ORDER.slice(0, 5), ['crusher', 'smelter', 'conveyor', 'storage', 'seller'], 'Quick Build 1-5 must remain stable');
assert.ok(ITEMS.autonomous_industrial_core, 'Autonomous Industrial Core must be configured');
assert.equal(Object.keys(RECIPES.fabricator_autonomous_core.input).length <= 4, true, 'final product recipe must keep the <=4 input-type requirement');
assert.deepEqual(RECIPES.fabricator_autonomous_core.output, { autonomous_industrial_core: 1 });
assert.equal(BUILDINGS.experimental_power_system.powerGeneration, 480);
assert.equal(BUILDINGS.experimental_power_system.powerFuelItem, 'rare_alloy');
assert.equal(BUILDINGS.advanced_drone_port.powerUse, 95);

{
  const game = gameAt(7);
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
  const game = gameAt(7);
  game.progression.completedResearch.push('experimental_technology');
  assert.equal(game.progression.unlocks.includes('building:advanced_drone_port'), false, 'legacy completed research may predate Phase 6-C unlock markers');
  assert.equal(buildingUnlockState(game, 'advanced_drone_port').unlocked, true, 'completed Experimental Technology remains the compatibility source of truth');
  assert.equal(buildingUnlockState(game, 'experimental_power_system').unlocked, true);
}

{
  const game = gameAt(7);
  completeExperimentalTechnology(game);
  const advancedPoints = securedDroneResourcePoints(game, DRONE_TIER_ADVANCED);
  assert.deepEqual(
    advancedPoints.map((point) => point.itemId).sort(),
    ['copper_wire', 'e_waste', 'metal_scrap', 'plastic', 'rare_alloy'].sort(),
    'cleared areas must expose the five Advanced Drone feeds required by the final line',
  );

  const utility = { id: 'utility', type: 'drone_port', resourcePointId: 'military-alloy-cache', progress: 4, output: { rare_alloy: 2 } };
  const blocked = assignDroneResourcePoint(game, utility, 'residential-polymer-stockpile');
  assert.equal(blocked.changed, false);
  assert.equal(blocked.reason, 'tier-unavailable', 'Utility Drone must not gain Advanced-only routes');
  assert.deepEqual(utility.output, { rare_alloy: 2 });

  const advanced = { id: 'advanced', type: 'advanced_drone_port', resourcePointId: 'military-alloy-cache', progress: 3, output: { rare_alloy: 1 } };
  const assigned = assignDroneResourcePoint(game, advanced, 'residential-polymer-stockpile');
  assert.equal(assigned.changed, true);
  assert.equal(advanced.type, 'advanced_drone_port_plastic');
  assert.equal(advanced.progress, 0);
  assert.deepEqual(advanced.output, { rare_alloy: 1 }, 'Advanced Drone route changes must preserve output buffers');
}

{
  const game = gameAt(7);
  game.progression.completedResearch.push('advanced_assembly', 'experimental_fabrication', 'experimental_technology');
  const assembler = { id: 'assembler-test', type: 'assembler', input: { motor: 1 }, output: { control_unit: 2 }, progress: 3 };
  const blocked = assignProductionRecipe(game, assembler, 'assembler_iron_plate');
  assert.equal(blocked.changed, false);
  assert.equal(blocked.reason, 'buffer-conflict');
  assert.equal(assembler.type, 'assembler');
  assert.deepEqual(assembler.input, { motor: 1 });
  assert.deepEqual(assembler.output, { control_unit: 2 });

  assembler.input = {};
  const changed = assignProductionRecipe(game, assembler, 'assembler_iron_plate');
  assert.equal(changed.changed, true);
  assert.equal(assembler.type, 'assembler_plate');
  assert.equal(assembler.progress, 0);
  assert.deepEqual(assembler.output, { control_unit: 2 }, 'Recipe switching must not delete output buffers');

  const fabricator = { id: 'fabricator-test', type: 'fabricator', input: {}, output: { ai_control_module: 1 }, progress: 8 };
  assert.equal(assignProductionRecipe(game, fabricator, 'fabricator_autonomous_core').changed, true);
  assert.equal(fabricator.type, 'fabricator_core');
  assert.deepEqual(fabricator.output, { ai_control_module: 1 });
}

{
  const save = makeDefaultGameSave();
  assert.equal(save.schemaVersion, 1);
  assert.equal(save.inventory.autonomous_industrial_core, 0, 'schema-v1 normalization must add the final product inventory key without a schema bump');
  assert.equal(save.exploration.version, 1);
  assert.equal(save.progression.version, 1);
}

function buildFullAutomationFixture() {
  const game = gameAt(7);
  game.progression.completedResearch.push('advanced_assembly', 'experimental_fabrication', 'experimental_technology');
  game.progression.unlocks.push(
    'tier:experimental',
    'production:autonomous_core',
    'production:automated_components',
    'building:advanced_drone_port',
    'building:experimental_power_system',
  );

  const occupied = new Map();
  const targetNetworks = new Map();
  const sourceTrunks = new Map();
  let conveyorId = 0;

  function key(gx, gz) { return `${gx},${gz}`; }
  function world(g) { return g * GRID; }
  function add(id, type, gx, gz, extra = {}) {
    assert.equal(occupied.has(key(gx, gz)), false, `fixture cell collision at ${gx},${gz}`);
    const building = {
      id,
      type,
      x: world(gx),
      z: world(gz),
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
    occupied.set(key(gx, gz), building);
    game.buildings.push(building);
    return building;
  }

  const scrap = add('src-scrap', 'advanced_drone_port_scrap', -6, -4, { resourcePointId: 'industrial-scrap-reserve' });
  const copper = add('src-copper', 'advanced_drone_port_copper', -6, -2, { resourcePointId: 'residential-copper-network' });
  const plastic = add('src-plastic', 'advanced_drone_port_plastic', -6, 0, { resourcePointId: 'residential-polymer-stockpile' });
  const electronics = add('src-electronics', 'advanced_drone_port_electronics', -6, 2, { resourcePointId: 'industrial-electronics-cache' });
  const alloy = add('src-alloy', 'advanced_drone_port', -6, 4, { resourcePointId: 'military-alloy-cache' });

  const crusher = add('crusher-final', 'crusher', -3, -4);
  const smelter = add('smelter-final', 'smelter', 0, -4);
  const plate = add('assembler-plate-final', 'assembler_plate', 3, -5);
  const motor = add('assembler-motor-final', 'assembler_motor', 3, -3);
  const circuit = add('assembler-circuit-final', 'assembler_circuit', 0, 0);
  const control = add('assembler-control-final', 'assembler', 3, 0);
  const experimental = add('fabricator-set-final', 'fabricator', 6, 0);
  const core = add('fabricator-core-final', 'fabricator_core', 6, 3);
  const storage = add('storage-final', 'logistics_warehouse', 6, 6);
  const powerA = add('experimental-power-a', 'experimental_power_system', -3, 4, { powerFuelSeconds: 20 });
  add('experimental-power-b', 'experimental_power_system', -1, 6, { powerFuelSeconds: 20 });

  const dirs = [
    { dx: 1, dz: 0, rotation: 0 },
    { dx: 0, dz: -1, rotation: Math.PI / 2 },
    { dx: -1, dz: 0, rotation: Math.PI },
    { dx: 0, dz: 1, rotation: Math.PI * 1.5 },
  ];

  function gridOf(building) { return { gx: Math.round(building.x / GRID), gz: Math.round(building.z / GRID) }; }
  function adjacentCellsAt(cell) { return dirs.map((dir) => ({ gx: cell.gx + dir.dx, gz: cell.gz + dir.dz, dir })); }
  function adjacentCells(building) { return adjacentCellsAt(gridOf(building)); }
  function rotationIndex(rotation) {
    const quarter = Math.round(Number(rotation || 0) / (Math.PI / 2));
    return ((quarter % 4) + 4) % 4;
  }
  function stepRotation(a, b) {
    const dx = b.gx - a.gx;
    const dz = b.gz - a.gz;
    const dir = dirs.find((entry) => entry.dx === dx && entry.dz === dz);
    assert.ok(dir, `invalid route step ${a.gx},${a.gz} -> ${b.gx},${b.gz}`);
    return dir.rotation;
  }

  function targetJoins(sourceGrid, target) {
    const targetGrid = gridOf(target);
    const existing = targetNetworks.get(target.id) || new Set();
    const joins = new Map();
    if (existing.size) {
      for (const joinKey of existing) {
        const joinNode = occupied.get(joinKey);
        if (!['conveyor', 'conveyor_mk2', 'conveyor_mk3'].includes(joinNode?.type)) continue;
        const [jx, jz] = joinKey.split(',').map(Number);
        for (const cell of adjacentCellsAt({ gx: jx, gz: jz })) {
          const cellKey = key(cell.gx, cell.gz);
          if (occupied.has(cellKey) || cellKey === key(sourceGrid.gx, sourceGrid.gz) || cellKey === key(targetGrid.gx, targetGrid.gz)) continue;
          if (!joins.has(cellKey)) joins.set(cellKey, { gx: jx, gz: jz });
        }
      }
    } else {
      for (const cell of adjacentCells(target)) {
        const cellKey = key(cell.gx, cell.gz);
        if (!occupied.has(cellKey)) joins.set(cellKey, targetGrid);
      }
    }
    return { joins, existing, targetGrid };
  }

  function bfsFrom(start, joins, sourceGrid, targetGrid) {
    const startKey = key(start.gx, start.gz);
    if (occupied.has(startKey) || startKey === key(targetGrid.gx, targetGrid.gz)) return null;
    const queue = [[start]];
    const seen = new Set([startKey, key(sourceGrid.gx, sourceGrid.gz)]);
    while (queue.length) {
      const pathCells = queue.shift();
      const current = pathCells[pathCells.length - 1];
      const currentKey = key(current.gx, current.gz);
      if (joins.has(currentKey)) return { path: pathCells, join: joins.get(currentKey) };
      for (const nextDir of dirs) {
        const next = { gx: current.gx + nextDir.dx, gz: current.gz + nextDir.dz };
        if (Math.abs(next.gx) > 30 || Math.abs(next.gz) > 30) continue;
        const nextKey = key(next.gx, next.gz);
        if (seen.has(nextKey) || occupied.has(nextKey) || nextKey === key(targetGrid.gx, targetGrid.gz)) continue;
        seen.add(nextKey);
        queue.push([...pathCells, next]);
      }
    }
    return null;
  }

  function layPath(pathCells, join, label) {
    pathCells.forEach((cell, index) => {
      const next = pathCells[index + 1] || join;
      add(`belt-${++conveyorId}-${label}`, 'conveyor_mk3', cell.gx, cell.gz, { rotation: stepRotation(cell, next) });
    });
  }

  function registerTargetNetwork(target, pathCells, existing) {
    const network = targetNetworks.get(target.id) || new Set();
    pathCells.forEach((cell) => network.add(key(cell.gx, cell.gz)));
    for (const existingKey of existing) network.add(existingKey);
    targetNetworks.set(target.id, network);
  }

  function connect(source, target, label) {
    const sourceGrid = gridOf(source);
    const { joins, existing, targetGrid } = targetJoins(sourceGrid, target);
    assert.ok(joins.size, `no free target/join port for ${label}`);

    const trunk = sourceTrunks.get(source.id);
    if (trunk) {
      assert.equal(trunk.branches, 1, `${source.id} fixture supports one Splitter branch`);
      const splitter = occupied.get(trunk.firstKey);
      assert.ok(splitter, `missing source trunk for ${source.id}`);
      splitter.type = 'splitter';
      const facing = rotationIndex(splitter.rotation);
      const splitterGrid = gridOf(splitter);
      let solved = null;
      for (const branchIndex of [(facing + 1) % 4, (facing + 3) % 4]) {
        const dir = dirs[branchIndex];
        const start = { gx: splitterGrid.gx + dir.dx, gz: splitterGrid.gz + dir.dz };
        solved = bfsFrom(start, joins, sourceGrid, targetGrid);
        if (solved) break;
      }
      assert.ok(solved, `could not branch ${label}`);
      layPath(solved.path, solved.join, label);
      registerTargetNetwork(target, solved.path, existing);
      trunk.branches += 1;
      return;
    }

    let solved = null;
    let first = null;
    for (const dir of dirs) {
      const firstCell = { gx: sourceGrid.gx + dir.dx, gz: sourceGrid.gz + dir.dz };
      const secondCell = { gx: sourceGrid.gx + dir.dx * 2, gz: sourceGrid.gz + dir.dz * 2 };
      if (occupied.has(key(firstCell.gx, firstCell.gz)) || occupied.has(key(secondCell.gx, secondCell.gz))) continue;
      if (key(firstCell.gx, firstCell.gz) === key(targetGrid.gx, targetGrid.gz) || key(secondCell.gx, secondCell.gz) === key(targetGrid.gx, targetGrid.gz)) continue;
      const tail = bfsFrom(secondCell, joins, sourceGrid, targetGrid);
      if (!tail) continue;
      first = firstCell;
      solved = { path: [firstCell, ...tail.path], join: tail.join };
      break;
    }
    assert.ok(solved && first, `could not route ${label}`);
    layPath(solved.path, solved.join, label);
    registerTargetNetwork(target, solved.path, existing);
    sourceTrunks.set(source.id, { firstKey: key(first.gx, first.gz), branches: 1 });
  }

  connect(scrap, crusher, 'scrap-crusher');
  connect(crusher, smelter, 'crusher-smelter');
  connect(smelter, plate, 'smelter-plate');
  connect(smelter, motor, 'smelter-motor');
  connect(copper, motor, 'copper-motor');
  connect(copper, circuit, 'copper-circuit');
  connect(electronics, circuit, 'electronics-circuit');
  connect(plastic, circuit, 'plastic-circuit');
  connect(motor, control, 'motor-control');
  connect(circuit, control, 'circuit-control');
  connect(plastic, control, 'plastic-control');
  connect(control, experimental, 'control-experimental');
  connect(alloy, experimental, 'alloy-experimental');
  connect(circuit, experimental, 'circuit-experimental');
  connect(plate, experimental, 'plate-experimental');
  connect(experimental, core, 'experimental-core');
  connect(control, core, 'control-core');
  connect(core, storage, 'core-storage');
  connect(alloy, powerA, 'alloy-power');

  function addCoveragePole(id, preferred, consumers) {
    for (let radius = 0; radius <= 4; radius += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        for (let dz = -radius; dz <= radius; dz += 1) {
          const gx = preferred.gx + dx;
          const gz = preferred.gz + dz;
          if (occupied.has(key(gx, gz))) continue;
          if (Math.hypot(gx * GRID, gz * GRID) > 17.5) continue;
          const covers = consumers.every((building) => {
            const b = gridOf(building);
            return Math.hypot((b.gx - gx) * GRID, (b.gz - gz) * GRID) <= 10;
          });
          if (covers) return add(id, 'power_pole', gx, gz);
        }
      }
    }
    assert.fail(`no free coverage pole for ${id}`);
  }

  addCoveragePole('pole-scrap', { gx: -5, gz: -3 }, [scrap]);
  addCoveragePole('pole-alloy', { gx: -5, gz: 3 }, [alloy]);
  return { game, core };
}

{
  const { game, core } = buildFullAutomationFixture();
  const before = analyzeFinalAutomation(game);
  assert.equal(before.topologyReady, true, `synthetic final line should be connected: ${before.missing.map((entry) => entry.id).join(', ')}`);
  assert.equal(before.stages.experimentalPowerRouted, true);
  assert.equal(before.stages.experimentalPowerActive, true);
  assert.equal(before.stages.poweredLine, true, 'two active Experimental Power Systems must cover the final line demand');
  assert.equal(before.stages.productProven, false, 'topology alone must not prove final product production');
  assert.equal(before.qualifies, false);

  core.output.autonomous_industrial_core = 1;
  game.discoveredItems.push('autonomous_industrial_core');
  const after = analyzeFinalAutomation(game);
  assert.equal(after.stages.productProven, true);
  assert.equal(after.qualifies, true, `complete automated line should qualify: ${after.missing.map((entry) => entry.id).join(', ')}`);
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
    assert.ok(worldRuntime.includes(marker), `World runtime missing Phase 6-C visual marker ${marker}`);
  }
}

console.log('Phase 6-C final automation tests passed.');
