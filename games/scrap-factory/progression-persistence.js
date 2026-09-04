import { loadRootSave, saveRootSave } from './storage.js';
import { withNormalizedProgression } from './progression.js';

const GAME_ID = 'scrap-factory';
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

function hasProgression(game) {
  return Number.isFinite(Number(game?.progressionRank))
    && game?.progression
    && typeof game.progression === 'object'
    && !Array.isArray(game.progression);
}

function persistInitialProgression() {
  const root = loadRootSave();
  const current = root.games?.[GAME_ID] || {};
  if (hasProgression(current)) return false;

  const normalized = withNormalizedProgression(current, { inferLegacy: true });
  if (normalized.progressionRank === 1) {
    normalized.progression.migratedFromLegacy = false;
    normalized.progression.migrationNote = null;
  }

  root.games = {
    ...root.games,
    [GAME_ID]: {
      ...current,
      progressionRank: normalized.progressionRank,
      progression: structuredClone(normalized.progression),
    },
  };
  saveRootSave(root);
  return true;
}

function watchProgressionWrites() {
  const stack = document.querySelector('#toast-stack');
  if (!stack) {
    window.setTimeout(watchProgressionWrites, 80);
    return;
  }
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement) || node.dataset.progressionToast !== 'true') continue;
        if (!node.classList.contains('toast--success')) continue;
        window.location.reload();
        return;
      }
    }
  });
  observer.observe(stack, { childList: true });
}

if (isBrowser) {
  try {
    const added = persistInitialProgression();
    if (added) window.location.reload();
    else watchProgressionWrites();
  } catch (error) {
    console.warn('Progression persistence initialization failed.', error);
    watchProgressionWrites();
  }
}
