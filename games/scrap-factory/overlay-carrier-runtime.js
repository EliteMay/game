// Base panels and external HUD panels intentionally release Pointer Lock before
// showing a mouse-driven surface. That programmatic unlock must not be mistaken
// for the user's Escape action, which is what opens the Pause screen.

const SUPPRESS_WINDOW_MS = 1200;

const state = {
  suppressUnlockUntil: 0,
  installed: false,
};

function wrapProgrammaticUnlock(world) {
  if (typeof world.unlockPointer !== 'function') return false;
  const originalUnlock = world.unlockPointer.bind(world);
  world.unlockPointer = (...args) => {
    if (document.pointerLockElement === world.canvas) {
      state.suppressUnlockUntil = performance.now() + SUPPRESS_WINDOW_MS;
    }
    return originalUnlock(...args);
  };
  return true;
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
  const world = window.__scrapFactoryRuntime?.world;
  if (!world?.callbacks) return false;

  if (!wrapProgrammaticUnlock(world) || !wrapPointerLockCallback(world)) return false;
  state.installed = true;
  world.userData ??= {};
  world.userData.overlayCarrierRuntime = { mode: 'programmatic-pointer-unlock-guard' };
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
