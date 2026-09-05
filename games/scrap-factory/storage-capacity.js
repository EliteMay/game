import { BUILDINGS } from './config.js';

export function storageCapacity(building) {
  return Math.max(0, Math.floor(Number(BUILDINGS[building?.type]?.storageCapacity || 0)));
}

export function isStorageBuilding(building) {
  return storageCapacity(building) > 0;
}

export function storageAmount(building) {
  if (!building) return 0;
  return Object.values(building.output || {}).reduce((sum, value) => sum + Math.max(0, Math.floor(Number(value || 0))), 0);
}

export function storageRemaining(building) {
  const capacity = storageCapacity(building);
  if (capacity <= 0) return Infinity;
  return Math.max(0, capacity - storageAmount(building));
}

export function storageFillRatio(building) {
  const capacity = storageCapacity(building);
  if (capacity <= 0) return 0;
  return Math.min(1, storageAmount(building) / capacity);
}

export function storageCanReceive(building, amount = 1) {
  if (!isStorageBuilding(building)) return true;
  return storageRemaining(building) >= Math.max(1, Math.floor(Number(amount || 1)));
}

export function storageTransferAmount(building, requested) {
  const amount = Math.max(0, Math.floor(Number(requested || 0)));
  if (!isStorageBuilding(building)) return amount;
  return Math.min(amount, storageRemaining(building));
}
