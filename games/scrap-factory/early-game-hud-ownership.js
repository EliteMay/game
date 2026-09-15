// Fresh Start V2 owns the visible Main Goal surface while a Contract is active.
// Some legacy/adaptive HUD passes can re-expose the generic objective after the
// Fresh Contract panel has already been created. Keep visibility ownership
// explicit so the player never sees two competing primary goals.

const STACK_SELECTOR = '[data-hud-context-stack]';
const FRESH_SELECTOR = ':scope > .objective-panel[data-early-contract-panel]';
const LEGACY_SELECTOR = ':scope > .objective-panel:not([data-early-contract-panel])';

function syncObjectiveOwnership() {
  const stack = document.querySelector(STACK_SELECTOR);
  if (!stack) return;

  const fresh = stack.querySelector(FRESH_SELECTOR);
  const legacy = stack.querySelector(LEGACY_SELECTOR);
  if (!legacy) return;

  const shouldHideLegacy = Boolean(fresh);
  if (legacy.hidden !== shouldHideLegacy) legacy.hidden = shouldHideLegacy;
  stack.dataset.earlyContractOwner = shouldHideLegacy ? 'fresh' : 'legacy';
}

function boot() {
  syncObjectiveOwnership();

  const root = document.body || document.documentElement;
  const observer = new MutationObserver(() => syncObjectiveOwnership());
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['hidden'],
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
