// Frame-batched Pointer Lock mouse look for high-polling-rate mice.
// Keep event handlers minimal at 2000Hz+ and apply the accumulated movement once
// per animation frame so camera state is not mutated thousands of times per second.

function installHighPollingMouseLook(runtime) {
  const world = runtime?.world;
  if (!world || world.userData?.highPollingMouseLookInstalled) return false;

  world.userData ??= {};
  world.userData.highPollingMouseLookInstalled = true;

  let pendingX = 0;
  let pendingY = 0;
  let animationFrame = 0;

  const clearPending = () => {
    pendingX = 0;
    pendingY = 0;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  };

  const flush = () => {
    animationFrame = 0;
    if (document.pointerLockElement !== world.canvas) {
      pendingX = 0;
      pendingY = 0;
      return;
    }

    const movementX = pendingX;
    const movementY = pendingY;
    pendingX = 0;
    pendingY = 0;
    if (!movementX && !movementY) return;

    const sensitivity = Number(world.callbacks?.getSensitivity?.() ?? 0.0022);
    const safeSensitivity = Number.isFinite(sensitivity) ? sensitivity : 0.0022;
    world.player.yaw -= movementX * safeSensitivity;
    world.player.pitch = Math.max(-1.48, Math.min(1.48, world.player.pitch - movementY * safeSensitivity));
  };

  const onMouseMove = (event) => {
    if (document.pointerLockElement !== world.canvas) return;
    const movementX = Number(event.movementX || 0);
    const movementY = Number(event.movementY || 0);
    if (Number.isFinite(movementX)) pendingX += movementX;
    if (Number.isFinite(movementY)) pendingY += movementY;
    if (!animationFrame) animationFrame = requestAnimationFrame(flush);
  };

  const onPointerLockChange = () => {
    if (document.pointerLockElement !== world.canvas) clearPending();
  };

  // The base world owns this listener. Replace only its mouse-look handler and
  // leave keyboard, pointer-lock state and gameplay callbacks untouched.
  if (world.onMouseMove) document.removeEventListener('mousemove', world.onMouseMove);
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('pointerlockchange', onPointerLockChange);

  const originalDestroy = world.destroy.bind(world);
  world.destroy = () => {
    clearPending();
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    originalDestroy();
  };

  world.userData.highPollingMouseLook = {
    mode: 'frame-batched',
    flush,
  };
  return true;
}

function initialize() {
  return installHighPollingMouseLook(window.__scrapFactoryRuntime);
}

if (!initialize()) {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (initialize() || attempts >= 80) window.clearInterval(timer);
  }, 50);
}

export { installHighPollingMouseLook };
