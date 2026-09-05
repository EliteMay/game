import { BUILDINGS, ITEMS } from './config.js';
import {
  DRONE_TIER_ADVANCED,
  dronePortAssignments,
} from './drone-routes.js';
import { findDirectionalRoutes } from './logistics.js';
import { computePowerSnapshot, generatorActive } from './power.js';

export const FINAL_PRODUCT_ID = 'autonomous_industrial_core';

function acceptsItem(building, itemId) {
  const def = BUILDINGS[building?.type];
  const item = ITEMS[itemId];
  if (!def || !item) return false;
  return (def.accepts || []).includes(itemId) || (def.accepts || []).includes(item.category);
}

function routeBetween(buildings, source, target, itemId) {
  if (!source || !target || !acceptsItem(target, itemId)) return null;
  return findDirectionalRoutes(buildings, source, itemId, acceptsItem, target.id)[0] || null;
}

function mergeIds(...values) {
  return [...new Set(values.flatMap((value) => value || []))];
}

function routeThroughput(route) {
  return route ? Math.max(0, Number(route.throughput || 0)) : 0;
}

function candidateThroughput(candidate) {
  return Number.isFinite(Number(candidate?.throughput)) ? Number(candidate.throughput) : Infinity;
}

function sourceCandidates(game, itemId) {
  return dronePortAssignments(game)
    .filter(({ tier, point }) => tier === DRONE_TIER_ADVANCED && point?.itemId === itemId)
    .map(({ building, point, route }) => ({
      building,
      point,
      ids: [building.id],
      routes: [],
      throughput: route?.seconds > 0 ? 1 / route.seconds : Infinity,
    }));
}

function bestFeed(buildings, upstreamCandidates, target, itemId) {
  let best = null;
  for (const upstream of upstreamCandidates) {
    const route = routeBetween(buildings, upstream.building, target, itemId);
    if (!route) continue;
    const throughput = Math.min(candidateThroughput(upstream), routeThroughput(route));
    const candidate = { upstream, route, throughput };
    if (!best || candidate.throughput > best.throughput) best = candidate;
  }
  return best;
}

function stageCandidates(buildings, targets, requirements) {
  const result = [];
  for (const target of targets) {
    const feeds = [];
    let valid = true;
    for (const requirement of requirements) {
      const feed = bestFeed(buildings, requirement.upstream, target, requirement.itemId);
      if (!feed) {
        valid = false;
        break;
      }
      feeds.push(feed);
    }
    if (!valid) continue;
    const upstreamIds = feeds.flatMap((feed) => feed.upstream.ids || []);
    const routeNodeIds = feeds.flatMap((feed) => feed.route.nodeIds || []);
    const throughput = Math.min(...feeds.map((feed) => feed.throughput));
    result.push({
      building: target,
      ids: mergeIds([target.id], upstreamIds, routeNodeIds),
      routes: feeds.flatMap((feed) => [...(feed.upstream.routes || []), feed.route]),
      throughput,
      feeds,
    });
  }
  return result;
}

function buildingsOfType(buildings, type) {
  return buildings.filter((building) => building.type === type);
}

function finalProductCount(game) {
  let total = Math.max(0, Number(game?.inventory?.[FINAL_PRODUCT_ID] || 0));
  for (const building of game?.buildings || []) total += Math.max(0, Number(building?.output?.[FINAL_PRODUCT_ID] || 0));
  return total;
}

export function analyzeFinalAutomation(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const researched = new Set(Array.isArray(game?.progression?.completedResearch) ? game.progression.completedResearch : []);
  const experimentalTechnology = researched.has('experimental_technology');

  const scrapSources = sourceCandidates(game, 'metal_scrap');
  const copperSources = sourceCandidates(game, 'copper_wire');
  const plasticSources = sourceCandidates(game, 'plastic');
  const electronicsSources = sourceCandidates(game, 'e_waste');
  const alloySources = sourceCandidates(game, 'rare_alloy');

  const crusherStages = stageCandidates(buildings, buildingsOfType(buildings, 'crusher'), [
    { itemId: 'metal_scrap', upstream: scrapSources },
  ]);
  const smelterStages = stageCandidates(buildings, buildingsOfType(buildings, 'smelter'), [
    { itemId: 'crushed_metal', upstream: crusherStages },
  ]);
  const plateStages = stageCandidates(buildings, buildingsOfType(buildings, 'assembler_plate'), [
    { itemId: 'iron_ingot', upstream: smelterStages },
  ]);
  const motorStages = stageCandidates(buildings, buildingsOfType(buildings, 'assembler_motor'), [
    { itemId: 'iron_ingot', upstream: smelterStages },
    { itemId: 'copper_wire', upstream: copperSources },
  ]);
  const circuitStages = stageCandidates(buildings, buildingsOfType(buildings, 'assembler_circuit'), [
    { itemId: 'copper_wire', upstream: copperSources },
    { itemId: 'e_waste', upstream: electronicsSources },
    { itemId: 'plastic', upstream: plasticSources },
  ]);
  const controlStages = stageCandidates(buildings, buildingsOfType(buildings, 'assembler'), [
    { itemId: 'motor', upstream: motorStages },
    { itemId: 'circuit', upstream: circuitStages },
    { itemId: 'plastic', upstream: plasticSources },
  ]);
  const experimentalSetStages = stageCandidates(buildings, buildingsOfType(buildings, 'fabricator'), [
    { itemId: 'control_unit', upstream: controlStages },
    { itemId: 'rare_alloy', upstream: alloySources },
    { itemId: 'circuit', upstream: circuitStages },
    { itemId: 'iron_plate', upstream: plateStages },
  ]);
  const coreStages = stageCandidates(buildings, buildingsOfType(buildings, 'fabricator_core'), [
    { itemId: 'ai_control_module', upstream: experimentalSetStages },
    { itemId: 'experimental_frame', upstream: experimentalSetStages },
    { itemId: 'experimental_power_module', upstream: experimentalSetStages },
    { itemId: 'control_unit', upstream: controlStages },
  ]);
  const finalTargets = buildings.filter((building) => ['storage', 'industrial_storage', 'logistics_warehouse'].includes(building.type));
  const outputStages = stageCandidates(buildings, finalTargets, [
    { itemId: FINAL_PRODUCT_ID, upstream: coreStages },
  ]);

  const bestOutput = [...outputStages].sort((a, b) => b.throughput - a.throughput)[0] || null;
  const lineIds = bestOutput?.ids || [];
  const powerSnapshot = computePowerSnapshot(game);
  const poweredLine = Boolean(bestOutput) && lineIds.every((id) => {
    const building = buildings.find((entry) => entry.id === id);
    return !building || Number(BUILDINGS[building.type]?.powerUse || 0) <= 0 || powerSnapshot.poweredIds.has(id);
  });

  const experimentalPowerSystems = buildings.filter((building) => building.type === 'experimental_power_system');
  const fueledPowerSystems = experimentalPowerSystems.filter((system) => alloySources.some((source) => routeBetween(buildings, source.building, system, 'rare_alloy')));
  const experimentalPowerRouted = fueledPowerSystems.length > 0;
  const experimentalPowerActive = fueledPowerSystems.some(generatorActive);
  const productCount = finalProductCount(game);
  const productProven = productCount > 0 || (game?.discoveredItems || []).includes(FINAL_PRODUCT_ID);

  const stages = {
    experimentalTechnology,
    advancedScrap: scrapSources.length > 0,
    advancedCopper: copperSources.length > 0,
    advancedPlastic: plasticSources.length > 0,
    advancedElectronics: electronicsSources.length > 0,
    advancedAlloy: alloySources.length > 0,
    metallurgy: smelterStages.length > 0,
    plateAutomation: plateStages.length > 0,
    motorAutomation: motorStages.length > 0,
    circuitAutomation: circuitStages.length > 0,
    controlAutomation: controlStages.length > 0,
    experimentalSetAutomation: experimentalSetStages.length > 0,
    autonomousCoreAutomation: coreStages.length > 0,
    finalStorageRoute: outputStages.length > 0,
    experimentalPowerRouted,
    experimentalPowerActive,
    poweredLine,
    productProven,
  };

  const labels = {
    experimentalTechnology: 'Experimental Technology研究',
    advancedScrap: 'Advanced Drone / 鉄くずRoute',
    advancedCopper: 'Advanced Drone / 銅線Route',
    advancedPlastic: 'Advanced Drone / プラスチックRoute',
    advancedElectronics: 'Advanced Drone / 電子ジャンクRoute',
    advancedAlloy: 'Advanced Drone / レア合金Route',
    metallurgy: 'Crusher → Smelter自動精錬',
    plateAutomation: '鉄板Assembler Line',
    motorAutomation: 'Motor Assembler Line',
    circuitAutomation: 'Circuit Assembler Line',
    controlAutomation: 'Control Unit Assembler Line',
    experimentalSetAutomation: 'Experimental部品Fabricator Line',
    autonomousCoreAutomation: 'Autonomous Industrial Core Fabricator Line',
    finalStorageRoute: '最終Core → Storage Route',
    experimentalPowerRouted: 'Advanced Alloy → Experimental Power Route',
    experimentalPowerActive: 'Experimental Power System稼働',
    poweredLine: '最終Line全設備へ給電',
    productProven: 'Autonomous Industrial Coreを1個以上生産',
  };
  const missing = Object.entries(stages).filter(([, done]) => !done).map(([id]) => ({ id, label: labels[id] }));
  const topologyReady = Boolean(bestOutput && experimentalPowerRouted);
  const qualifies = Object.values(stages).every(Boolean);

  return {
    qualifies,
    topologyReady,
    stages,
    missing,
    lineBuildingIds: lineIds,
    routeThroughput: bestOutput ? bestOutput.throughput : 0,
    finalStorageId: bestOutput?.building?.id || null,
    experimentalPowerSystems: experimentalPowerSystems.length,
    productCount,
    power: {
      status: powerSnapshot.status,
      generation: powerSnapshot.generation,
      demand: powerSnapshot.demand,
      reserve: powerSnapshot.reserve,
    },
  };
}
