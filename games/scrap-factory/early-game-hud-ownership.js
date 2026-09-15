// Fresh Start V2 owns the visible Main Goal surface while a Contract is active.
// Some legacy/adaptive HUD passes can re-expose the generic objective after the
// Fresh Contract panel has already been created. Keep visibility ownership
// explicit so the player never sees two competing primary goals.
//
// Existing Rank 1-3 saves intentionally stay on the legacy progression contract.
// Their fallback Main Goal must still explain the concrete next action instead of
// only saying "Rank N Main Objective".

const STACK_SELECTOR = '[data-hud-context-stack]';
const FRESH_SELECTOR = ':scope > .objective-panel[data-early-contract-panel]';
const LEGACY_SELECTOR = ':scope > .objective-panel:not([data-early-contract-panel])';

const LEGACY_EARLY_GOALS = Object.freeze({
  1: Object.freeze({
    title: 'Rank 2 — 最初の自動化',
    body: 'Hopper → Crusher → Sellerの自動ラインを完成。さらに「累計売上$250 / Scrap 10個回収 / 粉砕5回 / Crusher 2台」のうち2つを達成し、P → RANKでRank 2へ。',
  }),
  2: Object.freeze({
    title: 'Rank 3 — 基本工場',
    body: 'Crusher → Smelter → Sellerの鉄インゴット自動ラインを完成。さらに「累計売上$750 / 鉄インゴット発見 / 自作設備8台 / 粉砕10回」のうち2つを達成し、P → RANKでRank 3へ。',
  }),
  3: Object.freeze({
    title: 'Rank 4 — 廃住宅街を攻略',
    body: '廃住宅街のMain Objectiveを完了し、追加条件を2つ達成する。P → RANKで達成状況と不足条件を確認できます。',
  }),
});

function currentGame() {
  return window.__scrapFactoryRuntime?.getGame?.() || null;
}

function explainLegacyEarlyGoal(panel) {
  const game = currentGame();
  const rank = Math.max(1, Number(game?.progression?.progressionRank || 1));
  const goal = LEGACY_EARLY_GOALS[rank];
  const title = panel.querySelector('#tutorial-title');
  const body = panel.querySelector('#tutorial-body');

  if (!goal) {
    panel.dataset.legacyGoalExplained = 'false';
    if (body) body.style.removeProperty('display');
    return;
  }

  if (title && title.textContent !== goal.title) title.textContent = goal.title;
  if (body && body.textContent !== goal.body) body.textContent = goal.body;
  if (body) body.style.display = 'block';
  panel.dataset.legacyGoalExplained = 'true';
}

function syncObjectiveOwnership() {
  const stack = document.querySelector(STACK_SELECTOR);
  if (!stack) return;

  const fresh = stack.querySelector(FRESH_SELECTOR);
  const legacy = stack.querySelector(LEGACY_SELECTOR);
  if (!legacy) return;

  const shouldHideLegacy = Boolean(fresh);
  if (legacy.hidden !== shouldHideLegacy) legacy.hidden = shouldHideLegacy;
  stack.dataset.earlyContractOwner = shouldHideLegacy ? 'fresh' : 'legacy';

  if (!shouldHideLegacy) explainLegacyEarlyGoal(legacy);
}

function boot() {
  syncObjectiveOwnership();

  const root = document.body || document.documentElement;
  const observer = new MutationObserver(() => syncObjectiveOwnership());
  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['hidden'],
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
