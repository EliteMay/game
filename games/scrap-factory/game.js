import {
  BUILDINGS,
  BUILD_MENU_ORDER,
  GRID_SIZE,
  HAND_CRAFTS,
  ITEMS,
  RECIPES,
  TUTORIAL,
  itemCount,
  positionKey,
  usedSlots,
} from './config.js';
import { loadGameSave, saveGameSave, resetGameSave, exportSaveText } from './storage.js';
import { ScrapWorld } from './world.js';

const MAX_SLOTS = 12;
const TRANSPORT_INTERVAL = 0.65;
const AUTOSAVE_INTERVAL = 30;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const ui = {
  canvas: $('#game-canvas'),
  boot: $('#boot-screen'),
  bootStatus: $('#boot-status'),
  start: $('#start-game'),
  hud: $('#hud'),
  area: $('#area-label'),
  money: $('#money-value'),
  revenue: $('#revenue-value'),
  inventorySlots: $('#inventory-slots'),
  interact: $('#interaction-prompt'),
  tutorialTitle: $('#tutorial-title'),
  tutorialBody: $('#tutorial-body'),
  tutorialProgress: $('#tutorial-progress'),
  toastStack: $('#toast-stack'),
  buildHint: $('#build-hint'),
  buildModeName: $('#build-mode-name'),
  fps: $('#fps-counter'),
  pause: $('#pause-panel'),
  resume: $('#resume-game'),
  saveNow: $('#save-now'),
  openSettingsFromPause: $('#open-settings-pause'),
  openBuild: $('#open-build-menu'),
  buildPanel: $('#build-panel'),
  buildList: $('#build-list'),
  closeBuild: $('#close-build'),
  inventoryPanel: $('#inventory-panel'),
  inventoryGrid: $('#inventory-grid'),
  craftList: $('#craft-list'),
  closeInventory: $('#close-inventory'),
  machinePanel: $('#machine-panel'),
  machineTitle: $('#machine-title'),
  machineStatus: $('#machine-status'),
  machineInput: $('#machine-input'),
  machineOutput: $('#machine-output'),
  machineDeposit: $('#machine-deposit'),
  machineCollect: $('#machine-collect'),
  machineRemove: $('#machine-remove'),
  closeMachine: $('#close-machine'),
  settingsPanel: $('#settings-panel'),
  closeSettings: $('#close-settings'),
  settingSensitivity: $('#setting-sensitivity'),
  sensitivityValue: $('#sensitivity-value'),
  settingVolume: $('#setting-volume'),
  volumeValue: $('#volume-value'),
  settingQuality: $('#setting-quality'),
  settingFps: $('#setting-fps'),
  objectiveDone: $('#objective-done'),
  objectiveDoneClose: $('#objective-done-close'),
  resetButton: $('#reset-save'),
  exportButton: $('#export-save'),
};

let { root, game } = loadGameSave();
game.sessionCount += 1;
game.lastPlayedAt = new Date().toISOString();
let started = false;
let currentPanel = 'boot';
let selectedMachineId = null;
let transportAccumulator = 0;
let autosaveAccumulator = 0;
let unsavedPlaySeconds = 0;
let tutorialCheckAccumulator = 0;
let audio = null;
let beforeUnloadSaved = false;

function makeId(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const world = new ScrapWorld(ui.canvas, {
  getSensitivity: () => Number(game.settings.mouseSensitivity || 0.0022),
  isOverlayOpen: () => Boolean(currentPanel),
  onTargetChange: renderInteractionPrompt,
  onInteract: handleInteraction,
  onBuildPlace: handleBuildPlacement,
  onBuildInvalid: () => toast('ここには設置できません', 'warn'),
  onBuildModeChange: (type) => {
    ui.buildHint.hidden = !type;
    ui.buildModeName.textContent = type ? BUILDINGS[type]?.name ?? type : '';
  },
  onAreaChange: handleAreaChange,
  onPointerLockChange: handlePointerLockChange,
  onKeyDown: handleWorldKey,
  onFrame: update,
  onFps: (fps) => { ui.fps.textContent = `${fps} FPS`; },
});

world.setPlayerState(game.player);
world.loadBuildings(game.buildings);
world.setQuality(game.settings.quality);
world.run();

initializeUi();
renderAll();
setBootReady();
window.__scrapFactoryBooted = true;

function initializeUi() {
  ui.start.addEventListener('click', () => {
    started = true;
    currentPanel = null;
    ui.boot.hidden = true;
    ui.hud.hidden = false;
    ensureAudio();
    world.lockPointer();
    toast('探索開始。黄色いゲートの先でスクラップを集めよう。', 'info');
  });

  ui.resume.addEventListener('click', () => closePanelAndResume());
  ui.saveNow.addEventListener('click', () => {
    persist('手動保存');
    toast('セーブしました', 'success');
    closePanelAndResume();
  });
  ui.openSettingsFromPause.addEventListener('click', () => openPanel('settings'));
  ui.openBuild.addEventListener('click', () => openPanel('build'));
  ui.closeBuild.addEventListener('click', () => closePanelAndResume());
  ui.closeInventory.addEventListener('click', () => closePanelAndResume());
  ui.closeMachine.addEventListener('click', () => closePanelAndResume());
  ui.closeSettings.addEventListener('click', () => closePanelAndResume());
  ui.objectiveDoneClose.addEventListener('click', () => {
    ui.objectiveDone.hidden = true;
    currentPanel = null;
    world.lockPointer();
  });

  ui.machineDeposit.addEventListener('click', () => {
    const building = getBuilding(selectedMachineId);
    if (building) depositIntoBuilding(building);
  });
  ui.machineCollect.addEventListener('click', () => {
    const building = getBuilding(selectedMachineId);
    if (building) collectFromBuilding(building);
  });
  ui.machineRemove.addEventListener('click', () => {
    const building = getBuilding(selectedMachineId);
    if (!building || building.permanent) return;
    const refund = Math.floor((BUILDINGS[building.type]?.cost || 0) * 0.7);
    game.money += refund;
    game.buildings = game.buildings.filter((entry) => entry.id !== building.id);
    world.removeBuilding(building.id);
    toast(`${BUILDINGS[building.type]?.name ?? '設備'}を撤去 +$${refund}`, 'info');
    selectedMachineId = null;
    persist('設備撤去');
    renderAll();
    closePanelAndResume();
  });

  ui.settingSensitivity.addEventListener('input', () => {
    game.settings.mouseSensitivity = Number(ui.settingSensitivity.value);
    renderSettingsValues();
  });
  ui.settingSensitivity.addEventListener('change', () => persist('感度設定'));
  ui.settingVolume.addEventListener('input', () => {
    game.settings.masterVolume = Number(ui.settingVolume.value);
    updateAudioVolume();
    renderSettingsValues();
  });
  ui.settingVolume.addEventListener('change', () => persist('音量設定'));
  ui.settingQuality.addEventListener('change', () => {
    game.settings.quality = ui.settingQuality.value;
    world.setQuality(game.settings.quality);
    persist('画質設定');
  });
  ui.settingFps.addEventListener('change', () => {
    game.settings.showFps = ui.settingFps.checked;
    ui.fps.hidden = !game.settings.showFps;
    persist('FPS表示設定');
  });

  ui.resetButton.addEventListener('click', () => {
    const ok = window.confirm('Scrap Factoryのセーブを初期化します。元に戻せません。よろしいですか？');
    if (!ok) return;
    resetGameSave();
    window.location.reload();
  });

  ui.exportButton.addEventListener('click', () => {
    const blob = new Blob([exportSaveText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `game-hub-save-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast('セーブJSONを書き出しました', 'success');
  });

  window.addEventListener('beforeunload', () => {
    if (beforeUnloadSaved) return;
    beforeUnloadSaved = true;
    try { persist('ページ終了'); } catch { /* browser shutdown best effort */ }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && started) persist('バックグラウンド移行');
  });
}

function setBootReady() {
  ui.bootStatus.textContent = 'SYSTEM READY';
  ui.start.disabled = false;
}

function ensureAudio() {
  if (audio) {
    audio.context.resume?.();
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = Number(game.settings.masterVolume || 0.55);
  master.connect(context.destination);

  const humGain = context.createGain();
  humGain.gain.value = 0.018;
  humGain.connect(master);
  const humA = context.createOscillator();
  const humB = context.createOscillator();
  humA.type = 'sine';
  humB.type = 'triangle';
  humA.frequency.value = 47;
  humB.frequency.value = 71;
  humA.connect(humGain);
  humB.connect(humGain);
  humA.start();
  humB.start();
  audio = { context, master, humGain, humA, humB };
}

function updateAudioVolume() {
  if (!audio) return;
  audio.master.gain.setTargetAtTime(Number(game.settings.masterVolume || 0), audio.context.currentTime, 0.03);
}

function sound(kind = 'click') {
  ensureAudio();
  if (!audio) return;
  const oscillator = audio.context.createOscillator();
  const gain = audio.context.createGain();
  const now = audio.context.currentTime;
  const presets = {
    pickup: [620, 850, 0.07, 'triangle'],
    sell: [350, 760, 0.13, 'sine'],
    build: [180, 310, 0.11, 'square'],
    craft: [420, 640, 0.10, 'triangle'],
    error: [170, 120, 0.16, 'sawtooth'],
    click: [280, 320, 0.05, 'sine'],
  };
  const [from, to, duration, type] = presets[kind] || presets.click;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, to), now + duration);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(audio.master);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function handlePointerLockChange(locked) {
  if (!started) return;
  if (!locked && !currentPanel && !world.buildMode) openPanel('pause');
}

function handleWorldKey(code) {
  if (!started) return;
  if (code === 'KeyE' && !currentPanel && !world.buildMode) world.interact();
  if (code === 'KeyB' && !currentPanel) openPanel('build');
  if (code === 'Tab' && !currentPanel) openPanel('inventory');
}

function openPanel(name, data = null) {
  if (!started && name !== 'settings') return;
  world.unlockPointer();
  currentPanel = name;
  hidePanels();
  if (name === 'pause') ui.pause.hidden = false;
  if (name === 'build') {
    renderBuildMenu();
    ui.buildPanel.hidden = false;
  }
  if (name === 'inventory') {
    renderInventory();
    ui.inventoryPanel.hidden = false;
  }
  if (name === 'machine') {
    selectedMachineId = data?.id || selectedMachineId;
    renderMachinePanel();
    ui.machinePanel.hidden = false;
  }
  if (name === 'settings') {
    renderSettings();
    ui.settingsPanel.hidden = false;
  }
}

function hidePanels() {
  for (const panel of [ui.pause, ui.buildPanel, ui.inventoryPanel, ui.machinePanel, ui.settingsPanel]) panel.hidden = true;
}

function closePanelAndResume() {
  hidePanels();
  currentPanel = null;
  if (started) world.lockPointer();
}

function renderInteractionPrompt(entity) {
  if (!entity || currentPanel || world.buildMode) {
    ui.interact.hidden = true;
    return;
  }
  let label = '';
  if (entity.kind === 'scrap') label = `[E] ${ITEMS[entity.itemId]?.name ?? 'スクラップ'}を拾う`;
  if (entity.kind === 'building') {
    const building = getBuilding(entity.id);
    const name = BUILDINGS[entity.type]?.name ?? entity.type;
    if (entity.type === 'hopper') label = `[E] ${name}へ持ち物を投入`;
    else if (entity.type === 'seller') label = `[E] ${name}で持ち物を売却`;
    else if (entity.type === 'conveyor') label = `${name} — 自動搬送中`;
    else label = `[E] ${name}を開く${building?.progress > 0 ? ' — 稼働中' : ''}`;
  }
  ui.interact.textContent = label;
  ui.interact.hidden = !label;
}

function handleInteraction(entity) {
  if (entity.kind === 'scrap') {
    if (!canAddInventory(entity.itemId)) {
      toast('バックパックがいっぱいです', 'warn');
      sound('error');
      return;
    }
    const itemId = world.collectScrap(entity.id);
    if (!itemId) return;
    addInventory(itemId, 1);
    game.tutorialStats.collected += 1;
    if (!game.discoveredItems.includes(itemId)) game.discoveredItems.push(itemId);
    sound('pickup');
    toast(`${ITEMS[itemId].name} +1`, 'pickup');
    advanceTutorial();
    renderAll();
    return;
  }

  if (entity.kind !== 'building') return;
  const building = getBuilding(entity.id);
  if (!building) return;
  if (building.type === 'hopper') {
    const moved = depositPlayerInventoryToHopper(building);
    if (moved > 0) {
      toast(`${moved}個を投入ホッパーへ移動`, 'success');
      sound('click');
      persist('ホッパー投入');
    } else toast('投入できるアイテムがありません', 'info');
    renderAll();
    return;
  }
  if (building.type === 'seller') {
    const value = sellPlayerInventory();
    if (value > 0) {
      toast(`売却 +$${value}`, 'success');
      sound('sell');
      persist('直接売却');
    } else toast('売却できるアイテムがありません', 'info');
    advanceTutorial();
    renderAll();
    return;
  }
  if (building.type === 'conveyor') return;
  openPanel('machine', { id: building.id });
}

function handleAreaChange(area) {
  ui.area.textContent = area === 'scrapyard' ? 'SCRAP YARD' : 'FACTORY BASE';
  if (area === 'scrapyard') game.tutorialStats.movedToScrapyard = true;
  if (area === 'base' && game.tutorialStats.collected >= 5) game.tutorialStats.returned = true;
  advanceTutorial();
}

function canAddInventory(itemId, inventory = game.inventory) {
  const def = ITEMS[itemId];
  if (!def) return false;
  const current = Number(inventory[itemId] || 0);
  if (current > 0 && current % def.stack !== 0) return true;
  return usedSlots(inventory) < MAX_SLOTS;
}

function addInventory(itemId, amount = 1) {
  let added = 0;
  for (let i = 0; i < amount; i += 1) {
    if (!canAddInventory(itemId)) break;
    game.inventory[itemId] = Number(game.inventory[itemId] || 0) + 1;
    added += 1;
  }
  return added;
}

function removeInventory(itemId, amount = 1) {
  const current = Number(game.inventory[itemId] || 0);
  const removed = Math.min(current, Math.max(0, Math.floor(amount)));
  game.inventory[itemId] = current - removed;
  return removed;
}

function sellPlayerInventory() {
  let total = 0;
  for (const [itemId, amount] of Object.entries(game.inventory)) {
    if (!ITEMS[itemId] || amount <= 0) continue;
    total += ITEMS[itemId].value * amount;
    game.inventory[itemId] = 0;
  }
  if (total > 0) addRevenue(total);
  return total;
}

function addRevenue(value) {
  const amount = Math.max(0, Math.floor(value));
  game.money += amount;
  game.lifetimeRevenue += amount;
}

function depositPlayerInventoryToHopper(building) {
  building.output ??= {};
  let moved = 0;
  for (const [itemId, amount] of Object.entries(game.inventory)) {
    if (amount <= 0) continue;
    building.output[itemId] = Number(building.output[itemId] || 0) + amount;
    game.inventory[itemId] = 0;
    moved += amount;
  }
  return moved;
}

function getBuilding(id) {
  return game.buildings.find((building) => building.id === id) || null;
}

function handleBuildPlacement({ type, x, z, rotation }) {
  const def = BUILDINGS[type];
  if (!def?.buildable) return false;
  if (game.money < def.cost) {
    toast(`資金不足：${def.name} は $${def.cost}`, 'warn');
    sound('error');
    return false;
  }
  game.money -= def.cost;
  const building = {
    id: makeId(type),
    type,
    x,
    z,
    rotation,
    input: {},
    output: {},
    progress: 0,
    permanent: false,
  };
  game.buildings.push(building);
  world.addBuilding(building);
  sound('build');
  toast(`${def.name}を設置 -$${def.cost}`, 'success');
  game.tutorialStats.automationComplete = detectAutomationComplete();
  advanceTutorial();
  persist('設備設置');
  renderAll();
  return true;
}

function renderBuildMenu() {
  ui.buildList.replaceChildren();
  for (const type of BUILD_MENU_ORDER) {
    const def = BUILDINGS[type];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'build-option';
    button.disabled = game.money < def.cost;
    button.innerHTML = `
      <span class="build-option__main"><strong>${def.name}</strong><small>${def.description}</small></span>
      <span class="build-option__cost">$${def.cost}</span>
    `;
    button.addEventListener('click', () => {
      currentPanel = null;
      hidePanels();
      world.startBuild(type);
    });
    ui.buildList.append(button);
  }
}

function depositIntoBuilding(building) {
  const def = BUILDINGS[building.type];
  const accepts = def?.accepts || [];
  let moved = 0;
  building.input ??= {};
  building.output ??= {};
  for (const [itemId, amount] of Object.entries(game.inventory)) {
    if (amount <= 0 || !acceptsItem(building, itemId)) continue;
    const destination = building.type === 'storage' ? building.output : building.input;
    destination[itemId] = Number(destination[itemId] || 0) + amount;
    game.inventory[itemId] = 0;
    moved += amount;
  }
  if (moved > 0) {
    toast(`${def.name}へ ${moved}個投入`, 'success');
    sound('click');
    persist('設備投入');
  } else {
    toast(accepts.length ? '対応する素材を持っていません' : '投入できません', 'info');
  }
  renderMachinePanel();
  renderAll();
}

function collectFromBuilding(building) {
  building.output ??= {};
  let moved = 0;
  for (const [itemId, amount] of Object.entries(building.output)) {
    let remaining = Number(amount || 0);
    while (remaining > 0 && canAddInventory(itemId)) {
      addInventory(itemId, 1);
      remaining -= 1;
      moved += 1;
    }
    building.output[itemId] = remaining;
  }
  if (moved > 0) {
    toast(`出力を ${moved}個回収`, 'success');
    sound('pickup');
    persist('設備出力回収');
  } else toast('回収できる出力がありません', 'info');
  renderMachinePanel();
  renderAll();
}

function acceptsItem(building, itemId) {
  const def = BUILDINGS[building.type];
  if (!def) return false;
  const item = ITEMS[itemId];
  return (def.accepts || []).includes(itemId) || (item && (def.accepts || []).includes(item.category));
}

function bufferText(buffer) {
  const entries = Object.entries(buffer || {}).filter(([, amount]) => Number(amount) > 0);
  if (!entries.length) return '空';
  return entries.map(([itemId, amount]) => `${ITEMS[itemId]?.name ?? itemId} × ${amount}`).join(' / ');
}

function renderMachinePanel() {
  const building = getBuilding(selectedMachineId);
  if (!building) return;
  const def = BUILDINGS[building.type];
  ui.machineTitle.textContent = def.name;
  const recipe = def.recipe ? RECIPES[def.recipe] : null;
  ui.machineStatus.textContent = recipe
    ? `${building.progress > 0 ? '稼働中' : '待機中'} / ${recipe.seconds.toFixed(1)}秒サイクル`
    : building.type === 'storage' ? '中間バッファ' : '設備';
  ui.machineInput.textContent = bufferText(building.input);
  ui.machineOutput.textContent = bufferText(building.output);
  ui.machineDeposit.textContent = building.type === 'storage' ? '持ち物を保管' : '対応素材を投入';
  ui.machineDeposit.disabled = !Object.entries(game.inventory).some(([itemId, amount]) => amount > 0 && acceptsItem(building, itemId));
  ui.machineCollect.disabled = !Object.values(building.output || {}).some((amount) => amount > 0);
  ui.machineRemove.hidden = Boolean(building.permanent);
  if (!building.permanent) ui.machineRemove.textContent = `撤去 +$${Math.floor((def.cost || 0) * 0.7)}`;
}

function processMachines(delta) {
  for (const building of game.buildings) {
    const def = BUILDINGS[building.type];
    const recipe = def?.recipe ? RECIPES[def.recipe] : null;
    if (!recipe) {
      world.updateBuildingState(building.id, { active: false, progress: 0 });
      continue;
    }
    building.input ??= {};
    building.output ??= {};
    const ready = Object.entries(recipe.input).every(([itemId, amount]) => Number(building.input[itemId] || 0) >= amount);
    if (!ready) {
      building.progress = 0;
      world.updateBuildingState(building.id, { active: false, progress: 0 });
      continue;
    }
    building.progress = Number(building.progress || 0) + delta;
    world.updateBuildingState(building.id, { active: true, progress: building.progress / recipe.seconds });
    if (building.progress < recipe.seconds) continue;
    building.progress = 0;
    for (const [itemId, amount] of Object.entries(recipe.input)) building.input[itemId] -= amount;
    for (const [itemId, amount] of Object.entries(recipe.output)) {
      building.output[itemId] = Number(building.output[itemId] || 0) + amount;
      if (!game.discoveredItems.includes(itemId)) game.discoveredItems.push(itemId);
    }
    if (building.type === 'crusher') game.tutorialStats.processed += 1;
    sound('craft');
    advanceTutorial();
    if (selectedMachineId === building.id && currentPanel === 'machine') renderMachinePanel();
  }
}

function gridNeighbors(key) {
  const [gx, gz] = key.split(',').map(Number);
  return [
    `${gx + 1},${gz}`,
    `${gx - 1},${gz}`,
    `${gx},${gz + 1}`,
    `${gx},${gz - 1}`,
  ];
}

function buildGridIndex() {
  const byCell = new Map();
  for (const building of game.buildings) byCell.set(positionKey(building.x, building.z), building);
  return byCell;
}

function findRoute(source, itemId, specificTargetId = null) {
  const byCell = buildGridIndex();
  const sourceKey = positionKey(source.x, source.z);
  const queue = [];
  const visited = new Set();
  const parent = new Map();

  for (const neighbor of gridNeighbors(sourceKey)) {
    const entry = byCell.get(neighbor);
    if (entry?.type === 'conveyor') {
      queue.push(neighbor);
      visited.add(neighbor);
      parent.set(neighbor, null);
    }
  }

  while (queue.length) {
    const cell = queue.shift();
    for (const neighbor of gridNeighbors(cell)) {
      const entry = byCell.get(neighbor);
      if (entry && entry.id !== source.id && entry.type !== 'conveyor') {
        const matchesSpecific = !specificTargetId || entry.id === specificTargetId;
        if (matchesSpecific && (specificTargetId || acceptsItem(entry, itemId))) {
          const conveyorPath = [];
          let cursor = cell;
          while (cursor) {
            conveyorPath.push(cursor);
            cursor = parent.get(cursor) || null;
          }
          conveyorPath.reverse();
          return {
            target: entry,
            path: [
              { x: source.x, z: source.z },
              ...conveyorPath.map((key) => {
                const [gx, gz] = key.split(',').map(Number);
                return { x: gx * GRID_SIZE, z: gz * GRID_SIZE };
              }),
              { x: entry.x, z: entry.z },
            ],
          };
        }
      }
      if (entry?.type === 'conveyor' && !visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, cell);
        queue.push(neighbor);
      }
    }
  }
  return null;
}

function hasConveyorPath(source, target) {
  return Boolean(findRoute(source, 'metal_scrap', target.id));
}

function detectAutomationComplete() {
  const hopper = game.buildings.find((b) => b.type === 'hopper');
  const crushers = game.buildings.filter((b) => b.type === 'crusher');
  const sellers = game.buildings.filter((b) => b.type === 'seller');
  if (!hopper || !crushers.length || !sellers.length) return false;
  return crushers.some((crusher) => hasConveyorPath(hopper, crusher) && sellers.some((seller) => hasConveyorPath(crusher, seller)));
}

function transportTick() {
  for (const source of game.buildings) {
    source.output ??= {};
    const itemEntry = Object.entries(source.output).find(([, amount]) => Number(amount) > 0);
    if (!itemEntry) continue;
    const [itemId] = itemEntry;
    const route = findRoute(source, itemId);
    if (!route) continue;
    const target = route.target;
    source.output[itemId] -= 1;
    if (target.type === 'seller') {
      addRevenue(ITEMS[itemId]?.value || 0);
      sound('sell');
    } else if (target.type === 'storage') {
      target.output ??= {};
      target.output[itemId] = Number(target.output[itemId] || 0) + 1;
    } else {
      target.input ??= {};
      target.input[itemId] = Number(target.input[itemId] || 0) + 1;
    }
    world.animateTransfer(route.path, itemId);
  }
  game.tutorialStats.automationComplete ||= detectAutomationComplete();
  advanceTutorial();
  renderHud();
  if (currentPanel === 'machine') renderMachinePanel();
}

function tutorialSatisfied(step) {
  switch (step) {
    case 0: return Boolean(game.tutorialStats.movedToScrapyard);
    case 1: return game.tutorialStats.collected >= 5;
    case 2: return Boolean(game.tutorialStats.returned);
    case 3: return game.lifetimeRevenue >= 80;
    case 4: return game.buildings.some((b) => b.type === 'crusher' && !b.permanent);
    case 5: return game.tutorialStats.processed >= 1;
    case 6: return Boolean(game.tutorialStats.automationComplete);
    case 7: return game.lifetimeRevenue >= 250;
    default: return false;
  }
}

function advanceTutorial() {
  let advanced = false;
  while (game.tutorialStep < TUTORIAL.length && tutorialSatisfied(game.tutorialStep)) {
    game.tutorialStep += 1;
    advanced = true;
    if (game.tutorialStep < TUTORIAL.length) {
      toast(`次の目標：${TUTORIAL[game.tutorialStep].title}`, 'objective');
    }
  }
  if (advanced) {
    persist('目標進行');
    if (game.tutorialStep >= TUTORIAL.length && ui.objectiveDone.hidden) {
      world.unlockPointer();
      currentPanel = 'objective';
      ui.objectiveDone.hidden = false;
      sound('sell');
    }
  }
  renderTutorial();
}

function tutorialProgressValue(step) {
  switch (step) {
    case 0: return game.tutorialStats.movedToScrapyard ? 1 : 0;
    case 1: return Math.min(5, game.tutorialStats.collected);
    case 2: return game.tutorialStats.returned ? 1 : 0;
    case 3: return Math.min(80, game.lifetimeRevenue);
    case 4: return game.buildings.filter((b) => b.type === 'crusher' && !b.permanent).length;
    case 5: return Math.min(1, game.tutorialStats.processed);
    case 6: return game.tutorialStats.automationComplete ? 1 : 0;
    case 7: return Math.min(250, game.lifetimeRevenue);
    default: return 0;
  }
}

function renderTutorial() {
  if (game.tutorialStep >= TUTORIAL.length) {
    ui.tutorialTitle.textContent = '工場オーナー — 自由開発';
    ui.tutorialBody.textContent = '初期目標達成。探索・自動化・製品クラフトを自由に伸ばせます。';
    ui.tutorialProgress.textContent = 'MVP CLEAR';
    return;
  }
  const goal = TUTORIAL[game.tutorialStep];
  ui.tutorialTitle.textContent = goal.title;
  ui.tutorialBody.textContent = goal.body;
  ui.tutorialProgress.textContent = `${tutorialProgressValue(game.tutorialStep)} / ${goal.target}`;
}

function renderHud() {
  ui.money.textContent = `$${Math.floor(game.money).toLocaleString('ja-JP')}`;
  ui.revenue.textContent = `$${Math.floor(game.lifetimeRevenue).toLocaleString('ja-JP')}`;
  ui.inventorySlots.textContent = `${usedSlots(game.inventory)} / ${MAX_SLOTS}`;
  ui.fps.hidden = !game.settings.showFps;
}

function renderInventory() {
  ui.inventoryGrid.replaceChildren();
  const ordered = Object.values(ITEMS);
  for (const item of ordered) {
    const amount = Number(game.inventory[item.id] || 0);
    const row = document.createElement('div');
    row.className = `inventory-row${amount === 0 ? ' is-empty' : ''}`;
    row.innerHTML = `
      <span class="inventory-row__swatch" style="--item-color:#${item.color.toString(16).padStart(6, '0')}"></span>
      <span class="inventory-row__name">${item.name}<small>$${item.value}/個</small></span>
      <strong>× ${amount}</strong>
    `;
    ui.inventoryGrid.append(row);
  }

  ui.craftList.replaceChildren();
  for (const craft of Object.values(HAND_CRAFTS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'craft-option';
    const requirements = Object.entries(craft.input).map(([itemId, amount]) => `${ITEMS[itemId]?.short ?? itemId}×${amount}`).join(' + ');
    button.innerHTML = `<span><strong>${craft.name}</strong><small>${requirements}</small></span><span>作る</span>`;
    button.disabled = !canCraft(craft);
    button.addEventListener('click', () => craftItem(craft));
    ui.craftList.append(button);
  }
}

function canCraft(craft) {
  const enough = Object.entries(craft.input).every(([itemId, amount]) => Number(game.inventory[itemId] || 0) >= amount);
  if (!enough) return false;
  const simulated = { ...game.inventory };
  for (const [itemId, amount] of Object.entries(craft.input)) simulated[itemId] -= amount;
  for (const [itemId, amount] of Object.entries(craft.output)) {
    for (let i = 0; i < amount; i += 1) {
      const def = ITEMS[itemId];
      const current = Number(simulated[itemId] || 0);
      const needsSlot = current === 0 || current % def.stack === 0;
      if (needsSlot && usedSlots(simulated) >= MAX_SLOTS) return false;
      simulated[itemId] = current + 1;
    }
  }
  return true;
}

function craftItem(craft) {
  if (!canCraft(craft)) return;
  for (const [itemId, amount] of Object.entries(craft.input)) removeInventory(itemId, amount);
  for (const [itemId, amount] of Object.entries(craft.output)) addInventory(itemId, amount);
  sound('craft');
  toast(`${craft.name}を作成`, 'success');
  persist('手動クラフト');
  renderInventory();
  renderAll();
}

function renderSettings() {
  ui.settingSensitivity.value = String(game.settings.mouseSensitivity);
  ui.settingVolume.value = String(game.settings.masterVolume);
  ui.settingQuality.value = game.settings.quality;
  ui.settingFps.checked = Boolean(game.settings.showFps);
  renderSettingsValues();
}

function renderSettingsValues() {
  ui.sensitivityValue.textContent = Number(game.settings.mouseSensitivity).toFixed(4);
  ui.volumeValue.textContent = `${Math.round(Number(game.settings.masterVolume) * 100)}%`;
}

function renderAll() {
  renderHud();
  renderTutorial();
  if (currentPanel === 'build') renderBuildMenu();
  if (currentPanel === 'inventory') renderInventory();
  if (currentPanel === 'machine') renderMachinePanel();
}

function toast(message, tone = 'info') {
  const item = document.createElement('div');
  item.className = `toast toast--${tone}`;
  item.textContent = message;
  ui.toastStack.append(item);
  requestAnimationFrame(() => item.classList.add('is-visible'));
  window.setTimeout(() => {
    item.classList.remove('is-visible');
    window.setTimeout(() => item.remove(), 220);
  }, 2300);
}

function persist(reason = 'autosave') {
  game.player = world.getPlayerState();
  if (unsavedPlaySeconds > 0) {
    const whole = Math.floor(unsavedPlaySeconds);
    if (whole > 0) {
      game.playTimeSeconds = Number(game.playTimeSeconds || 0) + whole;
      root.profile.totalPlayTimeSeconds = Number(root.profile.totalPlayTimeSeconds || 0) + whole;
      unsavedPlaySeconds -= whole;
    }
  }
  game.lastPlayedAt = new Date().toISOString();
  try {
    root = saveGameSave(root, game);
    console.debug(`[save] ${reason}`);
  } catch (error) {
    console.error('Save failed', error);
    toast('セーブに失敗しました。ブラウザの保存容量を確認してください。', 'warn');
  }
}

function update(delta) {
  processMachines(delta);
  if (!started) return;
  unsavedPlaySeconds += delta;
  autosaveAccumulator += delta;
  transportAccumulator += delta;
  tutorialCheckAccumulator += delta;

  if (transportAccumulator >= TRANSPORT_INTERVAL) {
    transportAccumulator %= TRANSPORT_INTERVAL;
    transportTick();
  }
  if (autosaveAccumulator >= AUTOSAVE_INTERVAL) {
    autosaveAccumulator = 0;
    persist('オートセーブ');
  }
  if (tutorialCheckAccumulator >= 0.4) {
    tutorialCheckAccumulator = 0;
    advanceTutorial();
  }
}
