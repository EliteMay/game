import { RECIPES } from './config.js';

export const DRONE_DEFAULT_RESOURCE_POINT_ID = 'military-alloy-cache';
export const DRONE_PORT_TYPES = new Set(['drone_port', 'drone_port_copper', 'drone_port_electronics']);

export const DRONE_RESOURCE_POINTS = {
  'residential-copper-network': {
    id: 'residential-copper-network',
    areaId: 'residential',
    name: '住宅街 銅配線網',
    itemId: 'copper_wire',
    recipeId: 'drone_residential_copper',
    buildingType: 'drone_port_copper',
    seconds: 8,
    capacityPerMinute: 7.5,
    distanceMeters: 620,
    danger: 1,
    droneAllowed: true,
  },
  'industrial-electronics-cache': {
    id: 'industrial-electronics-cache',
    areaId: 'industrial',
    name: '廃工場 電子部品庫',
    itemId: 'e_waste',
    recipeId: 'drone_industrial_electronics',
    buildingType: 'drone_port_electronics',
    seconds: 10,
    capacityPerMinute: 6,
    distanceMeters: 890,
    danger: 2,
    droneAllowed: true,
  },
  'military-alloy-cache': {
    id: 'military-alloy-cache',
    areaId: 'military',
    name: '軍事施設 合金備蓄庫',
    itemId: 'rare_alloy',
    recipeId: 'drone_military_alloy',
    buildingType: 'drone_port',
    seconds: 12,
    capacityPerMinute: 5,
    distanceMeters: 1180,
    danger: 3,
    droneAllowed: true,
  },
};

const POINT_BY_BUILDING_TYPE = Object.fromEntries(
  Object.values(DRONE_RESOURCE_POINTS).map((point) => [point.buildingType, point.id]),
);

function areaResourcePoints(game, areaId) {
  const points = game?.exploration?.areas?.[areaId]?.resourcePoints;
  return Array.isArray(points) ? points.map(String) : [];
}

export function isDronePortBuilding(building) {
  return DRONE_PORT_TYPES.has(building?.type);
}

export function isDroneResourcePointSecured(game, resourcePointId) {
  const definition = DRONE_RESOURCE_POINTS[resourcePointId];
  if (!definition?.droneAllowed) return false;
  return areaResourcePoints(game, definition.areaId).includes(definition.id);
}

export function securedDroneResourcePoints(game) {
  return Object.values(DRONE_RESOURCE_POINTS)
    .filter((definition) => isDroneResourcePointSecured(game, definition.id))
    .sort((a, b) => a.danger - b.danger || a.distanceMeters - b.distanceMeters || a.id.localeCompare(b.id));
}

export function defaultDroneResourcePointId(game) {
  if (isDroneResourcePointSecured(game, DRONE_DEFAULT_RESOURCE_POINT_ID)) return DRONE_DEFAULT_RESOURCE_POINT_ID;
  return securedDroneResourcePoints(game)[0]?.id || null;
}

export function droneResourcePointForPort(game, building) {
  if (!isDronePortBuilding(building)) return null;
  const explicit = typeof building.resourcePointId === 'string' ? building.resourcePointId : null;
  if (explicit && isDroneResourcePointSecured(game, explicit)) return DRONE_RESOURCE_POINTS[explicit] || null;
  const typePointId = POINT_BY_BUILDING_TYPE[building.type];
  if (typePointId && isDroneResourcePointSecured(game, typePointId)) return DRONE_RESOURCE_POINTS[typePointId] || null;
  const fallback = defaultDroneResourcePointId(game);
  return fallback ? DRONE_RESOURCE_POINTS[fallback] || null : null;
}

export function droneRecipeForPort(game, building) {
  const point = droneResourcePointForPort(game, building);
  return point ? RECIPES[point.recipeId] || null : null;
}

export function droneBuildingTypeForPoint(resourcePointId) {
  return DRONE_RESOURCE_POINTS[resourcePointId]?.buildingType || 'drone_port';
}

export function assignDroneResourcePoint(game, building, resourcePointId) {
  if (!isDronePortBuilding(building)) return { changed: false, reason: 'not-drone-port', point: null };
  const point = DRONE_RESOURCE_POINTS[resourcePointId];
  if (!point) return { changed: false, reason: 'unknown-resource-point', point: null };
  if (!isDroneResourcePointSecured(game, point.id)) return { changed: false, reason: 'not-secured', point };
  const current = droneResourcePointForPort(game, building);
  if (current?.id === point.id && building.resourcePointId === point.id && building.type === point.buildingType) {
    return { changed: false, reason: 'same', point };
  }
  building.resourcePointId = point.id;
  building.type = point.buildingType;
  building.progress = 0;
  return { changed: true, reason: null, point };
}

export function dronePortAssignments(game) {
  return (game?.buildings || [])
    .filter(isDronePortBuilding)
    .map((building) => ({ building, point: droneResourcePointForPort(game, building) }));
}
