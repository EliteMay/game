import assert from 'node:assert/strict';
import {
  isStorageBuilding,
  storageAmount,
  storageCanReceive,
  storageCapacity,
  storageFillRatio,
  storageRemaining,
  storageTransferAmount,
} from '../games/scrap-factory/storage-capacity.js';

function storage(type = 'storage', output = {}) {
  return { id: `${type}-a`, type, input: {}, output };
}

{
  const small = storage('storage', { metal_scrap: 80, copper_wire: 20 });
  assert.equal(isStorageBuilding(small), true);
  assert.equal(storageCapacity(small), 120);
  assert.equal(storageAmount(small), 100);
  assert.equal(storageRemaining(small), 20);
  assert.equal(storageFillRatio(small), 100 / 120);
  assert.equal(storageCanReceive(small, 20), true);
  assert.equal(storageCanReceive(small, 21), false);
  assert.equal(storageTransferAmount(small, 50), 20, 'manual/automatic transfer must clamp to remaining capacity');
}

{
  const full = storage('storage', { metal_scrap: 120 });
  const before = structuredClone(full.output);
  assert.equal(storageRemaining(full), 0);
  assert.equal(storageCanReceive(full), false, 'full storage must apply back pressure');
  assert.equal(storageTransferAmount(full, 5), 0);
  assert.deepEqual(full.output, before, 'capacity helpers must not mutate or discard stored items');
}

{
  const legacyOverfill = storage('storage', { metal_scrap: 140 });
  assert.equal(storageAmount(legacyOverfill), 140, 'legacy over-capacity contents must be preserved');
  assert.equal(storageRemaining(legacyOverfill), 0);
  assert.equal(storageTransferAmount(legacyOverfill, 1), 0, 'overfilled legacy storage must reject new items without deleting old contents');
}

{
  const industrial = storage('industrial_storage', { iron_ingot: 200 });
  assert.equal(storageCapacity(industrial), 600);
  assert.equal(storageRemaining(industrial), 400);
}

{
  const machine = { type: 'crusher', output: { crushed_metal: 99 } };
  assert.equal(isStorageBuilding(machine), false);
  assert.equal(storageCapacity(machine), 0);
  assert.equal(storageTransferAmount(machine, 4), 4, 'non-storage targets must not be artificially capped by storage helpers');
}

console.log('Storage capacity tests passed.');
