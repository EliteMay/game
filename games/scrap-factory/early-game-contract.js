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

export const EARLY_GAME_HINT_THRESHOLDS = Object.freeze({
  contextual: 30_000,
  specific: 75_000,
  guide: 120_000,
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

function tutorialStats(game) {
  if (!game) return {};
  game.tutorialStats ??= {};
  return game.tutorialStats;
}

function incrementCapped(game, key, amount, cap) {
  if (!hasEarlyGameEnrollment(game)) return 0;
  const stats = tutorialStats(game);
  const previous = nonNegativeInt(stats[key]);
  const next = Math.min(cap, previous + Math.max(0, nonNegativeInt(amount)));
  stats[key] = next;
  return next - previous;
}

export function hasEarlyGameEnrollment(game) {
  return unlocks(game).includes(EARLY_GAME_ONBOARDING_UNLOCK);
}

export function qualifiesForEarlyGameEnrollment(game) {
  if (!game?.home || game.home.introducedFromLegacy === true) return false;
  if (hasEarlyGameEnrollment(game)) return true;
  return Math.max(0, Number(game.sessionCount || 0)) <= 1;
}

export function recordEarlyGamePickup(game, itemId, amount = 1) {
  if (itemId !== 'metal_scrap') return 0;
  return incrementCapped(game, 'metalScrapCollected', amount, EARLY_GAME_TARGETS.metalScrapCollected);
}

export function recordEarlyGameAutoSale(game, itemId, amount = 1) {
  if (itemId !== 'crushed_metal') return 0;
  return incrementCapped(game, 'crushedMetalAutoSold', amount, EARLY_GAME_TARGETS.crushedMetalAutoSold);
}

export function recordEarlyGameProduction(game, itemId, amount = 1) {
  if (itemId !== 'iron_ingot') return 0;
  return incrementCapped(game, 'ironIngotProduced', amount, EARLY_GAME_TARGETS.ironIngotProduced);
}

export function earlyGameTelemetry(game) {
  const stats = game?.tutorialStats || {};
  const residential = game?.exploration?.areas?.residential || {};
  const activeSession = game?.exploration?.activeSession || null;
  return {
    metalScrapCollected: nonNegativeInt(stats.metalScrapCollected),
    crushedMetalAutoSold: nonNegativeInt(stats.crushedMetalAutoSold),
    ironIngotProduced: nonNegativeInt(stats.ironIngotProduced),
    manualSale: Boolean(game?.home?.tutorial?.events?.manualSale),
    autoCrushedLine: hasAutomatedCrushedMetalLine(game),
    autoIronLine: hasAutomatedIronLine(game),
    residentialVisited: nonNegativeInt(residential.visits) > 0 || activeSession?.areaId === 'residential',
    rank: Math.max(1, nonNegativeInt(game?.progression?.progressionRank) || 1),
  };
}

function contractDoneList(game) {
  const telemetry = earlyGameTelemetry(game);
  const rank2Reached = telemetry.rank >= 2;
  const rank3Reached = telemetry.rank >= 3;
  return [
    rank2Reached || telemetry.metalScrapCollected >= EARLY_GAME_TARGETS.metalScrapCollected,
    rank2Reached || telemetry.manualSale,
    rank2Reached || (telemetry.autoCrushedLine && telemetry.crushedMetalAutoSold >= EARLY_GAME_TARGETS.crushedMetalAutoSold),
    rank3Reached || (telemetry.autoIronLine && telemetry.ironIngotProduced >= EARLY_GAME_TARGETS.ironIngotProduced),
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

function hintsFor(index, telemetry) {
  if (index === 0) return [
    '黄色いSCRAP YARDゲートの先を探す。',
    'ゲート直後に鉄くずがまとまっている。照準を合わせてEで回収。',
    'Oでガイドを開けます。鉄くずだけ6個集めれば次へ進みます。',
  ];
  if (index === 1) return [
    'Factory Baseへ戻り、固定のStarter Sellerを探す。',
    'Starter Sellerへ照準を合わせてE。バッグ内の回収品を直接販売できます。',
    'Oでガイドを開けます。追加Sellerを建てる必要はありません。',
  ];
  if (index === 2) return [
    'BでConveyor / Crusherを設置して、Starter設備同士をつなぐ。',
    '黄色い矢印を Hopper → Crusher → Starter Seller の方向へ揃える。',
    'Oでガイドを開けます。必要順は Hopper → Conveyor → Crusher → Conveyor → Starter Seller。',
  ];
  if (index === 3) return [
    'Rank 2で解放されたSmelterを既存ラインへ追加する。',
    'Crusherの出力をSmelter入力へ、Smelterの出力をSeller / Storageへ接続する。',
    'Oでガイドを開けます。Crusher → Smelter → Seller / Storageが完全につながっているか確認。',
  ];
  return telemetry.rank < 3
    ? [
      'BASIC PRODUCTIONを完成させてRank 3へ進む。',
      'Rank Up条件はProgress画面で確認できます。',
      'Oでガイドを開けます。まずIron Ingot生産条件を満たしてRank 3へ進みます。',
    ]
    : [
      'TでTransport Terminalを開く。',
      '廃住宅街を選び、出発操作を実行する。',
      'Oでガイドを開けます。Transport Terminal → 廃住宅街 → 出発でFresh Start完了です。',
    ];
}

export function earlyGameHintLevel(elapsedMs) {
  const elapsed = Math.max(0, Number(elapsedMs || 0));
  if (elapsed < EARLY_GAME_HINT_THRESHOLDS.contextual) return 0;
  if (elapsed < EARLY_GAME_HINT_THRESHOLDS.specific) return 1;
  if (elapsed < EARLY_GAME_HINT_THRESHOLDS.guide) return 2;
  return 3;
}

export function earlyGameHintForElapsed(objective, elapsedMs) {
  const level = earlyGameHintLevel(elapsedMs);
  if (!objective || level === 0) return { level: 0, text: '' };
  const hints = Array.isArray(objective.hints) ? objective.hints : [];
  return {
    level,
    text: hints[Math.min(level - 1, hints.length - 1)] || '',
  };
}

export function earlyGameObjectiveSignature(objective) {
  if (!objective) return '';
  return `${objective.id}|${objective.progress}`;
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
    hints: hintsFor(index, telemetry),
  };

  if (index === 0) return {
    ...base,
    body: 'Scrap Yardへ向かい、鉄くずを6個回収する。',
  };
  if (index === 1) return {
    ...base,
    body: 'Factoryへ戻り、Starter Sellerで回収品を手動販売する。',
  };
  if (index === 2) return {
    ...base,
    body: 'Hopper → Conveyor → Crusher → Conveyor → Starter Sellerを接続し、Crushed Metalを3個自動販売する。',
  };
  if (index === 3) return {
    ...base,
    body: 'Crusher → Smelter → Seller / Storageの完全自動ラインを作り、Iron Ingotを5個生産する。',
  };
  return {
    ...base,
    body: 'Research / Rank 3を進め、Transport Terminalから廃住宅街へ出発する。',
  };
}
