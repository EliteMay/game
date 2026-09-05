import { RECIPES } from './config.js';

export const DRONE_DEFAULT_RESOURCE_POINT_ID = 'military-alloy-cache';
export const DRONE_TIER_UTILITY = 'utility';
export const DRONE_TIER_ADVANCED = 'advanced';

const UTILITY_PORT_TYPES = new Set(['drone_port', 'drone_port_copper', 'drone_port_electronics']);
const ADVANCED_PORT_TYPES = new Set([
  'advanced_drone_port',
  'advanced_drone_port_copper',
  'advanced_drone_port_plastic',
  'advanced_drone_port_electronics',
  'advanced_drone_port_scrap',
]);

export const DRONE_PORT_TYPES = new Set([...UTILITY_PORT_TYPES, ...ADVANCED_PORT_TYPES]);

export const DRONE_RESOURCE_POINTS = {
  'residential-copper-network': {
    id: 'residential-copper-network',
    areaId: 'residential',
    name: '住宅街 銅配線網',
    itemId: 'copper_wire',
    distanceMeters: 620,
    danger: 1,
    droneAllowed: true,
    utility: { recipeId: 'drone_residential_copper', buildingType: 'drone_port_copper', seconds: 8, capacityPerMinute: 7.5 },
    advanced: { recipeId: 'advanced_drone_residential_copper', buildingType: 'advanced_drone_port_copper', seconds: 5, capacityPerMinute: 12 },
  },
  'residential-polymer-stockpile': {
    id: 'residential-polymer-stockpile',
    areaId: 'residential',
    name: '住宅街 樹脂回収区画',
    itemId: 'plastic',
    distanceMeters: 710,
    danger: 1,
    droneAllowed: true,
    securedByAreaCompletion: true,
    advanced: { recipeId: 'advanced_drone_residential_plastic', buildingType: 'advanced_drone_port_plastic', seconds: 6, capacityPerMinute: 10 },
  },
  'industrial-electronics-cache': {
    id: 'industrial-electronics-cache',
    areaId: 'industrial',
    name: '廃工場 電子部品庫',
    itemId: 'e_waste',
    distanceMeters: 890,
    danger: 2,
    droneAllowed: true,
    utility: { recipeId: 'drone_industrial_electronics', buildingType: 'drone_port_electronics', seconds: 10, capacityPerMinute: 6 },
    advanced: { recipeId: 'advanced_drone_industrial_electronics', buildingType: 'advanced_drone_port_electronics', seconds: 6, capacityPerMinute: 10 },
  },
  'industrial-scrap-reserve': {
    id: 'industrial-scrap-reserve',
    areaId: 'industrial',
    name: '廃工場 金属回収ヤード',
    itemId: 'metal_scrap',
    distanceMeters: 940,
    danger: 2,
    droneAllowed: true,
    securedByAreaCompletion: true,
    advanced: { recipeId: 'advanced_drone_industrial_scrap', buildingType: 'advanced_drone_port_scrap', seconds: 4, capacityPerMinute: 15 },
  },
  'military-alloy-cache': {
    id: 'military-alloy-cache',
    areaId: 'military',
    name: '軍事施設 合金備蓄庫',
    itemId: 'rare_alloy',
    distanceMeters: 1180,
    danger: 3,
    droneAllowed: true,
    utility: { recipeId: 'drone_military_alloy', buildingType: 'drone_port', seconds: 12, capacityPerMinute: 5 },
    advanced: { recipeId: 'advanced_drone_military_alloy', buildingType: 'advanced_drone_port', seconds: 8, capacityPerMinute: 7.5 },
  },
};

const POINT_BY_BUILDING_TYPE = new Map();
for (const point of Object.values(DRONE_RESOURCE_POINTS)) {
  for (const tier of [DRONE_TIER_UTILITY, DRONE_TIER_ADVANCED]) {
    const route = point[tier];
    if (route?.buildingType) POINT_BY_BUILDING_TYPE.set(route.buildingType, point.id);
  }
}

function areaResourcePoints(game, areaId) {
  const points = game?.exploration?.areas?.[areaId]?.resourcePoints;
  return Array.isArray(points) ? points.map(String) : [];
}

function areaCompleted(game, areaId) {
  return Boolean(game?.exploration?.areas?.[areaId]?.objective?.completed);
}

export function dronePortTier(building) {
  if (ADVANCED_PORT_TYPES.has(building?.type)) return DRONE_TIER_ADVANCED;
  if (UTILITY_PORT_TYPES.has(building?.type)) return DRONE_TIER_UTILITY;
  return null;
}

export function isAdvancedDronePortBuilding(building) {
  return dronePortTier(building) === DRONE_TIER_ADVANCED;
}

export function isDronePortBuilding(building) {
  return DRONE_PORT_TYPES.has(building?.type);
}

export function isDroneResourcePointSecured(game, resourcePointId) {
  const definition = DRONE_RESOURCE_POINTS[resourcePointId];
  if (!definition?.droneAllowed) return false;
  if (areaResourcePoints(game, definition.areaId).includes(definition.id)) return true;
  return Boolean(definition.securedByAreaCompletion && areaCompleted(game, definition.areaId));
}

export function securedDroneResourcePoints(game, tier = DRONE_TIER_UTILITY) {
  return Object.values(DRONE_RESOURCE_POINTS)
    .filter((definition) => isDroneResourcePointSecured(game, definition.id) && definition[tier])
    .sort((a, b) => a.danger - b.danger || a.distanceMeters - b.distanceMeters || a.id.localeCompare(b.id));
}

export function defaultDroneResourcePointId(game, tier = DRONE_TIER_UTILITY) {
  const preferred = DRONE_RESOURCE_POINTS[DRONE_DEFAULT_RESOURCE_POINT_ID];
  if (preferred?.[tier] && isDroneResourcePointSecured(game, preferred.id)) return preferred.id;
  return securedDroneResourcePoints(game, tier)[0]?.id || null;
}

export function droneResourcePointForPort(game, building) {
  const tier = dronePortTier(building);
  if (!tier) return null;
  const explicit = typeof building.resourcePointId === 'string' ? building.resourcePointId : null;
  if (explicit && DRONE_RESOURCE_POINTS[explicit]?.[tier] && isDroneResourcePointSecured(game, explicit)) {
    return DRONE_RESOURCE_POINTS[explicit];
  }
  const typePointId = POINT_BY_BUILDING_TYPE.get(building.type);
  if (typePointId && DRONE_RESOURCE_POINTS[typePointId]?.[tier] && isDroneResourcePointSecured(game, typePointId)) {
    return DRONE_RESOURCE_POINTS[typePointId];
  }
  const fallback = defaultDroneResourcePointId(game, tier);
  return fallback ? DRONE_RESOURCE_POINTS[fallback] || null : null;
}

export function droneRouteDefinitionForPort(game, building) {
  const point = droneResourcePointForPort(game, building);
  const tier = dronePortTier(building);
  return point && tier ? point[tier] || null : null;
}

export function droneRecipeForPort(game, building) {
  const route = droneRouteDefinitionForPort(game, building);
  return route ? RECIPES[route.recipeId] || null : null;
}

export function droneBuildingTypeForPoint(resourcePointId, tier = DRONE_TIER_UTILITY) {
  return DRONE_RESOURCE_POINTS[resourcePointId]?.[tier]?.buildingType || null;
}

export function assignDroneResourcePoint(game, building, resourcePointId) {
  const tier = dronePortTier(building);
  if (!tier) return { changed: false, reason: 'not-drone-port', point: null };
  const point = DRONE_RESOURCE_POINTS[resourcePointId];
  if (!point) return { changed: false, reason: 'unknown-resource-point', point: null };
  const route = point[tier];
  if (!route) return { changed: false, reason: 'tier-unavailable', point, tier };
  if (!isDroneResourcePointSecured(game, point.id)) return { changed: false, reason: 'not-secured', point, tier };
  const current = droneResourcePointForPort(game, building);
  if (current?.id === point.id && building.resourcePointId === point.id && building.type === route.buildingType) {
    return { changed: false, reason: 'same', point, tier };
  }
  building.resourcePointId = point.id;
  building.type = route.buildingType;
  building.progress = 0;
  return { changed: true, reason: null, point, tier, route };
}

export function dronePortAssignments(game) {
  return (game?.buildings || [])
    .filter(isDronePortBuilding)
    .map((building) => ({
      building,
      tier: dronePortTier(building),
      point: droneResourcePointForPort(game, building),
      route: droneRouteDefinitionForPort(game, building),
    }));
}
