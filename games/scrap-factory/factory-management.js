if (typeof window !== 'undefined') {
  import('./progression-ui.js');
  import('./exploration-ui.js');
  import('./phase4b-management-ui.js');
}
import { BUILDINGS, ITEMS, RECIPES, positionKey } from './config.js';
import {
  findDirectionalRoute,
  isLogisticsNode,
  logisticsAcceptsFrom,
  logisticsOutputKeys,
  logisticsThroughput,
} from './logistics.js';
import { computePowerSnapshot } from './power.js';
import { isStorageBuilding, storageAmount, storageCapacity, storageRemaining } from './storage-capacity.js';

export const CHALLENGES = [
  { id: 'collector_10', title: '廃材回収員', description: 'スクラップを10個回収する', target: 10, metric: 'collected' },
  { id: 'collector_50', title: 'サルベージャー', description: 'スクラップを50個回収する', target: 50, metric: 'collected' },
  { id: 'recycler_10', title: 'リサイクル開始', description: '粉砕機で10回加工する', target: 10, metric: 'processed' },
  { id: 'automation', title: 'ライン稼働', description: '自動生産ラインを完成させる', target: 1, metric: 'automation' },
  { id: 'builder_10', title: '工場建築家', description: '自分で設備を10台設置した状態にする', target: 10, metric: 'buildings' },
  { id: 'revenue_1000', title: '最初の大口売上', description: '累計売上 $1,000 を達成する', target: 1000, metric: 'revenue' },
  { id: 'discover_6', title: '素材図鑑', description: '6種類のアイテムを発見する', target: 6, metric: 'discovered' },
  { id: 'veteran_30m', title: '工場勤務30分', description: '累計30分プレイする', target: 1800, metric: 'playtime' },
];

export function acceptsItem(building, itemId) {
  const def = BUILDINGS[building?.type];
  const item = ITEMS[itemId];
  if (!def || !item) return false;
  return (def.accepts || []).includes(itemId) || (def.accepts || []).includes(item.category);
}

export function challengeValue(game, challenge) {
  switch (challenge.metric) {
    case 'collected': return Number(game?.tutorialStats?.collected || 0);
    case 'processed': return Number(game?.tutorialStats?.processed || 0);
    case 'automation': return game?.tutorialStats?.automationComplete ? 1 : 0;
    case 'buildings': return (game?.buildings || []).filter((b) => !b.permanent).length;
    case 'revenue': return Number(game?.lifetimeRevenue || 0);
    case 'discovered': return (game?.discoveredItems || []).length;
    case 'playtime': return Number(game?.playTimeSeconds || 0);
    default: return 0;
  }
}

export function challengeState(game, challenge) {
  const value = challengeValue(game, challenge);
  return {
    ...challenge,
    value,
    done: value >= challenge.target,
    ratio: Math.min(1, challenge.target > 0 ? value / challenge.target : 0),
  };
}

function bufferAmount(buffer) {
  return Object.values(buffer || {}).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
}

function connectedLogisticsOutputs(building, byCell) {
  const sourceKey = positionKey(building?.x || 0, building?.z || 0);
  return logisticsOutputKeys(building).filter((nextKey) => {
    const next = byCell.get(nextKey);
    if (!next) return false;
    if (!isLogisticsNode(next.type)) return true;
    return logisticsAcceptsFrom(next, sourceKey);
  });
}

function recipeOutputRatePerMinute(recipe) {
  if (!recipe) return 0;
  const amount = Object.values(recipe.output || {}).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
  return Number(recipe.seconds || 0) > 0 ? amount * 60 / Number(recipe.seconds) : 0;
}

export function analyzeFactory(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const byCell = new Map(buildings.map((building) => [positionKey(building.x, building.z), building]));
  const alerts = [];
  let activeMachines = 0;
  let waitingMachines = 0;
  let bufferedItems = 0;
  let logisticsNodes = 0;
  let logisticsCapacity = 0;
  let storageUsed = 0;
  let storageTotalCapacity = 0;
  let storageFull = 0;
  let theoreticalOutputPerMinute = 0;
  let routeSupportedOutputPerMinute = 0;
  let bottleneckCount = 0;
  let smartSorters = 0;

  for (const building of buildings) {
    bufferedItems += bufferAmount(building.input) + bufferAmount(building.output);
    const def = BUILDINGS[building.type];
    const recipe = def?.recipe ? RECIPES[def.recipe] : null;
    if (recipe) {
      const productionRate = recipeOutputRatePerMinute(recipe);
      theoreticalOutputPerMinute += productionRate;
      const ready = Object.entries(recipe.input).every(([itemId, amount]) => Number(building.input?.[itemId] || 0) >= amount);
      if (Number(building.progress || 0) > 0 || ready) activeMachines += 1;
      else {
        waitingMachines += 1;
        const missing = Object.entries(recipe.input)
          .filter(([itemId, amount]) => Number(building.input?.[itemId] || 0) < amount)
          .map(([itemId]) => ITEMS[itemId]?.name || itemId)
          .join(' / ');
        alerts.push({ severity: 'info', buildingId: building.id, title: `${def.name}: 素材待ち`, detail: missing || '入力素材がありません' });
      }

      const outputEntry = Object.entries(recipe.output || {})[0] || null;
      if (outputEntry) {
        const [itemId] = outputEntry;
        const amount = Number(building.output?.[itemId] || 0);
        const route = findDirectionalRoute(buildings, building, itemId, acceptsItem);
        if (!route) {
          if (amount >= 2) {
            alerts.push({
              severity: 'warn',
              kind: 'bottleneck',
              buildingId: building.id,
              title: `${def.name}: 出力が滞留`,
              detail: `${ITEMS[itemId]?.name || itemId} ×${amount} / 搬送先なし`,
            });
            bottleneckCount += 1;
          }
        } else {
          const transportRate = Number(route.throughput || 0) * 60;
          routeSupportedOutputPerMinute += Math.min(productionRate, transportRate);
          if (transportRate + 1e-9 < productionRate) {
            alerts.push({
              severity: 'warn',
              kind: 'bottleneck',
              buildingId: building.id,
              title: `${def.name}: 物流帯域不足`,
              detail: `生産能力 ${productionRate.toFixed(1)}/分 > 搬送 ${transportRate.toFixed(1)}/分`,
            });
            bottleneckCount += 1;
          }
        }
      }
    }

    if (isStorageBuilding(building)) {
      const used = storageAmount(building);
      const capacity = storageCapacity(building);
      storageUsed += used;
      storageTotalCapacity += capacity;
      const remaining = storageRemaining(building);
      if (remaining <= 0) {
        storageFull += 1;
        bottleneckCount += 1;
        alerts.push({
          severity: 'warn',
          kind: 'bottleneck',
          buildingId: building.id,
          title: `${def?.name || 'Storage'}: 満杯`,
          detail: `${used} / ${capacity} / 上流はBack Pressureで停止`,
        });
      } else if (capacity > 0 && used / capacity >= 0.85) {
        alerts.push({
          severity: 'info',
          kind: 'capacity',
          buildingId: building.id,
          title: `${def?.name || 'Storage'}: 容量逼迫`,
          detail: `${Math.round((used / capacity) * 100)}% 使用 / 残り ${remaining}`,
        });
      }
    }

    if (isLogisticsNode(building.type)) {
      logisticsNodes += 1;
      logisticsCapacity += logisticsThroughput(building.type);
      if (building.type === 'smart_sorter') smartSorters += 1;
      const connected = connectedLogisticsOutputs(building, byCell);
      if (!connected.length) {
        alerts.push({
          severity: 'info',
          buildingId: building.id,
          title: `${def?.name || '物流設備'}: 行き止まり`,
          detail: '有効な出力先に設備または次の物流ノードがありません',
        });
      } else if (building.type === 'splitter' && connected.length < 2) {
        alerts.push({
          severity: 'info',
          buildingId: building.id,
          title: `${def.name}: 分岐先が1本のみ`,
          detail: 'Splitterの利点を使うには2本以上の有効な出力先へ接続します',
        });
      } else if (building.type === 'smart_sorter' && connected.length < 3) {
        alerts.push({
          severity: 'info',
          buildingId: building.id,
          title: `${def.name}: 分類先が不足`,
          detail: '正面=高度部品 / 左=中間材・製品 / 右=原料 の3レーンを接続すると全カテゴリを分類できます',
        });
      }
    }
  }

  const counts = {};
  for (const building of buildings) counts[building.type] = Number(counts[building.type] || 0) + 1;
  const power = computePowerSnapshot(game);
  if (power.enabled && power.status === 'shortage') {
    alerts.unshift({
      severity: 'warn',
      kind: 'bottleneck',
      buildingId: null,
      title: 'POWER: 供給不足',
      detail: `供給 ${Math.floor(power.generation || 0)} / 需要 ${Math.floor(power.demand || 0)} / 範囲外 ${power.uncoveredIds?.size || 0}`,
    });
    bottleneckCount += 1;
  }

  const machineTotal = activeMachines + waitingMachines;
  const utilization = machineTotal > 0 ? activeMachines / machineTotal : 0;

  return {
    totalBuildings: buildings.length,
    playerBuilt: buildings.filter((b) => !b.permanent).length,
    activeMachines,
    waitingMachines,
    bufferedItems,
    logisticsNodes,
    logisticsCapacity,
    storageUsed,
    storageCapacity: storageTotalCapacity,
    storageFull,
    production: {
      theoreticalPerMinute: theoreticalOutputPerMinute,
      routeSupportedPerMinute: routeSupportedOutputPerMinute,
      utilization,
      bottleneckCount,
      smartSorters,
    },
    power: {
      enabled: power.enabled,
      status: power.status,
      generation: power.generation,
      demand: power.demand,
      reserve: power.reserve || 0,
      batteryStored: power.batteryStored || 0,
      batteryCapacity: power.batteryCapacity || 0,
      uncovered: power.uncoveredIds?.size || 0,
    },
    counts,
    alerts,
  };
}

function recipeByOutput(itemId) {
  return Object.values(RECIPES).find((recipe) => Object.prototype.hasOwnProperty.call(recipe.output, itemId)) || null;
}

export function planProduction(targetItemId, targetPerMinute) {
  const rate = Math.max(0, Number(targetPerMinute || 0));
  const lines = [];
  const visited = new Set();

  function walk(itemId, neededPerMinute, depth = 0) {
    if (depth > 8 || visited.has(`${itemId}:${depth}`)) return;
    visited.add(`${itemId}:${depth}`);
    const recipe = recipeByOutput(itemId);
    if (!recipe) {
      lines.push({ kind: 'raw', itemId, rate: neededPerMinute, depth });
      return;
    }
    const outputAmount = Number(recipe.output[itemId] || 1);
    const cyclesPerMinutePerMachine = 60 / Number(recipe.seconds || 1);
    const outputPerMinutePerMachine = cyclesPerMinutePerMachine * outputAmount;
    const machines = neededPerMinute / outputPerMinutePerMachine;
    lines.push({ kind: 'machine', itemId, rate: neededPerMinute, machine: recipe.machine, machines, recipeId: recipe.id, depth });
    for (const [inputId, inputAmount] of Object.entries(recipe.input)) {
      const inputRate = neededPerMinute * (Number(inputAmount) / outputAmount);
      walk(inputId, inputRate, depth + 1);
    }
  }

  walk(targetItemId, rate);
  return { targetItemId, targetPerMinute: rate, lines };
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${minutes}m ${String(secs).padStart(2, '0')}s`;
}
