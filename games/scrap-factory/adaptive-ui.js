import {
  BASE_LIMIT,
  BUILDINGS,
  BUILD_MENU_ORDER,
  GRID_SIZE,
  HAND_CRAFTS,
  ITEMS,
  RECIPES,
  positionKey,
  usedSlots,
} from './config.js';
import { backpackSlotCapacity, homeTutorialObjective } from './home-system.js';

const STYLE_HREF = './adaptive-ui.css';
const BASE_BACKPACK_SLOTS = 12;
const AREA_BANNER_MS = 2200;
const OBJECTIVE_EXPAND_MS = 2600;
const UPDATE_MS = 180;
const CAPACITY_WARN_RATIO = 0.75;

const state = {
  prepared: false,
  area: null,
  areaBannerUntil: 0,
  managementOpen: false,
  objectiveSignature: null,
  objectiveExpandedUntil: 0,
  inventorySelectedItem: null,
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

  ['#factory-challenge-pin', '#final-phase-hud'].forEach((selector) => {
    const node = document.querySelector(selector);
    if (node && node.parentElement !== stack) stack.insertBefore(node, management);
  });

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

function categoryLabel(category) {
  const labels = {
    production: 'PRODUCTION / 生産',
    logistics: 'LOGISTICS / 物流',
    power: 'POWER / 電力',
    automation: 'AUTOMATION / 自動化',
    storage: 'STORAGE / 保管',
  };
  return labels[String(category || '').toLowerCase()] || `${String(category || 'OTHER').toUpperCase()} / 設備`;
}

function prepareBuildHint() {
  const buildHint = document.querySelector('#build-hint');
  if (!buildHint) return;

  if (!buildHint.querySelector('[data-adaptive-build-context]')) {
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

  if (!buildHint.querySelector('[data-adaptive-build-quick]')) {
    const quick = document.createElement('div');
    quick.className = 'adaptive-build-quick';
    quick.dataset.adaptiveBuildQuick = 'true';
    BUILD_MENU_ORDER.slice(0, 5).forEach((type, index) => {
      const item = document.createElement('span');
      const key = document.createElement('kbd');
      key.textContent = String(index + 1);
      item.append(key, document.createTextNode(BUILDINGS[type]?.name || type));
      quick.append(item);
    });
    const controlsText = buildHint.querySelector('small:last-child');
    if (controlsText) buildHint.insertBefore(quick, controlsText);
    else buildHint.append(quick);
  }
}

function prepareHud() {
  ensureStylesheet();

  statContainer('#money-value', 'hud-stat--cash');
  statContainer('#revenue-value', 'hud-stat--revenue');
  statContainer('#inventory-slots', 'hud-stat--capacity');

  const objectiveHeader = document.querySelector('.objective-panel__header span');
  if (objectiveHeader) objectiveHeader.textContent = 'MAIN GOAL';

  const setting = document.querySelector('#setting-shortcuts')?.closest('.setting-row');
  if (setting) {
    const title = setting.querySelector('strong');
    const note = setting.querySelector('small');
    if (title) title.textContent = '状況別操作ヒント';
    if (note) note.textContent = '建築・解体中だけ必要な操作を表示。通常時のキー一覧は表示しません';
  }

  prepareBuildHint();
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

  if (cash) cash.hidden = true;
  if (revenue) revenue.hidden = true;
  if (capacity) {
    capacity.hidden = ratio < CAPACITY_WARN_RATIO;
    capacity.classList.toggle('is-near-full', ratio >= 0.9);
  }

  const visible = [...strip.children].some((child) => !child.hidden);
  strip.hidden = !visible;
}

function updateCommandHints(currentGame, world) {
  const rail = document.querySelector('.hud__bottom-left');
  const shortcutBar = document.querySelector('#shortcut-bar');
  if (rail) rail.hidden = true;
  if (shortcutBar) shortcutBar.hidden = true;

  const showHints = currentGame?.settings?.showShortcuts !== false;
  const buildHint = document.querySelector('#build-hint');
  const dismantleHint = document.querySelector('#dismantle-hint');
  if (buildHint) buildHint.hidden = !world?.buildMode || !showHints;
  if (dismantleHint) dismantleHint.hidden = !document.body.classList.contains('is-dismantling') || !showHints;
}

function updateObjective(currentGame) {
  const objective = document.querySelector('.objective-panel');
  const title = document.querySelector('#tutorial-title');
  const body = document.querySelector('#tutorial-body');
  const progress = document.querySelector('#tutorial-progress');
  if (!objective || !title || !body || !progress) return;

  const goal = homeTutorialObjective(currentGame);
  const signature = `${goal.kind}|${goal.title}|${goal.body}|${goal.progress}`;
  if (signature !== state.objectiveSignature) {
    state.objectiveSignature = signature;
    state.objectiveExpandedUntil = performance.now() + OBJECTIVE_EXPAND_MS;
  }

  title.textContent = goal.title;
  body.textContent = goal.body;
  progress.textContent = goal.progress;
  objective.classList.toggle('is-updated', performance.now() < state.objectiveExpandedUntil);
}

function canAddInventoryItem(currentGame, itemId) {
  const definition = ITEMS[itemId];
  if (!definition) return false;
  const inventory = currentGame?.inventory || {};
  const current = Number(inventory[itemId] || 0);
  if (current > 0 && current % definition.stack !== 0) return true;
  const max = backpackSlotCapacity(currentGame, BASE_BACKPACK_SLOTS);
  return usedSlots(inventory) < max;
}

function parsePrompt(source, currentGame) {
  const blockedPermanent = source.match(/^(.+?)\s+—\s+固定設備のため撤去不可$/);
  if (blockedPermanent) {
    return {
      target: blockedPermanent[1],
      key: null,
      action: '撤去不可',
      status: '固定設備',
      blocked: true,
    };
  }

  const keyMatch = source.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (!keyMatch) return { target: source, key: null, action: '', status: '', blocked: false };

  const key = keyMatch[1] === '左クリック' ? 'LMB' : keyMatch[1];
  let rest = keyMatch[2];
  let status = '';
  if (rest.includes(' — ')) {
    const parts = rest.split(' — ');
    rest = parts.shift();
    status = parts.join(' — ');
  }

  let target = rest;
  let action = '';
  let extra = '';
  const patterns = [
    [/^(.+?)へ持ち物を投入$/, '投入'],
    [/^(.+?)で持ち物を売却$/, '売却'],
    [/^(.+?)を設定$/, '設定'],
    [/^(.+?)を開く$/, '開く'],
    [/^(.+?)を拾う$/, '拾う'],
    [/^(.+?)を撤去\s*\/\s*(.+)$/, '撤去'],
  ];

  for (const [pattern, nextAction] of patterns) {
    const match = rest.match(pattern);
    if (!match) continue;
    target = match[1];
    action = nextAction;
    extra = match[2] || '';
    break;
  }

  if (extra) status = status || extra;

  if (action === '拾う') {
    const item = Object.values(ITEMS).find((entry) => entry.name === target || entry.short === target);
    if (item && !canAddInventoryItem(currentGame, item.id)) {
      status = 'BACKPACK FULL / 空きSlotが必要';
      return { target, key, action, status, blocked: true };
    }
  }

  return { target, key, action: action || rest, status, blocked: false };
}

function updateInteractionPrompt(currentGame) {
  const prompt = document.querySelector('#interaction-prompt');
  if (!prompt || prompt.hidden) return;

  const currentText = prompt.textContent?.trim() || '';
  if (!currentText) return;
  if (prompt.dataset.adaptiveRendered === 'true' && currentText === prompt.dataset.adaptiveRenderedText) return;

  const parsed = parsePrompt(currentText, currentGame);
  const target = document.createElement('strong');
  target.className = 'interaction-prompt__target';
  target.textContent = parsed.target;

  const action = document.createElement('span');
  action.className = 'interaction-prompt__action';
  if (parsed.key) {
    const key = document.createElement('kbd');
    key.textContent = parsed.key;
    action.append(key);
  }
  if (parsed.action) action.append(document.createTextNode(parsed.action));

  prompt.replaceChildren(target, action);
  if (parsed.status) {
    const status = document.createElement('small');
    status.className = 'interaction-prompt__status';
    status.textContent = parsed.status;
    prompt.append(status);
  }

  prompt.classList.toggle('is-blocked', parsed.blocked);
  prompt.dataset.adaptiveRendered = 'true';
  prompt.dataset.adaptiveRenderedText = prompt.textContent?.trim() || '';
}

function buildInventorySlots(currentGame) {
  const slots = [];
  for (const item of Object.values(ITEMS)) {
    let remaining = Math.max(0, Number(currentGame?.inventory?.[item.id] || 0));
    while (remaining > 0) {
      const amount = Math.min(remaining, Math.max(1, Number(item.stack || 1)));
      slots.push({ item, amount });
      remaining -= amount;
    }
  }
  return slots;
}

function updateInventoryDetail(currentGame, section, slots) {
  let detail = section.querySelector('[data-adaptive-inventory-detail]');
  if (!detail) {
    detail = document.createElement('div');
    detail.className = 'adaptive-inventory-detail';
    detail.dataset.adaptiveInventoryDetail = 'true';
    section.append(detail);
  }

  const selectedId = state.inventorySelectedItem && Number(currentGame?.inventory?.[state.inventorySelectedItem] || 0) > 0
    ? state.inventorySelectedItem
    : slots[0]?.item?.id || null;
  state.inventorySelectedItem = selectedId;

  if (!selectedId) {
    detail.innerHTML = '<span>ITEM DETAIL</span><strong>バッグは空です</strong><small>探索で回収したアイテムがここに表示されます。</small>';
    return;
  }

  const item = ITEMS[selectedId];
  const total = Number(currentGame.inventory?.[selectedId] || 0);
  detail.innerHTML = `
    <span>ITEM DETAIL</span>
    <strong>${item.name}</strong>
    <small>所持 ${total} / 1 Slot ${item.stack} / 売値 $${item.value} / 個</small>
  `;
}

function renderInventorySlots(currentGame) {
  const panel = document.querySelector('#inventory-panel');
  const grid = document.querySelector('#inventory-grid');
  if (!panel || panel.hidden || !grid) return;

  const max = backpackSlotCapacity(currentGame, BASE_BACKPACK_SLOTS);
  const used = usedSlots(currentGame.inventory || {});
  const signature = `${max}|${Object.entries(currentGame.inventory || {}).map(([id, amount]) => `${id}:${amount}`).join('|')}`;
  const needsRender = grid.dataset.adaptiveSlots !== 'true'
    || grid.dataset.inventorySignature !== signature
    || Boolean(grid.querySelector('.inventory-row'));

  const headerKicker = panel.querySelector('.panel-header .panel-kicker');
  if (headerKicker) headerKicker.textContent = 'BACKPACK / HAND CRAFT';

  let summary = panel.querySelector('[data-adaptive-inventory-summary]');
  if (!summary) {
    summary = document.createElement('div');
    summary.className = 'adaptive-inventory-summary';
    summary.dataset.adaptiveInventorySummary = 'true';
    summary.innerHTML = `
      <div><span>BACKPACK</span><strong data-inventory-capacity></strong></div>
      <div><span>CASH</span><strong data-inventory-cash></strong></div>
    `;
    panel.querySelector('.panel-header')?.insertAdjacentElement('afterend', summary);
  }
  summary.querySelector('[data-inventory-capacity]').textContent = `${used} / ${max} SLOTS`;
  summary.querySelector('[data-inventory-cash]').textContent = `$${Math.floor(Number(currentGame.money || 0)).toLocaleString('ja-JP')}`;
  summary.classList.toggle('is-near-full', max > 0 && used / max >= 0.9);

  const slots = buildInventorySlots(currentGame);
  const section = grid.closest('section');
  if (!section) return;

  if (needsRender) {
    grid.replaceChildren();
    for (let index = 0; index < max; index += 1) {
      const slot = slots[index];
      if (!slot) {
        const empty = document.createElement('div');
        empty.className = 'inventory-slot is-empty';
        empty.setAttribute('aria-label', `空きスロット ${index + 1}`);
        empty.innerHTML = `<span class="inventory-slot__index">${String(index + 1).padStart(2, '0')}</span><small>EMPTY</small>`;
        grid.append(empty);
        continue;
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'inventory-slot';
      button.dataset.itemId = slot.item.id;
      button.setAttribute('aria-pressed', String(state.inventorySelectedItem === slot.item.id));
      button.innerHTML = `
        <span class="inventory-slot__index">${String(index + 1).padStart(2, '0')}</span>
        <i style="--item-color:#${slot.item.color.toString(16).padStart(6, '0')}"></i>
        <strong>${slot.item.short || slot.item.name}</strong>
        <b>×${slot.amount}</b>
      `;
      button.addEventListener('click', () => {
        state.inventorySelectedItem = slot.item.id;
        grid.querySelectorAll('.inventory-slot[aria-pressed]').forEach((node) => {
          node.setAttribute('aria-pressed', String(node === button));
        });
        updateInventoryDetail(currentGame, section, slots);
      });
      grid.append(button);
    }
    grid.dataset.adaptiveSlots = 'true';
    grid.dataset.inventorySignature = signature;
  }

  updateInventoryDetail(currentGame, section, slots);
}

function decorateCraftList(currentGame) {
  const panel = document.querySelector('#inventory-panel');
  const craftList = document.querySelector('#craft-list');
  if (!panel || panel.hidden || !craftList) return;

  const crafts = Object.values(HAND_CRAFTS);
  [...craftList.querySelectorAll('.craft-option')].forEach((button, index) => {
    const craft = crafts[index];
    if (!craft) return;
    button.dataset.craftId = craft.id;

    let stateLabel = button.querySelector('.adaptive-craft-state');
    if (!stateLabel) {
      stateLabel = document.createElement('small');
      stateLabel.className = 'adaptive-craft-state';
      button.querySelector('span:first-child')?.append(stateLabel);
    }

    const missing = Object.entries(craft.input || {})
      .filter(([itemId, amount]) => Number(currentGame.inventory?.[itemId] || 0) < amount)
      .map(([itemId, amount]) => `${itemLabel(itemId)} ${Number(currentGame.inventory?.[itemId] || 0)} / ${amount}`);

    if (!button.disabled) {
      stateLabel.textContent = '作成可能';
      stateLabel.classList.remove('is-blocked');
    } else if (missing.length) {
      stateLabel.textContent = `不足: ${missing.join(' / ')}`;
      stateLabel.classList.add('is-blocked');
    } else {
      stateLabel.textContent = '空きSlotまたは解放条件を確認';
      stateLabel.classList.add('is-blocked');
    }
  });
}

function decorateBuildMenu() {
  const panel = document.querySelector('#build-panel');
  const list = document.querySelector('#build-list');
  if (!panel || panel.hidden || !list) return;

  const buttons = [...list.querySelectorAll(':scope > .build-option')];
  if (!buttons.length || list.querySelector('[data-adaptive-build-category]')) return;

  let previousCategory = null;
  buttons.forEach((button, index) => {
    const type = BUILD_MENU_ORDER[index];
    const definition = BUILDINGS[type];
    if (!type || !definition) return;
    button.dataset.buildType = type;
    button.dataset.buildCategory = definition.category || 'other';

    const category = definition.category || 'other';
    if (category !== previousCategory) {
      const heading = document.createElement('div');
      heading.className = 'build-category-heading';
      heading.dataset.adaptiveBuildCategory = category;
      heading.textContent = categoryLabel(category);
      list.insertBefore(heading, button);
      previousCategory = category;
    }
  });
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
  updateCommandHints(currentGame, currentRuntime.world);
  updateObjective(currentGame);
  updateInteractionPrompt(currentGame);
  renderInventorySlots(currentGame);
  decorateCraftList(currentGame);
  decorateBuildMenu();
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