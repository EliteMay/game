import { BUILDINGS, ITEMS, RECIPES } from './config.js';
import { computePowerSnapshot, isBuildingPowered, powerReason } from './power.js';
import { storageRemaining, isStorageBuilding } from './storage-capacity.js';
import { analyzeMegaFactory } from './final-phase.js';

function amountText(buffer) {
  const entries = Object.entries(buffer || {}).filter(([, amount]) => Number(amount) > 0);
  return entries.length ? entries.map(([id, n]) => `${ITEMS[id]?.name || id}×${n}`).join(' / ') : '空';
}

export function diagnoseMachine(game, building) {
  if (!building) return { severity: 'info', code: 'NO_TARGET', title: '対象設備なし', detail: '設備へ照準を合わせてEで開いてください。', actions: [] };
  const def = BUILDINGS[building.type];
  if (!def) return { severity: 'warn', code: 'UNKNOWN_MACHINE', title: '未知の設備', detail: building.type, actions: ['Save互換性を確認'] };
  const power = computePowerSnapshot(game);
  const recipe = def.recipe ? RECIPES[def.recipe] : null;

  if (isStorageBuilding(building) && storageRemaining(building) <= 0) {
    return { severity: 'warn', code: 'STORAGE_FULL', title: 'STORAGE FULL', detail: '出力先Storageが満杯です。Back Pressureにより上流が停止します。', actions: ['Storageから回収', 'Storageを増設', '別Routeへ分岐'] };
  }
  if (Number(def.powerUse || 0) > 0 && !isBuildingPowered(game, building, power)) {
    const reason = powerReason(building, power);
    return {
      severity: 'warn',
      code: reason === 'coverage' ? 'POWER_COVERAGE' : 'POWER_SHORTAGE',
      title: reason === 'coverage' ? 'POWER / 給電範囲外' : 'POWER / 供給不足',
      detail: reason === 'coverage' ? 'Power Pole / Gridの給電範囲へ接続してください。' : `供給 ${Math.floor(power.generation)} / 需要 ${Math.floor(power.demand)}`,
      actions: reason === 'coverage' ? ['Power Poleの範囲を確認'] : ['Generator燃料', '発電量', 'Battery残量を確認'],
    };
  }
  if (recipe) {
    const missing = Object.entries(recipe.input).filter(([id, amount]) => Number(building.input?.[id] || 0) < amount);
    if (missing.length) {
      return {
        severity: 'info',
        code: 'WAITING_INPUT',
        title: 'WAITING INPUT',
        detail: missing.map(([id, amount]) => `${ITEMS[id]?.name || id} ${Number(building.input?.[id] || 0)} / ${amount}`).join(' / '),
        actions: ['上流Routeの向き', '素材の種類', '上流Storageを確認'],
      };
    }
    return { severity: 'ok', code: 'READY', title: building.progress > 0 ? 'RUNNING' : 'READY', detail: `${def.name}: ${amountText(building.input)} → ${amountText(building.output)}`, actions: [] };
  }
  if (building.type.includes('drone_port')) {
    if (!building.resourcePointId) return { severity: 'warn', code: 'DRONE_ROUTE', title: 'DRONE ROUTE未設定', detail: '確保済みResource PointをAutomation Consoleで割り当ててください。', actions: ['Research/Resource Point/Tierを確認'] };
  }
  return { severity: 'ok', code: 'OK', title: 'SYSTEM OK', detail: def.description || def.name, actions: [] };
}

export function diagnoseSystems(game) {
  const power = computePowerSnapshot(game);
  const mega = analyzeMegaFactory(game);
  const buildings = game?.buildings || [];
  const storageFull = buildings.filter((b) => isStorageBuilding(b) && storageRemaining(b) <= 0).length;
  const dronePorts = buildings.filter((b) => b.type.includes('drone_port'));
  const droneMissing = dronePorts.filter((b) => !b.resourcePointId).length;
  const finalMissing = mega.missing?.map((entry) => entry.label) || [];

  return [
    {
      id: 'power', name: 'Power',
      status: power.status === 'shortage' ? 'WARN' : 'OK',
      summary: power.status === 'shortage' ? `供給 ${Math.floor(power.generation)} / 需要 ${Math.floor(power.demand)}` : `Reserve ${Math.floor(power.reserve || 0)}`,
      action: power.status === 'shortage' ? 'Generator燃料・給電範囲・Batteryを確認' : '問題なし',
    },
    {
      id: 'storage', name: 'Storage / Backpressure',
      status: storageFull ? 'WARN' : 'OK',
      summary: storageFull ? `${storageFull}台が満杯` : '満杯Storageなし',
      action: storageFull ? '回収・増設・別Routeへ分岐' : '問題なし',
    },
    {
      id: 'drone', name: 'Drone',
      status: droneMissing ? 'WARN' : 'OK',
      summary: dronePorts.length ? `${dronePorts.length} Port / 未設定 ${droneMissing}` : 'Drone Port未設置',
      action: droneMissing ? 'Resource Point / Route / Powerを確認' : '必要ならAutomation ConsoleでRoute確認',
    },
    {
      id: 'final', name: 'Final Automation / Mega Factory',
      status: game?.progression?.progressionRank >= 7 && finalMissing.length ? 'WARN' : 'OK',
      summary: game?.finalChapter?.mainClearedAt ? 'MAIN CLEAR' : mega.stable ? `STABLE ${Math.floor(game?.finalChapter?.megaFactoryStableSeconds || 0)} / 180s` : finalMissing[0] || 'Rank 7で有効',
      action: finalMissing.length ? finalMissing.slice(0, 2).join(' / ') : '問題なし',
    },
  ];
}
