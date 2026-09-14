import { advanceHomeTutorial, ensureHomeState } from './home-system.js';

export const STARTER_CONTRACT_GRANT = 80;
export const STARTER_CONTRACT_UNLOCK = 'grant:starter-contract-v2';

const AUTO_SATISFIED_TUTORIAL_EVENTS = Object.freeze([
  'bedUsed',
  'moved',
  'pcOpened',
  'inventoryOpened',
  'buildMenuOpened',
]);

function progressionState(game) {
  game.progression ??= {};
  game.progression.unlocks = Array.isArray(game.progression.unlocks) ? game.progression.unlocks : [];
  return game.progression;
}

function freshHome(game) {
  const home = ensureHomeState(game);
  return home.introducedFromLegacy ? null : home;
}

export function streamlineFreshTutorial(game) {
  if (!game || Number(game.progression?.progressionRank || 1) !== 1) return false;
  const home = freshHome(game);
  if (!home || home.tutorial?.basicStatus !== 'active') return false;

  let changed = false;
  for (const eventName of AUTO_SATISFIED_TUTORIAL_EVENTS) {
    if (home.tutorial.events?.[eventName]) continue;
    home.tutorial.events[eventName] = true;
    changed = true;
  }

  const result = advanceHomeTutorial(game);
  return changed || Boolean(result.changed);
}

export function applyStarterContractGrant(game) {
  if (!game || Number(game.progression?.progressionRank || 1) !== 1) {
    return { changed: false, granted: false };
  }

  const home = freshHome(game);
  if (!home) return { changed: false, granted: false };
  const progression = progressionState(game);
  if (progression.unlocks.includes(STARTER_CONTRACT_UNLOCK)) {
    return { changed: false, granted: false };
  }
  if (!home.tutorial?.events?.manualSale) {
    return { changed: false, granted: false };
  }

  game.money = Math.max(0, Number(game.money || 0)) + STARTER_CONTRACT_GRANT;
  progression.unlocks.push(STARTER_CONTRACT_UNLOCK);
  progression.history = Array.isArray(progression.history) ? progression.history : [];
  progression.history.push({
    type: 'starter-contract',
    cash: STARTER_CONTRACT_GRANT,
    at: new Date().toISOString(),
  });
  progression.history = progression.history.slice(-100);

  // The old 15-step tutorial awarded $50 at full completion. FIRST PAY replaces
  // that reward so the fresh-start economy has one predictable onboarding grant.
  home.tutorial.rewardClaimed = true;

  return { changed: true, granted: true, amount: STARTER_CONTRACT_GRANT };
}

export function applyEarlyGameRuntime(game) {
  const tutorialChanged = streamlineFreshTutorial(game);
  const grant = applyStarterContractGrant(game);
  return {
    changed: tutorialChanged || grant.changed,
    tutorialChanged,
    grant,
  };
}

function installEarlyGameRuntime() {
  const tick = () => {
    const runtime = window.__scrapFactoryRuntime;
    const game = runtime?.getGame?.();
    if (!game) return;

    const result = applyEarlyGameRuntime(game);
    if (!result.changed) return;

    runtime.persist?.('序盤オンボーディング更新');
    runtime.renderAll?.();
    if (result.grant.granted) {
      runtime.toast?.(`FIRST PAY 契約完了 +$${result.grant.amount}`, 'success');
    }
  };

  tick();
  window.setInterval(tick, 250);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installEarlyGameRuntime();
}
