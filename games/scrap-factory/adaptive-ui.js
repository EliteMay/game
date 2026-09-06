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
const PRIMARY_COMMAND_KEYS = new Set(['B', 'Tab', 'O']);

const state = {
  prepared: false,
  area: null,
  areaBannerUntil: 0,
  managementOpen: false,
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

function classifyCommand(control) {
  const key = control.querySelector('kbd')?.textContent?.trim();
  if (!key) return;
  control.dataset.commandKey = key;
  control.classList.toggle('hud-key--secondary', !PRIMARY_COMMAND_KEYS.has(key));
}

function setManagementOpen(open) {
  state.managementOpen = Boolean(open);
  const toggle = document.querySelector('[data-hud-management-toggle]');
  const tray = document.querySelector('[data-hud-management-tray]');
  if (toggle) toggle.setAttribute('aria-expanded', String(state.managementOpen));
  if (tray) tray.hidden = !state.managementOpen;
}

function createHudContextStack() {
  const hud = document.querySelector('#hud');
  if (!hud) return null;

  let stack = hud.querySelector('[data-hud-context-stack]');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'hud-context-stack';
    stack.dataset.hudContextStack = 'true';
    hud.append(stack);
  }

  const objective = document.querySelector('.objective-panel');
  if (objective && objective.parentElement !== stack) stack.prepend(objective);

  let management = stack.querySelector('[data-hud-management]');
  if (!management) {
    management = document.createElement('div');
    management.className = 'hud-management';
    management.dataset.hudManagement = 'true';
    management.innerHTML = `
      <button class="hud-management__toggle" type="button" data-hud-management-toggle aria-expanded="false" aria-controls="hud-management-tray">
        <span>MANAGEMENT（管理）</span>
        <strong data-management-alert hidden>0</strong>
      </button>
      <div id="hud-management-tray" class="hud-management__tray" data-hud-management-tray hidden></div>
    `;
    stack.append(management);
    management.querySelector('[data-hud-management-toggle]')?.addEventListener('click', () => {
      setManagementOpen(!state.managementOpen);
    });
    management.querySelector('[data-hud-management-tray]')?.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('button')) setManagementOpen(false);
    });
  }

  return stack;
}

function moveContextHudNodes(stack) {
  if (!stack) return;
  const management = stack.querySelector('[data-hud-management]');
  const tray = stack.querySelector('[data-hud-management-tray]');
  if (!management || !tray) return;

  // Optional/player-requested status stays visible in normal document flow so
  // bilingual copy can grow without colliding with the primary objective.
  ['#factory-challenge-pin', '#final-phase-hud'].forEach((selector) => {
    const node = document.querySelector(selector);
    if (node && node.parentElement !== stack) stack.insertBefore(node, management);
  });

  // Rank / Factory / Automation are reference actions. Keep them one click
  // away instead of consuming three permanent HUD surfaces.
  ['#progression-hud', '#factory-management-hud', '#automation-hud'].forEach((selector) => {
    const node = document.querySelector(selector);
    if (node && node.parentElement !== tray) tray.append(node);
  });

  const factoryAlert = document.querySelector('#factory-alert-count');
  const combinedAlert = management.querySelector('[data-management-alert]');
  if (combinedAlert) {
    const count = Math.max(0, Number(factoryAlert?.textContent || 0));
    combinedAlert.textContent = String(count);
    combinedAlert.hidden = count <= 0 || factoryAlert?.hidden === true;
  }

  const hasActions = tray.querySelector('button');
  management.hidden = !hasActions;
  if (!hasActions) setManagementOpen(false);
}

function ensureHudComposition() {
  const stack = createHudContextStack();
  moveContextHudNodes(stack);
  return stack;
}

function prepareHud() {
  ensureStylesheet();

  statContainer('#money-value', 'hud-stat--cash');
  statContainer('#revenue-value', 'hud-stat--revenue');
  statContainer('#inventory-slots', 'hud-stat--capacity');

  document.querySelectorAll('.hud__bottom-left .hud-key').forEach(classifyCommand);

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

  ensureHudComposition();
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

  rail.querySelectorAll('.hud-key').forEach(classifyCommand);
  const contextualMode = Boolean(world?.buildMode) || document.body.classList.contains('is-dismantling');
  rail.hidden = currentGame.settings?.showShortcuts === false || contextualMode;
}

function updateContextualHud(currentGame) {
  const exploring = state.area !== 'base';
  const progression = document.querySelector('#progression-hud');
  const finalPhase = document.querySelector('#final-phase-hud');
  const management = document.querySelector('[data-hud-management]');

  if (progression) progression.hidden = exploring;
  if (finalPhase) finalPhase.hidden = exploring || Number(currentGame?.progression?.progressionRank || 1) < 7;
  if (management) management.hidden = exploring || !management.querySelector('[data-hud-management-tray] button');
  if (exploring) setManagementOpen(false);
}

function update() {
  if (!state.prepared) prepareHud();
  const currentRuntime = runtime();
  const currentGame = game();
  if (!currentRuntime || !currentGame) return;

  ensureHudComposition();
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
