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

export function streamlineFreshTutorial(game) {
  if (!game || Number(game.progression?.progressionRank || 1) !== 1) return false;
  const home = ensureHomeState(game);
  if (home.introducedFromLegacy || home.tutorial?.basicStatus !== 'active') return false;

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

  const home = ensureHomeState(game);
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
  let lastGame = null;
  let initialPassDone = false;

  const tick = () => {
    const runtime = window.__scrapFactoryRuntime;
    const game = runtime?.getGame?.();
    if (!game) return;

    if (game !== lastGame) {
      lastGame = game;
      initialPassDone = false;
    }

    const result = applyEarlyGameRuntime(game);
    if (!result.changed) {
      initialPassDone = true;
      return;
    }

    runtime.persist?.('序盤オンボーディング更新');
    runtime.renderAll?.();
    if (result.grant.granted) {
      runtime.toast?.(`FIRST PAY 契約完了 +$${result.grant.amount}`, 'success');
    }
    initialPassDone = true;
  };

  tick();
  window.setInterval(tick, initialPassDone ? 500 : 200);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installEarlyGameRuntime();
}
