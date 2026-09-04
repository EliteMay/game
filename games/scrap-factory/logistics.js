import { GRID_SIZE, positionKey } from './config.js';

const CARDINAL = [
  { dx: 1, dz: 0, name: '東', symbol: '→' },
  { dx: 0, dz: -1, name: '北', symbol: '↑' },
  { dx: -1, dz: 0, name: '西', symbol: '←' },
  { dx: 0, dz: 1, name: '南', symbol: '↓' },
];

export function rotationIndex(rotation = 0) {
  const quarter = Math.round(Number(rotation || 0) / (Math.PI / 2));
  return ((quarter % 4) + 4) % 4;
}

export function rotationFromIndex(index = 0) {
  const normalized = ((Math.round(index) % 4) + 4) % 4;
  return normalized * (Math.PI / 2);
}

export function directionFromRotation(rotation = 0) {
  return CARDINAL[rotationIndex(rotation)];
}

export function rotateQuarter(rotation = 0) {
  return rotationFromIndex(rotationIndex(rotation) + 1);
}

export function reverseRotation(rotation = 0) {
  return rotationFromIndex(rotationIndex(rotation) + 2);
}

export function conveyorOutputKey(conveyor) {
  const { dx, dz } = directionFromRotation(conveyor?.rotation);
  const [gx, gz] = positionKey(conveyor?.x || 0, conveyor?.z || 0).split(',').map(Number);
  return `${gx + dx},${gz + dz}`;
}

export function conveyorInputKey(conveyor) {
  const { dx, dz } = directionFromRotation(conveyor?.rotation);
  const [gx, gz] = positionKey(conveyor?.x || 0, conveyor?.z || 0).split(',').map(Number);
  return `${gx - dx},${gz - dz}`;
}

export function adjacentKeys(building) {
  const [gx, gz] = positionKey(building?.x || 0, building?.z || 0).split(',').map(Number);
  return [
    `${gx + 1},${gz}`,
    `${gx - 1},${gz}`,
    `${gx},${gz + 1}`,
    `${gx},${gz - 1}`,
  ];
}

function keyToWorld(key) {
  const [gx, gz] = key.split(',').map(Number);
  return { x: gx * GRID_SIZE, z: gz * GRID_SIZE };
}

export function findDirectionalRoute(buildings, source, itemId, acceptsItem, specificTargetId = null) {
  if (!source || !Array.isArray(buildings)) return null;
  const byCell = new Map();
  for (const building of buildings) byCell.set(positionKey(building.x, building.z), building);

  const sourceKey = positionKey(source.x, source.z);
  const queue = [];
  const visited = new Set();
  const parent = new Map();

  for (const neighborKey of adjacentKeys(source)) {
    const entry = byCell.get(neighborKey);
    if (entry?.type !== 'conveyor') continue;
    if (conveyorInputKey(entry) !== sourceKey) continue;
    queue.push(neighborKey);
    visited.add(neighborKey);
    parent.set(neighborKey, null);
  }

  while (queue.length) {
    const cell = queue.shift();
    const conveyor = byCell.get(cell);
    if (!conveyor || conveyor.type !== 'conveyor') continue;
    const nextKey = conveyorOutputKey(conveyor);
    const next = byCell.get(nextKey);
    if (!next || next.id === source.id) continue;

    if (next.type !== 'conveyor') {
      const matchesSpecific = !specificTargetId || next.id === specificTargetId;
      const accepts = specificTargetId ? matchesSpecific : Boolean(acceptsItem?.(next, itemId));
      if (matchesSpecific && accepts) {
        const conveyorPath = [];
        let cursor = cell;
        while (cursor) {
          conveyorPath.push(cursor);
          cursor = parent.get(cursor) || null;
        }
        conveyorPath.reverse();
        return {
          target: next,
          path: [
            { x: source.x, z: source.z },
            ...conveyorPath.map(keyToWorld),
            { x: next.x, z: next.z },
          ],
        };
      }
      continue;
    }

    if (!visited.has(nextKey)) {
      visited.add(nextKey);
      parent.set(nextKey, cell);
      queue.push(nextKey);
    }
  }
  return null;
}
