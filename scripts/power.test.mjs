import assert from 'node:assert/strict';
import {
  computePowerSnapshot,
  generatorActive,
  isBuildingPowered,
  tickGeneratorFuel,
  tickPowerStorage,
} from '../games/scrap-factory/power.js';

function building(id, type, x = 0, z = 0, extra = {}) {
  return { id, type, x, z, rotation: 0, input: {}, output: {}, progress: 0, permanent: false, ...extra };
}

function gameAt(rank, buildings) {
  return { progression: { progressionRank: rank }, buildings };
}

{
  const crusher = building('crusher-a', 'crusher', 0, 0);
  const game = gameAt(3, [crusher]);
  const snapshot = computePowerSnapshot(game);
  assert.equal(snapshot.enabled, false, 'Rank 3 and earlier must keep legacy no-power behavior');
  assert.equal(isBuildingPowered(game, crusher, snapshot), true);
}

{
  const crusher = building('crusher-a', 'crusher', 0, 0);
  const smelter = building('smelter-a', 'smelter', 2.5, 0);
  const game = gameAt(4, [crusher, smelter]);
  const snapshot = computePowerSnapshot(game);
  assert.equal(snapshot.enabled, true);
  assert.equal(snapshot.generation, 55);
  assert.equal(snapshot.demand, 48);
  assert.equal(snapshot.status, 'ok', 'Starter Grid should keep a small Rank 4 factory alive');
  assert.equal(snapshot.poweredIds.has(crusher.id), true);
  assert.equal(snapshot.poweredIds.has(smelter.id), true);
}

{
  const crusher = building('crusher-a', 'crusher', 0, 0);
  const smelterA = building('smelter-a', 'smelter', 2.5, 0);
  const smelterB = building('smelter-b', 'smelter', 5, 0);
  const generator = building('generator-a', 'generator', 7.5, 0, { input: { metal_scrap: 1 }, powerFuelSeconds: 0 });
  const game = gameAt(4, [crusher, smelterA, smelterB, generator]);

  let snapshot = computePowerSnapshot(game);
  assert.equal(snapshot.status, 'shortage');
  assert.equal(snapshot.generation, 55, 'Generator without active fuel must not generate');
  assert.equal(generatorActive(generator), false);

  tickGeneratorFuel(game.buildings, 1);
  assert.equal(generator.input.metal_scrap, 0, 'Generator should consume one scrap when starting a fuel cycle');
  assert.ok(generator.powerFuelSeconds > 22 && generator.powerFuelSeconds <= 23);
  assert.equal(generatorActive(generator), true);

  snapshot = computePowerSnapshot(game);
  assert.equal(snapshot.generation, 135);
  assert.equal(snapshot.status, 'ok', 'Adding generator supply should recover a shortage');
  assert.equal(snapshot.unpoweredIds.size, 0);
}

{
  const farCrusher = building('crusher-far', 'crusher', 30, 0, { input: { metal_scrap: 4 }, output: { crushed_metal: 2 } });
  const game = gameAt(4, [farCrusher]);
  const before = structuredClone({ input: farCrusher.input, output: farCrusher.output });
  let snapshot = computePowerSnapshot(game);
  assert.equal(snapshot.uncoveredIds.has(farCrusher.id), true, 'Far machine must be outside Starter Grid coverage');
  assert.deepEqual({ input: farCrusher.input, output: farCrusher.output }, before, 'Power calculation must never destroy buffered items');

  game.buildings.push(
    building('pole-a', 'power_pole', 15, 0),
    building('pole-b', 'power_pole', 25, 0),
  );
  snapshot = computePowerSnapshot(game);
  assert.equal(snapshot.connectedPoleIds.has('pole-a'), true);
  assert.equal(snapshot.connectedPoleIds.has('pole-b'), true);
  assert.equal(snapshot.uncoveredIds.has(farCrusher.id), false, 'Pole chain should extend coverage to the remote crusher');
  assert.equal(snapshot.poweredIds.has(farCrusher.id), true);
}

{
  const buildings = [
    building('crusher-b', 'crusher', 0, 0),
    building('crusher-a', 'crusher', 2.5, 0),
    building('smelter-a', 'smelter', 5, 0),
  ];
  const game = gameAt(4, buildings);
  const first = computePowerSnapshot(game);
  const second = computePowerSnapshot(game);
  assert.deepEqual([...first.poweredIds], [...second.poweredIds], 'Power allocation must be deterministic');
  assert.deepEqual([...first.unpoweredIds], [...second.unpoweredIds]);
}

{
  const battery = building('battery-a', 'battery', 0, 5, { powerStored: 100 });
  const game = gameAt(4, [
    building('crusher-a', 'crusher', 0, 0),
    building('smelter-a', 'smelter', 2.5, 0),
    building('smelter-b', 'smelter', 5, 0),
    battery,
  ]);
  const before = battery.powerStored;
  const preview = computePowerSnapshot(game, { delta: 1 });
  assert.equal(preview.baseGeneration, 55);
  assert.equal(preview.demand, 78);
  assert.equal(preview.batteryOutput, 23, 'Battery should cover only the current power shortfall');
  assert.equal(preview.status, 'ok');
  assert.equal(battery.powerStored, before, 'Pure snapshot calculation must not mutate stored battery energy');

  const ticked = tickPowerStorage(game, 1);
  assert.equal(ticked.batteryDischargeRate, 23);
  assert.equal(battery.powerStored, 77, 'One second at 23 Power should consume 23 stored energy');
}

{
  const battery = building('battery-charge', 'battery', 5, 0, { powerStored: 0 });
  const game = gameAt(4, [building('crusher-a', 'crusher', 0, 0), battery]);
  const snapshot = tickPowerStorage(game, 1);
  assert.equal(snapshot.baseGeneration, 55);
  assert.equal(snapshot.demand, 18);
  assert.equal(snapshot.batteryChargeRate, 37, 'Battery should absorb available surplus, up to its charge-rate cap');
  assert.equal(battery.powerStored, 37);
  assert.equal(snapshot.reserve, 0, 'Surplus assigned to charging should not still appear as free reserve');
}

{
  const battery = building('battery-near-full', 'battery', 5, 0, { powerStored: 950 });
  const game = gameAt(4, [building('crusher-a', 'crusher', 0, 0), battery]);
  const snapshot = tickPowerStorage(game, 1);
  assert.equal(snapshot.batteryChargeRate, 10, 'Charging must clamp to remaining storage capacity');
  assert.equal(battery.powerStored, 960);
}

{
  const battery = building('battery-far', 'battery', 30, 0, { powerStored: 500 });
  const game = gameAt(4, [
    building('crusher-a', 'crusher', 0, 0),
    building('smelter-a', 'smelter', 2.5, 0),
    building('smelter-b', 'smelter', 5, 0),
    battery,
  ]);
  const snapshot = tickPowerStorage(game, 1);
  assert.equal(snapshot.connectedBatteryIds.has(battery.id), false, 'Battery outside grid coverage must stay disconnected');
  assert.equal(snapshot.batteryOutput, 0);
  assert.equal(snapshot.status, 'shortage');
  assert.equal(battery.powerStored, 500, 'Disconnected battery must neither charge nor discharge');
}

{
  const battery = building('battery-low', 'battery', 5, 0, { powerStored: 10 });
  const game = gameAt(4, [
    building('crusher-a', 'crusher', 0, 0),
    building('smelter-a', 'smelter', 2.5, 0),
    building('smelter-b', 'smelter', 5, 0),
    battery,
  ]);
  const snapshot = tickPowerStorage(game, 1);
  assert.equal(snapshot.batteryDischargeRate, 10, 'A nearly empty battery cannot promise more energy than it can sustain for the frame');
  assert.equal(snapshot.generation, 65);
  assert.equal(snapshot.status, 'shortage');
  assert.equal(battery.powerStored, 0);
}

console.log('Power tests passed.');
