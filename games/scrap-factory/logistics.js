import { GRID_SIZE, ITEMS, positionKey } from './config.js';

const CARDINAL = [
  { dx: 1, dz: 0, name: '東', symbol: '→' },
  { dx: 0, dz: -1, name: '北', symbol: '↑' },
  { dx: -1, dz: 0, name: '西', symbol: '←' },
  { dx: 0, dz: 1, name: '南', symbol: '↓' },
];

const LOGISTICS_THROUGHPUT = {
  conveyor: 1.5,
  conveyor_mk2: 3,
  conveyor_mk3: 6,
  splitter: 3,
  merger: 3,
  smart_sorter: 3,
  priority_splitter: 6,
  overflow_splitter: 6,
};

export const SMART_SORTER_LANES = {
  advanced: 'forward',
  processed: 'left',
  product: 'left',
  raw: 'right',
};

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

export function isLogisticsNode(type) {
  return Object.prototype.hasOwnProperty.call(LOGISTICS_THROUGHPUT, type);
}

export function logisticsThroughput(type) {
  return Number(LOGISTICS_THROUGHPUT[type] || 0);
}

export function smartSorterLaneForItem(itemId) {
  const category = ITEMS[itemId]?.category;
  return SMART_SORTER_LANES[category] || 'right';
}

function cellForDirection(building, directionIndex) {
  const [gx, gz] = positionKey(building?.x || 0, building?.z || 0).split(',').map(Number);
  const { dx, dz } = CARDINAL[((directionIndex % 4) + 4) % 4];
  return `${gx + dx},${gz + dz}`;
}

function inputDirectionIndexes(building) {
  const facing = rotationIndex(building?.rotation);
  if (building?.type === 'merger') return [facing + 2, facing + 1, facing + 3];
  if (isLogisticsNode(building?.type)) return [facing + 2];
  return [];
}

function outputPorts(building, itemId = null) {
  const facing = rotationIndex(building?.rotation);
  if (building?.type === 'splitter') {
    return [
      { index: facing, priority: 0 },
      { index: facing + 1, priority: 0 },
      { index: facing + 3, priority: 0 },
    ];
  }
  if (building?.type === 'priority_splitter') {
    return [
      { index: facing, priority: 0 },
      { index: facing + 1, priority: 1 },
      { index: facing + 3, priority: 1 },
    ];
  }
  if (building?.type === 'overflow_splitter') {
    return [
      { index: facing, priority: 0 },
      { index: facing + 3, priority: 2 },
    ];
  }
  if (building?.type === 'smart_sorter') {
    if (!itemId) {
      return [
        { index: facing, priority: 0 },
        { index: facing + 1, priority: 0 },
        { index: facing + 3, priority: 0 },
      ];
    }
    const lane = smartSorterLaneForItem(itemId);
    if (lane === 'forward') return [{ index: facing, priority: 0 }];
    if (lane === 'left') return [{ index: facing + 1, priority: 0 }];
    return [{ index: facing + 3, priority: 0 }];
  }
  if (isLogisticsNode(building?.type)) return [{ index: facing, priority: 0 }];
  return [];
}

function outputDirectionIndexes(building, itemId = null) {
  return outputPorts(building, itemId).map((port) => port.index);
}

export function logisticsInputKeys(building) {
  return inputDirectionIndexes(building).map((index) => cellForDirection(building, index));
}

export function logisticsOutputKeys(building, itemId = null) {
  return outputDirectionIndexes(building, itemId).map((index) => cellForDirection(building, index));
}

export function logisticsAcceptsFrom(building, fromKey, { sourceConnection = false } = {}) {
  if (!building || !isLogisticsNode(building.type)) return false;
  if (['conveyor', 'conveyor_mk2', 'conveyor_mk3'].includes(building.type) && !sourceConnection) {
    return adjacentKeys(building).includes(fromKey);
  }
  return logisticsInputKeys(building).includes(fromKey);
}

export function conveyorOutputKey(conveyor) {
  return logisticsOutputKeys(conveyor)[0] || positionKey(conveyor?.x || 0, conveyor?.z || 0);
}

export function conveyorInputKey(conveyor) {
  return logisticsInputKeys(conveyor)[0] || positionKey(conveyor?.x || 0, conveyor?.z || 0);
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

function routeThroughput(nodes) {
  const values = nodes.map((node) => logisticsThroughput(node?.type)).filter((value) => value > 0);
  return values.length ? Math.min(...values) : logisticsThroughput('conveyor');
}

export function findDirectionalRoutes(buildings, source, itemId, acceptsItem, specificTargetId = null) {
  if (!source || !Array.isArray(buildings)) return [];
  const byCell = new Map();
  for (const building of buildings) byCell.set(positionKey(building.x, building.z), building);

  const sourceKey = positionKey(source.x, source.z);
  const queue = [];
  const routes = [];
  const routeIds = new Set();

  for (const neighborKey of adjacentKeys(source)) {
    const entry = byCell.get(neighborKey);
    if (!entry || !isLogisticsNode(entry.type)) continue;
    if (!logisticsAcceptsFrom(entry, sourceKey, { sourceConnection: true })) continue;
    queue.push({ key: neighborKey, pathKeys: [neighborKey], visited: new Set([sourceKey, neighborKey]), priority: 0 });
  }

  const maxDepth = Math.max(4, buildings.length + 2);
  while (queue.length) {
    const state = queue.shift();
    if (state.pathKeys.length > maxDepth) continue;
    const node = byCell.get(state.key);
    if (!node || !isLogisticsNode(node.type)) continue;

    for (const port of outputPorts(node, itemId)) {
      const nextKey = cellForDirection(node, port.index);
      if (state.visited.has(nextKey)) continue;
      const next = byCell.get(nextKey);
      if (!next || next.id === source.id) continue;
      const priority = state.priority + Number(port.priority || 0);

      if (isLogisticsNode(next.type)) {
        if (!logisticsAcceptsFrom(next, state.key)) continue;
        const visited = new Set(state.visited);
        visited.add(nextKey);
        queue.push({ key: nextKey, pathKeys: [...state.pathKeys, nextKey], visited, priority });
        continue;
      }

      const matchesSpecific = !specificTargetId || next.id === specificTargetId;
      const accepts = specificTargetId ? matchesSpecific : Boolean(acceptsItem?.(next, itemId));
      if (!matchesSpecific || !accepts) continue;

      const routeId = `${next.id}|${state.pathKeys.join('>')}`;
      if (routeIds.has(routeId)) continue;
      routeIds.add(routeId);
      const nodes = state.pathKeys.map((key) => byCell.get(key)).filter(Boolean);
      routes.push({
        target: next,
        nodeIds: nodes.map((entry) => entry.id),
        nodeTypes: nodes.map((entry) => entry.type),
        throughput: routeThroughput(nodes),
        priority,
        path: [
          { x: source.x, z: source.z },
          ...state.pathKeys.map(keyToWorld),
          { x: next.x, z: next.z },
        ],
      });
    }
  }

  return routes.sort((a, b) => (
    Number(a.priority || 0) - Number(b.priority || 0)
    || String(a.target?.id || '').localeCompare(String(b.target?.id || ''))
    || a.nodeIds.join('>').localeCompare(b.nodeIds.join('>'))
  ));
}

export function findDirectionalRoute(buildings, source, itemId, acceptsItem, specificTargetId = null) {
  return findDirectionalRoutes(buildings, source, itemId, acceptsItem, specificTargetId)[0] || null;
}

export function selectDirectionalRoute(routes, cursor = 0) {
  if (!Array.isArray(routes) || !routes.length) return { route: null, index: -1, nextCursor: 0 };
  const bestPriority = Math.min(...routes.map((route) => Number(route?.priority || 0)));
  const eligible = routes.filter((route) => Number(route?.priority || 0) === bestPriority);
  const normalized = Math.max(0, Math.floor(Number(cursor || 0)));
  const index = normalized % eligible.length;
  return {
    route: eligible[index],
    index,
    nextCursor: (index + 1) % eligible.length,
  };
}