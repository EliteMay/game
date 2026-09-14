import { advanceHomeTutorial, ensureHomeState } from './home-system.js';
import {
  EARLY_GAME_ONBOARDING_UNLOCK,
  EARLY_GAME_TARGETS,
  earlyGameTelemetry,
  hasEarlyGameEnrollment,
  qualifiesForEarlyGameEnrollment,
  recordEarlyGameAutoSale,
  recordEarlyGamePickup,
  recordEarlyGameProduction,
} from './early-game-contract.js';

export const STARTER_CONTRACT_GRANT = 80;
export const STARTER_CONTRACT_UNLOCK = 'grant:starter-contract-v2';

const AUTO_SATISFIED_TUTORIAL_EVENTS = Object.freeze([
  'bedUsed',
  'moved',
  'pcOpened',
  'inventoryOpened',
  'buildMenuOpened',
]);

const WORLD_PICKUP_HOOK = Symbol('early-game-pickup-hook');
const AUTO_SALE_HOOK = Symbol('early-game-auto-sale-hook');
const IRON_OUTPUT_HOOK = Symbol('early-game-iron-output-hook');

function progressionState(game) {
  game.progression ??= {};
  game.progression.unlocks = Array.isArray(game.progression.unlocks) ? game.progression.unlocks : [];
  return game.progression;
}

function enrollEarlyGame(game) {
  if (!qualifiesForEarlyGameEnrollment(game)) return false;
  if (hasEarlyGameEnrollment(game)) return false;
  const progression = progressionState(game);
  progression.unlocks.push(EARLY_GAME_ONBOARDING_UNLOCK);
  progression.history = Array.isArray(progression.history) ? progression.history : [];
  progression.history.push({ type: 'onboarding-enrollment', id: EARLY_GAME_ONBOARDING_UNLOCK, at: new Date().toISOString() });
  progression.history = progression.history.slice(-100);
  return true;
}

function enrolledHome(game) {
  if (!hasEarlyGameEnrollment(game)) return null;
  const home = ensureHomeState(game);
  return home.introducedFromLegacy ? null : home;
}

export function streamlineFreshTutorial(game) {
  if (!game || Number(game.progression?.progressionRank || 1) !== 1) return false;
  const home = enrolledHome(game);
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

  const home = enrolledHome(game);
  if (!home) return { changed: false, granted: false };
  const progression = progressionState(game);
  if (progression.unlocks.includes(STARTER_CONTRACT_UNLOCK)) {
    return { changed: false, granted: false };
  }

  const telemetry = earlyGameTelemetry(game);
  if (telemetry.metalScrapCollected < EARLY_GAME_TARGETS.metalScrapCollected) {
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

  // FIRST PAY is the single onboarding cash grant for the V2 fresh-start flow.
  home.tutorial.rewardClaimed = true;

  return { changed: true, granted: true, amount: STARTER_CONTRACT_GRANT };
}

export function applyEarlyGameRuntime(game) {
  const enrollmentChanged = enrollEarlyGame(game);
  const tutorialChanged = streamlineFreshTutorial(game);
  const grant = applyStarterContractGrant(game);
  return {
    changed: enrollmentChanged || tutorialChanged || grant.changed,
    enrollmentChanged,
    tutorialChanged,
    grant,
  };
}

function instrumentWorldPickup(runtime) {
  const world = runtime?.world;
  if (!world || world[WORLD_PICKUP_HOOK] || typeof world.collectScrap !== 'function') return;
  const original = world.collectScrap.bind(world);
  world.collectScrap = (...args) => {
    const itemId = original(...args);
    const game = runtime.getGame?.();
    if (itemId && game) recordEarlyGamePickup(game, itemId, 1);
    return itemId;
  };
  Object.defineProperty(world, WORLD_PICKUP_HOOK, { value: true });
}

function instrumentAutoSale(game) {
  const events = enrolledHome(game)?.tutorial?.events;
  if (!events || events[AUTO_SALE_HOOK]) return;
  let current = Boolean(events.autoSale);
  Object.defineProperty(events, 'autoSale', {
    enumerable: true,
    configurable: true,
    get: () => current,
    set: (value) => {
      const next = Boolean(value);
      if (next) recordEarlyGameAutoSale(game, 'crushed_metal', 1);
      current = next;
    },
  });
  Object.defineProperty(events, AUTO_SALE_HOOK, { value: true, configurable: true });
}

function instrumentSmelterOutput(game, building) {
  if (!building || building.type !== 'smelter') return;
  building.output ??= {};
  const output = building.output;
  if (output[IRON_OUTPUT_HOOK]) return;

  let current = Math.max(0, Number(output.iron_ingot || 0));
  Object.defineProperty(output, 'iron_ingot', {
    enumerable: true,
    configurable: true,
    get: () => current,
    set: (value) => {
      const next = Math.max(0, Number(value || 0));
      if (next > current) recordEarlyGameProduction(game, 'iron_ingot', next - current);
      current = next;
    },
  });
  Object.defineProperty(output, IRON_OUTPUT_HOOK, { value: true, configurable: true });
}

function instrumentTelemetry(runtime, game) {
  if (!hasEarlyGameEnrollment(game)) return;
  instrumentWorldPickup(runtime);
  instrumentAutoSale(game);
  for (const building of game.buildings || []) instrumentSmelterOutput(game, building);
}

function shouldKeepWatching(game) {
  if (!game || !qualifiesForEarlyGameEnrollment(game)) return false;
  if (Number(game.progression?.progressionRank || 1) >= 3) return false;
  const telemetry = earlyGameTelemetry(game);
  const starterGrantDone = game.progression?.unlocks?.includes(STARTER_CONTRACT_UNLOCK);
  return !starterGrantDone || telemetry.ironIngotProduced < EARLY_GAME_TARGETS.ironIngotProduced;
}

function installEarlyGameRuntime() {
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

    const result = applyEarlyGameRuntime(game);
    instrumentTelemetry(runtime, game);

    if (result.changed) {
      runtime.persist?.('序盤オンボーディング更新');
      runtime.renderAll?.();
      if (result.grant.granted) {
        runtime.toast?.(`FIRST PAY 契約完了 +$${result.grant.amount}`, 'success');
      }
    }

    if (!shouldKeepWatching(game)) stop();
  };

  tick();
  if (shouldKeepWatching(window.__scrapFactoryRuntime?.getGame?.())) {
    timer = window.setInterval(tick, 250);
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installEarlyGameRuntime();
}
