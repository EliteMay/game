import {
  hasAutomatedCrushedMetalLine,
  hasAutomatedIronLine,
} from './progression-core.js';

export const EARLY_GAME_ONBOARDING_UNLOCK = 'onboarding:early-game-v2';

export const EARLY_GAME_TARGETS = Object.freeze({
  metalScrapCollected: 6,
  crushedMetalAutoSold: 3,
  ironIngotProduced: 5,
});

export const EARLY_GAME_CONTRACTS = Object.freeze([
  Object.freeze({ id: 'salvage', code: '01 SALVAGE' }),
  Object.freeze({ id: 'first-pay', code: '02 FIRST PAY' }),
  Object.freeze({ id: 'factory-online', code: '03 FACTORY ONLINE' }),
  Object.freeze({ id: 'basic-production', code: '04 BASIC PRODUCTION' }),
  Object.freeze({ id: 'beyond-yard', code: '05 BEYOND THE YARD' }),
]);

function unlocks(game) {
  return Array.isArray(game?.progression?.unlocks) ? game.progression.unlocks : [];
}

function nonNegativeInt(value) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function hasEarlyGameEnrollment(game) {
  return unlocks(game).includes(EARLY_GAME_ONBOARDING_UNLOCK);
}

export function qualifiesForEarlyGameEnrollment(game) {
  if (!game?.home || game.home.introducedFromLegacy === true) return false;
  if (hasEarlyGameEnrollment(game)) return true;
  return Math.max(0, Number(game.sessionCount || 0)) <= 1;
}

export function earlyGameTelemetry(game) {
  const tutorialStats = game?.tutorialStats || {};
  const residential = game?.exploration?.areas?.residential || {};
  const activeSession = game?.exploration?.activeSession || null;
  return {
    metalScrapCollected: nonNegativeInt(tutorialStats.metalScrapCollected),
    crushedMetalAutoSold: nonNegativeInt(tutorialStats.crushedMetalAutoSold),
    ironIngotProduced: nonNegativeInt(tutorialStats.ironIngotProduced),
    manualSale: Boolean(game?.home?.tutorial?.events?.manualSale),
    autoCrushedLine: hasAutomatedCrushedMetalLine(game),
    autoIronLine: hasAutomatedIronLine(game),
    residentialVisited: nonNegativeInt(residential.visits) > 0 || activeSession?.areaId === 'residential',
    rank: Math.max(1, nonNegativeInt(game?.progression?.progressionRank) || 1),
  };
}

function contractDoneList(game) {
  const telemetry = earlyGameTelemetry(game);
  return [
    telemetry.metalScrapCollected >= EARLY_GAME_TARGETS.metalScrapCollected,
    telemetry.manualSale,
    telemetry.autoCrushedLine && telemetry.crushedMetalAutoSold >= EARLY_GAME_TARGETS.crushedMetalAutoSold,
    telemetry.autoIronLine && telemetry.ironIngotProduced >= EARLY_GAME_TARGETS.ironIngotProduced,
    telemetry.residentialVisited,
  ];
}

export function earlyGameContractState(game) {
  if (!hasEarlyGameEnrollment(game)) return { active: false, complete: false, index: -1, contract: null };
  const done = contractDoneList(game);
  const index = done.findIndex((value) => !value);
  return {
    active: index >= 0,
    complete: index < 0,
    index,
    done,
    contract: index >= 0 ? EARLY_GAME_CONTRACTS[index] : null,
    telemetry: earlyGameTelemetry(game),
  };
}

function contractProgress(index, telemetry) {
  if (index === 0) {
    return `CONTRACT 1 / 5 · 鉄くず ${Math.min(EARLY_GAME_TARGETS.metalScrapCollected, telemetry.metalScrapCollected)} / ${EARLY_GAME_TARGETS.metalScrapCollected}`;
  }
  if (index === 1) return `CONTRACT 2 / 5 · 手動販売 ${telemetry.manualSale ? '1 / 1' : '0 / 1'}`;
  if (index === 2) {
    const line = telemetry.autoCrushedLine ? 'LINE ✓' : 'LINE —';
    const sold = Math.min(EARLY_GAME_TARGETS.crushedMetalAutoSold, telemetry.crushedMetalAutoSold);
    return `CONTRACT 3 / 5 · ${line} · 自動販売 ${sold} / ${EARLY_GAME_TARGETS.crushedMetalAutoSold}`;
  }
  if (index === 3) {
    const line = telemetry.autoIronLine ? 'LINE ✓' : 'LINE —';
    const produced = Math.min(EARLY_GAME_TARGETS.ironIngotProduced, telemetry.ironIngotProduced);
    return `CONTRACT 4 / 5 · ${line} · 生産 ${produced} / ${EARLY_GAME_TARGETS.ironIngotProduced}`;
  }
  if (telemetry.rank < 3) return `CONTRACT 5 / 5 · RANK ${telemetry.rank} / 3`;
  return 'CONTRACT 5 / 5 · TRANSPORT READY';
}

export function earlyGameContractObjective(game) {
  const state = earlyGameContractState(game);
  if (!state.active) return null;
  const { index, telemetry } = state;
  const base = {
    kind: 'CONTRACT',
    id: `early-contract:${state.contract.id}`,
    title: state.contract.code,
    progress: contractProgress(index, telemetry),
  };

  if (index === 0) return {
    ...base,
    body: 'Scrap Yardへ向かい、鉄くずを6個回収する。',
    hint: '黄色いゲートの先へ進み、鉄くずへ照準を合わせてEで回収。',
  };
  if (index === 1) return {
    ...base,
    body: 'Factoryへ戻り、Starter Sellerで回収品を手動販売する。',
    hint: '固定Sellerへ照準を合わせてE。最初の売却でFIRST PAY +$80。',
  };
  if (index === 2) return {
    ...base,
    body: 'Hopper → Conveyor → Crusher → Conveyor → Starter Sellerを接続し、Crushed Metalを3個自動販売する。',
    hint: 'BでConveyor / Crusherを設置。黄色い矢印をSeller方向へ揃える。',
  };
  if (index === 3) return {
    ...base,
    body: 'Crusher → Smelter → Seller / Storageの完全自動ラインを作り、Iron Ingotを5個生産する。',
    hint: 'Rank 2でSmelter解放。Crusherの出力をSmelter入力へ接続する。',
  };
  return {
    ...base,
    body: 'Research / Rank 3を進め、Transport Terminalから廃住宅街へ出発する。',
    hint: telemetry.rank < 3
      ? 'BASIC PRODUCTIONを完成させてRank 3へ進む。'
      : 'TでTransport Terminalを開き、廃住宅街を選んで出発。',
  };
}
