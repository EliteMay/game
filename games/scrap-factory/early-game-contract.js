export const EARLY_GAME_ONBOARDING_UNLOCK = 'onboarding:early-game-v2';

function unlocks(game) {
  return Array.isArray(game?.progression?.unlocks) ? game.progression.unlocks : [];
}

export function hasEarlyGameEnrollment(game) {
  return unlocks(game).includes(EARLY_GAME_ONBOARDING_UNLOCK);
}

export function qualifiesForEarlyGameEnrollment(game) {
  if (!game?.home || game.home.introducedFromLegacy === true) return false;
  if (hasEarlyGameEnrollment(game)) return true;
  return Math.max(0, Number(game.sessionCount || 0)) <= 1;
}
