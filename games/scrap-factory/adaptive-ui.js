import {
  BASE_LIMIT,
  BUILDINGS,
  GRID_SIZE,
  ITEMS,
  RECIPES,
  positionKey,
  usedSlots,
} from './config.js';
import { backpackSlotCapacity } from './home-system.js';

const STYLE_HREF = './adaptive-ui.css';
const BASE_BACKPACK_SLOTS = 12;
const AREA_BANNER_MS = 2200;
const UPDATE_MS = 180;

const state = {
  prepared: false,
  area: null,
  areaBannerUntil: 0,
};

function runtime() {
  return window.__scrapFactoryRuntime || null;
}

function game() {
  return runtime()?.getGame?.() || null;
}

function ensureStylesheet() {
  if (document.querySelector('link[data-adaptive-ui]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  link.dataset.adaptiveUi = 'true';
  document.head.append(link);
}

function statContainer(selector, className) {
  const node = document.querySelector(selector)?.closest('.economy-strip > div');
  if (node) node.classList.add('hud-stat', className);
  return node;
}

function prepareHud() {
  ensureStylesheet();

  statContainer('#money-value', 'hud-stat--cash');
  statContainer('#revenue-value', 'hud-stat--revenue');
  statContainer('#inventory-slots', 'hud-stat--capacity');

  const controls = document.querySelectorAll('.hud__bottom-left .hud-key');
  controls.forEach((control) => {
    const key = control.querySelector('kbd')?.textContent?.trim();
    if (!key) return;
    control.dataset.commandKey = key;
    if (key === 'F' || key === 'Esc') control.classList.add('hud-key--secondary');
  });

  const setting = document.querySelector('#setting-shortcuts')?.closest('.setting-row');
  if (setting) {
    const title = setting.querySelector('strong');
    const note = setting.querySelector('small');
    if (title) title.textContent = '通常HUDの主要コマンド';
    if (note) note.textContent = 'B / Tab / Oだけ常時表示。建築・解体中は状況別の操作へ切り替え';
  }

  const buildHint = document.querySelector('#build-hint');
  if (buildHint && !buildHint.querySelector('[data-adaptive-build-context]')) {
    const context = document.createElement('div');
    context.className = 'adaptive-build-context';
    context.dataset.adaptiveBuildContext = 'true';
    context.innerHTML = `
      <div><span>COST</span><strong data-build-cost>—</strong></div>
      <div><span>GRID</span><strong data-build-grid>${GRID_SIZE}m SNAP</strong></div>
      <div class="adaptive-build-context__flow"><span>FLOW</span><strong data-build-flow>—</strong></div>
      <div data-build-status-wrap><span>STATUS</span><strong data-build-status>—</strong></div>
    `;
    const controlsText = buildHint.querySelector('small:last-child');
    if (controlsText) buildHint.insertBefore(context, controlsText);
    else buildHint.append(context);
  }

  state.prepared = true;
}

function itemLabel(itemId) {
  return ITEMS[itemId]?.short || ITEMS[itemId]?.name || itemId;
}

function recipeFlow(type) {
  const definition = BUILDINGS[type];
  const recipe = RECIPES[definition?.recipe];
  if (!recipe) return null;
  const inputs = Object.entries(recipe.input || {})
    .map(([itemId, amount]) => `${itemLabel(itemId)}×${amount}`)
    .join(' + ');
  const outputs = Object.entries(recipe.output || {})
    .map(([itemId, amount]) => `${itemLabel(itemId)}×${amount}`)
    .join(' + ');
  return `${inputs || '自動供給'} → ${outputs || 'OUTPUT'}`;
}

function flowSummary(type) {
  const recipe = recipeFlow(type);
  if (recipe) return recipe;

  if (['conveyor', 'conveyor_mk2', 'conveyor_mk3'].includes(type)) return '背面 IN → 前方 OUT';
  if (type === 'splitter') return '背面 1 IN → 前 / 左 / 右 OUT';
  if (type === 'merger') return '背 / 左 / 右 IN → 前方 1 OUT';
  if (type === 'smart_sorter') return '背面 IN → 種類別 3 OUT';
  if (type === 'priority_splitter') return '背面 IN → 優先 / 予備 OUT';
  if (type === 'overflow_splitter') return '背面 IN → 通常 / Overflow OUT';
  if (type === 'seller') return 'ITEM IN → CASH';
  if (type?.includes('storage') || type === 'storage') return 'ITEM BUFFER / 搬入・搬出';
  if (type?.includes('generator') || type === 'battery' || type === 'experimental_power_system') return 'POWER NETWORK';
  if (type?.includes('drone_port')) return 'RESOURCE POINT → FACTORY';
  return BUILDINGS[type]?.category?.toUpperCase() || 'FACTORY EQUIPMENT';
}

function previewReason(world) {
  if (!world?.buildMode || !world?.buildPreview) return { valid: false, label: '位置を選択' };
  if (world.canPlacePreview) return { valid: true, label: '設置可能' };

  const type = world.buildMode;
  const x = Number(world.buildPreview.position?.x || 0);
  const z = Number(world.buildPreview.position?.z || 0);
  if (Math.abs(x) > BASE_LIMIT || Math.abs(z) > BASE_LIMIT) return { valid: false, label: '建築エリア外' };
  if (world.occupied?.has?.(positionKey(x, z))) return { valid: false, label: 'グリッド使用済み' };

  const half = type === 'conveyor' ? 0.5 : 0.92;
  const staticHit = (world.staticColliders || []).some((box) => (
    x + half > box.minX
    && x - half < box.maxX
    && z + half > box.minZ
    && z - half < box.maxZ
  ));
  if (staticHit) return { valid: false, label: '固定物と干渉' };

  if (Math.hypot(x - Number(world.player?.x || 0), z - Number(world.player?.z || 0)) <= 1.8) {
    return { valid: false, label: 'プレイヤーに近すぎる' };
  }

  return { valid: false, label: '位置を調整' };
}

function updateBuildContext() {
  const world = runtime()?.world;
  const context = document.querySelector('[data-adaptive-build-context]');
  if (!context) return;

  const type = world?.buildMode;
  const definition = type ? BUILDINGS[type] : null;
  const status = previewReason(world);
  const cost = context.querySelector('[data-build-cost]');
  const flow = context.querySelector('[data-build-flow]');
  const statusText = context.querySelector('[data-build-status]');
  const statusWrap = context.querySelector('[data-build-status-wrap]');

  if (cost) cost.textContent = definition ? `$${Number(definition.cost || 0).toLocaleString('ja-JP')}` : '—';
  if (flow) flow.textContent = type ? flowSummary(type) : '—';
  if (statusText) statusText.textContent = status.label;
  if (statusWrap) statusWrap.classList.toggle('is-valid', status.valid);
  if (statusWrap) statusWrap.classList.toggle('is-invalid', Boolean(type) && !status.valid);
}

function updateArea(world) {
  const nextArea = world?.currentArea || 'base';
  if (nextArea !== state.area) {
    state.area = nextArea;
    state.areaBannerUntil = performance.now() + AREA_BANNER_MS;
  }
  document.body.dataset.hudArea = nextArea;

  const areaPlate = document.querySelector('.area-plate');
  if (areaPlate) areaPlate.hidden = performance.now() > state.areaBannerUntil;
}

function updateEconomy(currentGame) {
  const cash = document.querySelector('.hud-stat--cash');
  const revenue = document.querySelector('.hud-stat--revenue');
  const capacity = document.querySelector('.hud-stat--capacity');
  const strip = document.querySelector('.economy-strip');
  if (!currentGame || !strip) return;

  const used = usedSlots(currentGame.inventory || {});
  const max = backpackSlotCapacity(currentGame, BASE_BACKPACK_SLOTS);
  const ratio = max > 0 ? used / max : 0;
  const exploring = state.area !== 'base';

  if (revenue) revenue.hidden = true;
  if (cash) cash.hidden = exploring;
  if (capacity) {
    capacity.hidden = !exploring && ratio < 0.75;
    capacity.classList.toggle('is-near-full', ratio >= 0.9);
  }

  const visible = [...strip.children].some((child) => !child.hidden);
  strip.hidden = !visible;
}

function updateCommandRail(currentGame, world) {
  const rail = document.querySelector('.hud__bottom-left');
  const shortcutBar = document.querySelector('#shortcut-bar');
  if (shortcutBar) shortcutBar.hidden = true;
  if (!rail || !currentGame) return;

  const contextualMode = Boolean(world?.buildMode) || document.body.classList.contains('is-dismantling');
  rail.hidden = currentGame.settings?.showShortcuts === false || contextualMode;
}

function updateContextualHud(currentGame) {
  const exploring = state.area !== 'base';
  const progression = document.querySelector('#progression-hud');
  const finalPhase = document.querySelector('#final-phase-hud');
  if (progression) progression.hidden = exploring;
  if (finalPhase) finalPhase.hidden = exploring || Number(currentGame?.progression?.progressionRank || 1) < 7;
}

function update() {
  if (!state.prepared) prepareHud();
  const currentRuntime = runtime();
  const currentGame = game();
  if (!currentRuntime || !currentGame) return;

  updateArea(currentRuntime.world);
  updateEconomy(currentGame);
  updateCommandRail(currentGame, currentRuntime.world);
  updateContextualHud(currentGame);
  updateBuildContext();
}

function boot() {
  if (!window.__scrapFactoryBooted || !runtime()?.world || !game()) {
    window.setTimeout(boot, 120);
    return;
  }
  prepareHud();
  update();
  window.setInterval(update, UPDATE_MS);
}

boot();
