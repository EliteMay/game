// External HUD panels reuse the base Guide overlay as their pointer-lock carrier.
// When those panels intentionally release Pointer Lock, that unlock must not be
// interpreted as an accidental Escape/pause event by the base game runtime.

const EXTERNAL_OVERLAY_OPENERS = [
  '#factory-management-hud',
  '#progression-hud',
  '#automation-hud',
].join(',');
const SUPPRESS_WINDOW_MS = 1200;

const state = {
  runtime: null,
  suppressUnlockUntil: 0,
  installed: false,
};

function armIntentionalUnlock() {
  const world = state.runtime?.world;
  if (!world?.canvas || document.pointerLockElement !== world.canvas) return;
  state.suppressUnlockUntil = performance.now() + SUPPRESS_WINDOW_MS;
}

function openerFromEvent(event) {
  return event.target instanceof Element
    ? event.target.closest(EXTERNAL_OVERLAY_OPENERS)
    : null;
}

function bindOpenIntent() {
  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.code === 'KeyP') armIntentionalUnlock();
  }, true);

  document.addEventListener('click', (event) => {
    if (openerFromEvent(event)) armIntentionalUnlock();
  }, true);
}

function wrapPointerLockCallback(world) {
  const original = world.callbacks?.onPointerLockChange;
  if (typeof original !== 'function') return false;

  world.callbacks.onPointerLockChange = (locked) => {
    if (!locked && performance.now() <= state.suppressUnlockUntil) {
      state.suppressUnlockUntil = 0;
      return;
    }
    state.suppressUnlockUntil = 0;
    original(locked);
  };
  return true;
}

function install() {
  if (state.installed) return true;
  const runtime = window.__scrapFactoryRuntime;
  const world = runtime?.world;
  if (!runtime || !world?.callbacks) return false;

  if (!wrapPointerLockCallback(world)) return false;
  state.runtime = runtime;
  state.installed = true;
  bindOpenIntent();
  world.userData ??= {};
  world.userData.overlayCarrierRuntime = { mode: 'intentional-pointer-unlock-guard' };
  return true;
}

if (!install()) {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (install() || attempts >= 80) window.clearInterval(timer);
  }, 50);
}

export { install as installOverlayCarrierRuntime };
