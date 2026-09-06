import * as THREE from 'three';

const DEFAULTS = Object.freeze({
  invertY: false,
  fieldOfView: 76,
  headBob: 100,
  sprintFovEffect: 100,
  reduceMotion: false,
  hudScale: 100,
  textScale: 100,
  crosshairScale: 100,
  performanceMode: false,
  customRenderScale: 100,
  customShadows: true,
  customAtmosphere: true,
});

const CLAMPS = Object.freeze({
  fieldOfView: [65, 100],
  headBob: [0, 100],
  sprintFovEffect: [0, 100],
  hudScale: [80, 125],
  textScale: [90, 125],
  crosshairScale: [70, 160],
  customRenderScale: [60, 100],
});

function clampSetting(key, value) {
  const range = CLAMPS[key];
  if (!range) return value;
  const numeric = Number(value);
  const fallback = DEFAULTS[key];
  return THREE.MathUtils.clamp(Number.isFinite(numeric) ? numeric : fallback, range[0], range[1]);
}

function normalizeSettings(settings) {
  let changed = false;
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    if (!(key in settings)) {
      settings[key] = fallback;
      changed = true;
    }
  }
  for (const key of Object.keys(CLAMPS)) {
    const next = clampSetting(key, settings[key]);
    if (next !== settings[key]) {
      settings[key] = next;
      changed = true;
    }
  }
  for (const key of ['invertY', 'reduceMotion', 'performanceMode', 'customShadows', 'customAtmosphere']) {
    const next = Boolean(settings[key]);
    if (next !== settings[key]) {
      settings[key] = next;
      changed = true;
    }
  }
  if (!['high', 'medium', 'low', 'custom'].includes(settings.quality)) {
    settings.quality = 'high';
    changed = true;
  }
  return changed;
}

function ensureStylesheet() {
  if (document.querySelector('link[data-phase7-settings-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './phase7-settings.css';
  link.dataset.phase7SettingsStyle = 'true';
  document.head.append(link);
}

function ensureCustomQualityOption() {
  const quality = document.querySelector('#setting-quality');
  if (!quality || quality.querySelector('option[value="custom"]')) return quality;
  const option = document.createElement('option');
  option.value = 'custom';
  option.textContent = 'Custom';
  quality.append(option);
  return quality;
}

function rangeRow({ id, title, note, min, max, step = 1, suffix = '' }) {
  return `
    <label class="setting-row phase7-setting-row">
      <span><strong>${title}</strong><small>${note}</small></span>
      <span class="range-control">
        <input id="${id}" type="range" min="${min}" max="${max}" step="${step}">
        <output id="${id}-value" data-suffix="${suffix}"></output>
      </span>
    </label>
  `;
}

function checkRow({ id, title, note }) {
  return `
    <label class="setting-row setting-row--check phase7-setting-row">
      <span><strong>${title}</strong><small>${note}</small></span>
      <input id="${id}" type="checkbox">
    </label>
  `;
}

function ensureControls() {
  const list = document.querySelector('#settings-panel .settings-list');
  if (!list) return null;
  let section = list.querySelector('[data-phase7-settings]');
  if (section) return section;

  section = document.createElement('div');
  section.className = 'phase7-settings-section';
  section.dataset.phase7Settings = 'true';
  section.innerHTML = `
    <div class="phase7-settings-heading">
      <span>ACCESSIBILITY / GRAPHICS</span>
      <strong>表示・カメラ・軽量化</strong>
    </div>
    ${checkRow({ id: 'setting-invert-y', title: 'Y軸反転', note: '上下の視点操作を反転' })}
    ${rangeRow({ id: 'setting-fov', title: 'FOV', note: '一人称視点の基本視野角', min: 65, max: 100, suffix: '°' })}
    ${rangeRow({ id: 'setting-head-bob', title: 'Head Bob', note: '歩行時の上下・左右揺れ', min: 0, max: 100, suffix: '%' })}
    ${rangeRow({ id: 'setting-sprint-fov', title: 'Sprint FOV Effect', note: 'ダッシュ時の視野角変化', min: 0, max: 100, suffix: '%' })}
    ${checkRow({ id: 'setting-reduce-motion', title: 'Reduce Motion', note: 'Head BobとSprint FOV Effectを抑制' })}
    ${rangeRow({ id: 'setting-hud-scale', title: 'HUD Scale', note: 'ゲーム中HUDの大きさ', min: 80, max: 125, step: 5, suffix: '%' })}
    ${rangeRow({ id: 'setting-text-scale', title: 'Text Size', note: 'メニュー・HUD文字サイズ', min: 90, max: 125, step: 5, suffix: '%' })}
    ${rangeRow({ id: 'setting-crosshair-scale', title: 'Crosshair', note: '照準マーカーの大きさ', min: 70, max: 160, step: 5, suffix: '%' })}
    ${checkRow({ id: 'setting-performance-mode', title: 'Performance Mode', note: 'Shadow / Atmosphere / 描画解像度を軽量化。Simulationは変更しません' })}
    <div class="phase7-custom" data-phase7-custom>
      <div class="phase7-custom__label"><strong>Custom Graphics</strong><small>描画品質をCustomにした場合だけ使用</small></div>
      ${rangeRow({ id: 'setting-render-scale', title: 'Render Scale', note: '3D Canvasの内部描画解像度', min: 60, max: 100, step: 5, suffix: '%' })}
      ${checkRow({ id: 'setting-custom-shadows', title: 'Realtime Shadow', note: '主要Machine / Structureの影' })}
      ${checkRow({ id: 'setting-custom-atmosphere', title: 'Atmosphere', note: 'Dustなどの環境Effect' })}
    </div>
  `;
  list.append(section);
  return section;
}

function controls() {
  return {
    quality: document.querySelector('#setting-quality'),
    invertY: document.querySelector('#setting-invert-y'),
    fieldOfView: document.querySelector('#setting-fov'),
    headBob: document.querySelector('#setting-head-bob'),
    sprintFovEffect: document.querySelector('#setting-sprint-fov'),
    reduceMotion: document.querySelector('#setting-reduce-motion'),
    hudScale: document.querySelector('#setting-hud-scale'),
    textScale: document.querySelector('#setting-text-scale'),
    crosshairScale: document.querySelector('#setting-crosshair-scale'),
    performanceMode: document.querySelector('#setting-performance-mode'),
    customRenderScale: document.querySelector('#setting-render-scale'),
    customShadows: document.querySelector('#setting-custom-shadows'),
    customAtmosphere: document.querySelector('#setting-custom-atmosphere'),
    customGroup: document.querySelector('[data-phase7-custom]'),
  };
}

function setOutput(input, value) {
  if (!input) return;
  const output = document.querySelector(`#${input.id}-value`);
  if (!output) return;
  output.textContent = `${Math.round(Number(value))}${output.dataset.suffix || ''}`;
}

function renderControls(settings) {
  const ui = controls();
  if (ui.quality) ui.quality.value = settings.quality;
  for (const key of ['fieldOfView', 'headBob', 'sprintFovEffect', 'hudScale', 'textScale', 'crosshairScale', 'customRenderScale']) {
    const input = ui[key];
    if (!input) continue;
    input.value = String(settings[key]);
    setOutput(input, settings[key]);
  }
  for (const key of ['invertY', 'reduceMotion', 'performanceMode', 'customShadows', 'customAtmosphere']) {
    if (ui[key]) ui[key].checked = Boolean(settings[key]);
  }
  if (ui.customGroup) ui.customGroup.hidden = settings.quality !== 'custom';
}

function applyAccessibility(settings) {
  const root = document.documentElement;
  root.style.setProperty('--phase7-hud-scale', String(settings.hudScale / 100));
  root.style.setProperty('--phase7-text-scale', String(settings.textScale / 100));
  root.style.setProperty('--phase7-crosshair-scale', String(settings.crosshairScale / 100));
  document.body.dataset.reduceMotion = settings.reduceMotion ? 'true' : 'false';
}

function applyGraphics(world, settings) {
  if (!world?.renderer) return;
  if (settings.performanceMode) {
    world.setQuality?.('low');
    world.renderer.shadowMap.enabled = false;
    if (world.visualFx?.dust) world.visualFx.dust.visible = false;
    world.camera.far = 145;
    world.camera.updateProjectionMatrix();
    return;
  }

  world.camera.far = 190;
  if (settings.quality === 'custom') {
    world.setQuality?.('high');
    const dpr = window.devicePixelRatio || 1;
    const renderScale = clampSetting('customRenderScale', settings.customRenderScale) / 100;
    world.renderer.setPixelRatio(Math.max(0.75, Math.min(dpr, 1.8) * renderScale));
    world.renderer.shadowMap.enabled = Boolean(settings.customShadows);
    if (world.visualFx?.dust) {
      world.visualFx.dust.visible = Boolean(settings.customAtmosphere);
      world.visualFx.dust.material.opacity = 0.26;
    }
    world.resize?.();
  } else {
    world.setQuality?.(settings.quality);
  }
  world.camera.updateProjectionMatrix();
}

function patchCamera(runtime, settings) {
  const world = runtime.world;
  if (!world?.callbacks || world.userData?.phase7SettingsPatched) return;
  world.userData ??= {};
  world.userData.phase7SettingsPatched = true;

  const originalOnFrame = world.callbacks.onFrame;
  world.callbacks.onFrame = (delta) => {
    originalOnFrame?.(delta);
    const locked = document.pointerLockElement === world.canvas && !world.callbacks.isOverlayOpen?.();
    const forward = Number(world.keys?.has('KeyW')) - Number(world.keys?.has('KeyS'));
    const strafe = Number(world.keys?.has('KeyD')) - Number(world.keys?.has('KeyA'));
    const moving = locked && (forward !== 0 || strafe !== 0);
    const sprint = moving && (world.keys?.has('ShiftLeft') || world.keys?.has('ShiftRight'));
    const grounded = Boolean(world.player?.grounded);
    const reduced = Boolean(settings.reduceMotion);
    const bobScale = reduced ? 0 : clampSetting('headBob', settings.headBob) / 100;
    const fovScale = reduced ? 0 : clampSetting('sprintFovEffect', settings.sprintFovEffect) / 100;
    const defaultBob = moving && grounded ? Math.sin(world.player.walkPhase) * (sprint ? 0.035 : 0.022) : 0;
    const defaultSway = moving && grounded ? Math.cos(world.player.walkPhase * 0.5) * 0.009 : 0;

    world.camera.position.y = world.player.y + defaultBob * bobScale;
    world.camera.rotation.y = world.player.yaw + defaultSway * bobScale;

    const baseFov = clampSetting('fieldOfView', settings.fieldOfView);
    const targetFov = baseFov + (sprint ? 4.5 * fovScale : 0);
    const alpha = 1 - Math.exp(-10 * Math.max(0, Number(delta) || 0));
    world.camera.fov += (targetFov - world.camera.fov) * alpha;
    world.camera.updateProjectionMatrix();

    if (reduced && world.interactionMarker?.visible) world.interactionMarker.scale.setScalar(1);
  };

  document.addEventListener('mousemove', (event) => {
    if (!settings.invertY || document.pointerLockElement !== world.canvas) return;
    const sensitivity = Number(settings.mouseSensitivity || 0.0022);
    world.player.pitch = THREE.MathUtils.clamp(
      world.player.pitch + event.movementY * sensitivity * 2,
      -1.48,
      1.48,
    );
  });
}

function bind(runtime, settings) {
  const ui = controls();
  const persist = (reason) => runtime.persist?.(reason);
  const applyAll = () => {
    normalizeSettings(settings);
    renderControls(settings);
    applyAccessibility(settings);
    applyGraphics(runtime.world, settings);
  };

  ui.quality?.addEventListener('change', () => {
    settings.quality = ui.quality.value;
    applyAll();
    persist('Phase 7 描画品質設定');
  });

  const rangeBindings = {
    fieldOfView: 'FOV設定',
    headBob: 'Head Bob設定',
    sprintFovEffect: 'Sprint FOV設定',
    hudScale: 'HUD Scale設定',
    textScale: 'Text Size設定',
    crosshairScale: 'Crosshair設定',
    customRenderScale: 'Custom Render Scale設定',
  };
  for (const [key, reason] of Object.entries(rangeBindings)) {
    const input = ui[key];
    input?.addEventListener('input', () => {
      settings[key] = clampSetting(key, input.value);
      setOutput(input, settings[key]);
      applyAccessibility(settings);
      if (key === 'customRenderScale') applyGraphics(runtime.world, settings);
    });
    input?.addEventListener('change', () => persist(reason));
  }

  const checkBindings = {
    invertY: 'Y軸反転設定',
    reduceMotion: 'Reduce Motion設定',
    performanceMode: 'Performance Mode設定',
    customShadows: 'Custom Shadow設定',
    customAtmosphere: 'Custom Atmosphere設定',
  };
  for (const [key, reason] of Object.entries(checkBindings)) {
    ui[key]?.addEventListener('change', () => {
      settings[key] = Boolean(ui[key].checked);
      applyAccessibility(settings);
      if (['performanceMode', 'customShadows', 'customAtmosphere'].includes(key)) applyGraphics(runtime.world, settings);
      persist(reason);
    });
  }

  applyAll();
}

function initialize() {
  const runtime = window.__scrapFactoryRuntime;
  const game = runtime?.getGame?.();
  if (!runtime?.world || !game?.settings) return false;

  ensureStylesheet();
  ensureCustomQualityOption();
  ensureControls();
  const changed = normalizeSettings(game.settings);
  renderControls(game.settings);
  applyAccessibility(game.settings);
  applyGraphics(runtime.world, game.settings);
  patchCamera(runtime, game.settings);
  bind(runtime, game.settings);
  if (changed) runtime.persist?.('Phase 7 settings migration');
  return true;
}

if (!initialize()) {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (initialize() || attempts >= 80) window.clearInterval(timer);
  }, 50);
}
