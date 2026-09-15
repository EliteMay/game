import { claimRankUp, rankProgress } from './progression.js';
import { EARLY_GAME_ONBOARDING_UNLOCK } from './early-game-contract.js';

const AUTO_RANK_MAX = 3;
const CHECK_INTERVAL_MS = 250;

function enrolled(game) {
  return Array.isArray(game?.progression?.unlocks)
    && game.progression.unlocks.includes(EARLY_GAME_ONBOARDING_UNLOCK)
    && game?.home?.introducedFromLegacy !== true;
}

export function advanceFreshEarlyRank(game) {
  if (!enrolled(game)) return { changed: false, reason: 'not-enrolled' };

  const fromRank = Math.max(1, Number(game?.progression?.progressionRank || 1));
  if (fromRank >= AUTO_RANK_MAX) return { changed: false, reason: 'outside-auto-range', fromRank };

  const progress = rankProgress(game);
  if (!progress.eligible) return { changed: false, reason: 'requirements', fromRank, progress };

  const result = claimRankUp(game);
  if (!result.changed) return { ...result, fromRank };
  return {
    ...result,
    changed: true,
    fromRank,
    toRank: Number(game.progression.progressionRank || fromRank + 1),
  };
}

function rankUpMessage(rank) {
  if (rank === 2) return 'FACTORY RANK 2 — Smelter / Storage / Seller建築を解放';
  if (rank === 3) return 'FACTORY RANK 3 — 廃住宅街を解放。以降のRank条件は「管理 → RANK」で確認';
  return `FACTORY RANK ${rank}`;
}

function installFreshEarlyRankRuntime() {
  let timer = null;

  const stop = () => {
    if (!timer) return;
    window.clearInterval(timer);
    timer = null;
  };

  const tick = () => {
    const runtime = window.__scrapFactoryRuntime;
    const game = runtime?.getGame?.();
    if (!game) return;

    const result = advanceFreshEarlyRank(game);
    if (result.changed) {
      runtime.persist?.(`Fresh Start Rank ${result.toRank}`);
      runtime.renderAll?.();
      runtime.toast?.(rankUpMessage(result.toRank), 'success');
    }

    const rank = Math.max(1, Number(game?.progression?.progressionRank || 1));
    if (!enrolled(game) || rank >= AUTO_RANK_MAX) stop();
  };

  tick();
  const game = window.__scrapFactoryRuntime?.getGame?.();
  if (enrolled(game) && Number(game?.progression?.progressionRank || 1) < AUTO_RANK_MAX) {
    timer = window.setInterval(tick, CHECK_INTERVAL_MS);
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installFreshEarlyRankRuntime();
}
