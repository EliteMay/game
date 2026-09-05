import {
  BUILDINGS,
  BUILD_MENU_ORDER,
  HAND_CRAFTS,
  ITEMS,
  RECIPES,
  TUTORIAL,
  usedSlots,
} from './config.js';
import {
  directionFromRotation,
  findDirectionalRoute,
  findDirectionalRoutes,
  isLogisticsNode,
  logisticsThroughput,
  reverseRotation,
  rotateQuarter,
  selectDirectionalRoute,
} from './logistics.js';
import {
  RESEARCH,
  buildingUnlockState,
  isBuildingUnlocked,
  isHandCraftUnlocked,
  requiredBuildingRank,
} from './progression.js';
import {
  GENERATOR_FUEL_SECONDS,
  buildingPowerStorageCapacity,
  computePowerSnapshot,
  generatorActive,
  isBuildingPowered,
  powerEnabled,
  powerReason,
  powerSummary,
  tickGeneratorFuel,
  tickPowerStorage,
} from './power.js';
import {
  isStorageBuilding,
  storageAmount,
  storageCapacity,
  storageFillRatio,
  storageRemaining,
  storageTransferAmount,
} from './storage-capacity.js';
import { loadGameSave, saveGameSave, resetGameSave, exportSaveText } from './storage.js';
import { ScrapWorld } from './world.js';
import {
  advanceHomeTutorial,
  backpackSlotCapacity,
  hasPlayerUpgrade,
  homeTutorialObjective,
  recordTutorialEvent,
} from './home-system.js';

const BASE_MAX_SLOTS = 12;
function maxSlots() { return backpackSlotCapacity(game, BASE_MAX_SLOTS); }
const AUTOSAVE_INTERVAL = 30;
const $ = (selector) => document.querySelector(selector);

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
  buildDirection: $('#build-direction'),
  dismantleHint: $('#dismantle-hint'),
  shortcutBar: $('#shortcut-bar'),
  fps: $('#fps-counter'),
  pause: $('#pause-panel'),
  resume: $('#resume-game'),
  saveNow: $('#save-now'),
  openSettingsFromPause: $('#open-settings-pause'),
  openGuidePause: $('#open-guide-pause'),
  openGuideHud: $('#open-guide-hud'),
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
  machineDescription: $('#machine-description'),
  machineFlow: $('#machine-flow'),
  machineStatus: $('#machine-status'),
  machineBuffers: $('#machine-buffers'),
  machineInput: $('#machine-input'),
  machineOutput: $('#machine-output'),
  machineDeposit: $('#machine-deposit'),
  machineCollect: $('#machine-collect'),
  machineRotate: $('#machine-rotate'),
  machineReverse: $('#machine-reverse'),
  machineRemove: $('#machine-remove'),
  closeMachine: $('#close-machine'),
  guidePanel: $('#guide-panel'),
  closeGuide: $('#close-guide'),
  settingsPanel: $('#settings-panel'),
  closeSettings: $('#close-settings'),
  settingSensitivity: $('#setting-sensitivity'),
  sensitivityValue: $('#sensitivity-value'),
  settingVolume: $('#setting-volume'),
  volumeValue: $('#volume-value'),
  settingQuality: $('#setting-quality'),
  settingShortcuts: $('#setting-shortcuts'),
  settingFps: $('#setting-fps'),
  objectiveDone: $('#objective-done'),
  objectiveDoneClose: $('#objective-done-close'),
  resetButton: $('#reset-save'),
  exportButton: $('#export-save'),
};

let { root, game } = loadGameSave();
game.sessionCount += 1;
game.lastPlayedAt = new Date().toISOString();
let powerSnapshot = computePowerSnapshot(game);
let previousPowerStatus = powerSnapshot.status;
let started = false;
let currentPanel = 'boot';
let selectedMachineId = null;
let dismantleMode = false;
let autosaveAccumulator = 0;
let unsavedPlaySeconds = 0;
let tutorialCheckAccumulator = 0;
let audio = null;
let beforeUnloadSaved = false;
const transportCredits = new Map();

function makeId(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const world = new ScrapWorld(ui.canvas, {
  getSensitivity: () => Number(game.settings.mouseSensitivity || 0.0022),
  getSprintMultiplier: () => hasPlayerUpgrade(game, 'sprint_efficiency') ? 1.08 : 1,
  isOverlayOpen: () => Boolean(currentPanel),
  onTargetChange: renderInteractionPrompt,
  onInteract: handleInteraction,
  onBuildPlace: handleBuildPlacement,
  onBuildInvalid: () => toast('ここには設置できません', 'warn'),
  onBuildModeChange: (type) => {
    ui.buildHint.hidden = !type;
    ui.buildModeName.textContent = type ? BUILDINGS[type]?.name ?? type : '';
    ui.shortcutBar.hidden = Boolean(type) || dismantleMode || game.settings.showShortcuts === false;
  },
  onBuildPreview: ({ type, rotation }) => renderBuildDirection(type, rotation),
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

window.__scrapFactoryRuntime = { world, getGame: () => game, persist, renderAll, toast, getPowerSnapshot: () => powerSnapshot };

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
    toast('探索開始。黄色いゲートの先でスクラップを集めよう。Oでガイド。', 'info');
    if (powerEnabled(game)) toast(powerSummary(powerSnapshot), powerSnapshot.status === 'shortage' ? 'warn' : 'info');
  });

  ui.resume.addEventListener('click', closePanelAndResume);
  ui.saveNow.addEventListener('click', () => {
    persist('手動保存');
    toast('セーブしました', 'success');
    closePanelAndResume();
  });
  ui.openSettingsFromPause.addEventListener('click', () => openPanel('settings'));
  ui.openGuidePause.addEventListener('click', () => openPanel('guide'));
  ui.openGuideHud.addEventListener('click', () => openPanel('guide'));
  ui.openBuild.addEventListener('click', () => { recordTutorialEvent(game, 'buildMenuOpened', true); advanceTutorial(); openPanel('build'); });
  ui.closeBuild.addEventListener('click', closePanelAndResume);
  ui.closeInventory.addEventListener('click', closePanelAndResume);
  ui.closeMachine.addEventListener('click', closePanelAndResume);
  ui.closeGuide.addEventListener('click', closePanelAndResume);
  ui.closeSettings.addEventListener('click', closePanelAndResume);
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
  ui.machineRotate.addEventListener('click', () => rotateSelectedLogistics(false));
  ui.machineReverse.addEventListener('click', () => rotateSelectedLogistics(true));
  ui.machineRemove.addEventListener('click', () => {
    const building = getBuilding(selectedMachineId);
    if (building) removeBuildingSafely(building, { resumeAfter: true });
  });

  ui.canvas.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || !dismantleMode || currentPanel || world.buildMode) return;
    if (document.pointerLockElement !== ui.canvas) return;
    dismantleCurrentTarget();
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
  ui.settingShortcuts.addEventListener('change', () => {
    game.settings.showShortcuts = ui.settingShortcuts.checked;
    renderHud();
    persist('操作表示設定');
  });
  ui.settingFps.addEventListener('change', () => {
    game.settings.showFps = ui.settingFps.checked;
    renderHud();
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
  master.gain.value = Number(game.settings.masterVolume ?? 0.55);
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
    dismantle: [260, 110, 0.12, 'square'],
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
  if (code === 'KeyO' && !currentPanel && !world.buildMode) {
    openPanel('guide');
    return;
  }
  if (code === 'KeyF' && !currentPanel && !world.buildMode) {
    setDismantleMode(!dismantleMode);
    return;
  }
  if (code === 'KeyE' && !currentPanel && !world.buildMode && !dismantleMode) world.interact();
  if (code === 'KeyB' && !currentPanel && !dismantleMode) { recordTutorialEvent(game, 'buildMenuOpened', true); advanceTutorial(); openPanel('build'); }
  if (code === 'Tab' && !currentPanel && !dismantleMode) { recordTutorialEvent(game, 'inventoryOpened', true); advanceTutorial(); openPanel('inventory'); }
}

function setDismantleMode(enabled) {
  dismantleMode = Boolean(enabled);
  document.body.classList.toggle('is-dismantling', dismantleMode);
  ui.dismantleHint.hidden = !dismantleMode;
  ui.shortcutBar.hidden = dismantleMode || game.settings.showShortcuts === false;
  if (dismantleMode) toast('解体モード：設備を狙って左クリック。Fで終了。', 'info');
  renderInteractionPrompt(world.currentTarget);
}

function openPanel(name, data = null) {
  if (!started && name !== 'settings') return;
  if (dismantleMode) setDismantleMode(false);
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
  if (name === 'guide') ui.guidePanel.hidden = false;
  if (name === 'settings') {
    renderSettings();
    ui.settingsPanel.hidden = false;
  }
}

function hidePanels() {
  for (const panel of [ui.pause, ui.buildPanel, ui.inventoryPanel, ui.machinePanel, ui.guidePanel, ui.settingsPanel]) panel.hidden = true;
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
  if (dismantleMode) {
    if (entity.kind === 'building') {
      const building = getBuilding(entity.id);
      const name = BUILDINGS[entity.type]?.name ?? entity.type;
      label = building?.permanent ? `${name} — 固定設備のため撤去不可` : `[左クリック] ${name}を撤去 / 建築費100%返金`;
    }
  } else if (entity.kind === 'scrap') {
    label = `[E] ${ITEMS[entity.itemId]?.name ?? 'スクラップ'}を拾う`;
  } else if (entity.kind === 'building') {
    const building = getBuilding(entity.id);
    const name = BUILDINGS[entity.type]?.name ?? entity.type;
    if (entity.type === 'hopper') label = `[E] ${name}へ持ち物を投入`;
    else if (entity.type === 'seller') label = `[E] ${name}で持ち物を売却`;
    else if (isLogisticsNode(entity.type)) {
      const d = directionFromRotation(building?.rotation);
      label = `[E] ${name}を設定 — 基準方向 ${d.name} ${d.symbol}`;
    } else label = `[E] ${name}を開く${building?.progress > 0 ? ' — 稼働中' : ''}`;
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
      recordTutorialEvent(game, 'hopperDeposit', true);
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
      recordTutorialEvent(game, 'manualSale', true);
      toast(`売却 +${value}`, 'success');
      sound('sell');
      persist('直接売却');
    } else toast('売却できるアイテムがありません', 'info');
    advanceTutorial();
    renderAll();
    return;
  }
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
  return usedSlots(inventory) < maxSlots();
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

function unlockMessage(type) {
  const def = BUILDINGS[type];
  const state = buildingUnlockState(game, type);
  if (state.reason === 'research') {
    const research = RESEARCH[state.requiredResearch];
    return `${def.name}は「${research?.name || state.requiredResearch}」研究で解放されます`;
  }
  return `${def.name}は Rank ${state.requiredRank || requiredBuildingRank(type)} で解放されます`;
}

function handleBuildPlacement({ type, x, z, rotation }) {
  const def = BUILDINGS[type];
  if (!def?.buildable) return false;
  if (!isBuildingUnlocked(game, type)) {
    toast(unlockMessage(type), 'warn');
    sound('error');
    return false;
  }
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
    powerFuelSeconds: 0,
    powerStored: 0,
    logisticsCursor: 0,
    permanent: false,
  };
  game.buildings.push(building);
  powerSnapshot = computePowerSnapshot(game);
  previousPowerStatus = powerSnapshot.status;
  world.addBuilding(building);
  sound('build');
  const d = directionFromRotation(rotation);
  toast(`${def.name}を設置 -$${def.cost}${isLogisticsNode(type) ? ` / 基準方向 ${d.name} ${d.symbol}` : ''}`, 'success');
  game.tutorialStats.automationComplete = detectAutomationComplete();
  advanceTutorial();
  persist('設備設置');
  renderAll();
  return true;
}

function renderBuildDirection(type, rotation) {
  if (!ui.buildDirection) return;
  const d = directionFromRotation(rotation);
  if (type === 'splitter') ui.buildDirection.textContent = `入力: 背面 / 出力基準: ${d.name} ${d.symbol} + 左右`;
  else if (type === 'merger') ui.buildDirection.textContent = `入力: 背面 + 左右 / 出力: ${d.name} ${d.symbol}`;
  else if (isLogisticsNode(type)) ui.buildDirection.textContent = `搬送方向: ${d.name} ${d.symbol}（黄色い矢印）`;
  else ui.buildDirection.textContent = `設置向き: ${d.name} ${d.symbol}`;
}

function renderBuildMenu() {
  ui.buildList.replaceChildren();
  for (const type of BUILD_MENU_ORDER) {
    const def = BUILDINGS[type];
    const unlock = buildingUnlockState(game, type);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'build-option';
    button.disabled = !unlock.unlocked || game.money < def.cost;
    const extra = isLogisticsNode(type) ? `帯域 ${logisticsThroughput(type).toFixed(1)}個/秒。設置後もEで向きを変更可能。` : '';
    const lockText = unlock.reason === 'research' ? 'RESEARCH' : `RANK ${unlock.requiredRank}`;
    button.innerHTML = `
      <span class="build-option__main"><strong>${def.name}</strong><small>${def.description}${extra ? `<br>${extra}` : ''}</small></span>
      <span class="build-option__cost">${unlock.unlocked ? `$${def.cost}` : lockText}</span>
    `;
    button.addEventListener('click', () => {
      if (!isBuildingUnlocked(game, type)) return;
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
    const destination = isStorageBuilding(building) ? building.output : building.input;
    const moveAmount = isStorageBuilding(building) ? storageTransferAmount(building, amount) : amount;
    if (moveAmount <= 0) continue;
    destination[itemId] = Number(destination[itemId] || 0) + moveAmount;
    game.inventory[itemId] -= moveAmount;
    moved += moveAmount;
  }
  if (moved > 0) {
    toast(`${def.name}へ ${moved}個投入`, 'success');
    sound('click');
    persist('設備投入');
  } else if (isStorageBuilding(building) && storageRemaining(building) <= 0) toast(`${def.name}は満杯です`, 'warn');
  else toast(accepts.length ? '対応する素材を持っていません' : '投入できません', 'info');
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

function canReceiveItem(building, itemId) {
  if (!acceptsItem(building, itemId)) return false;
  if (isStorageBuilding(building)) return storageRemaining(building) > 0;
  return true;
}

function bufferText(buffer) {
  const entries = Object.entries(buffer || {}).filter(([, amount]) => Number(amount) > 0);
  if (!entries.length) return '空';
  return entries.map(([itemId, amount]) => `${ITEMS[itemId]?.name ?? itemId} × ${amount}`).join(' / ');
}

function recipeFlowHtml(recipe) {
  if (!recipe) return '';
  const input = Object.entries(recipe.input).map(([id, n]) => `${ITEMS[id]?.name ?? id} ×${n}`).join(' + ');
  const output = Object.entries(recipe.output).map(([id, n]) => `${ITEMS[id]?.name ?? id} ×${n}`).join(' + ');
  return `<span>${input}</span><span class="flow-arrow">→</span><strong>${output}</strong><span>${recipe.seconds.toFixed(1)}秒</span>`;
}

function renderMachinePanel() {
  const building = getBuilding(selectedMachineId);
  if (!building) return;
  const def = BUILDINGS[building.type];
  const recipe = def.recipe ? RECIPES[def.recipe] : null;
  const logisticsNode = isLogisticsNode(building.type);
  const isGenerator = Number(def.powerGeneration || 0) > 0;
  const isPowerPole = building.type === 'power_pole';
  const isBattery = buildingPowerStorageCapacity(building) > 0;
  const storageBuilding = isStorageBuilding(building);
  const powered = isBuildingPowered(game, building, powerSnapshot);
  const reason = powerReason(building, powerSnapshot);
  const d = directionFromRotation(building.rotation);

  ui.machineTitle.textContent = def.name;
  ui.machineDescription.textContent = def.description;
  if (logisticsNode) {
    if (building.type === 'splitter') {
      ui.machineFlow.innerHTML = `<span>背面 1 INPUT</span><span class="flow-arrow">→</span><strong>${d.name} + 左 + 右</strong><span>3 OUTPUT</span>`;
      ui.machineStatus.textContent = `有効な搬送先へRound-robin分配 / 最大 ${logisticsThroughput(building.type).toFixed(1)}個/秒`;
    } else if (building.type === 'merger') {
      ui.machineFlow.innerHTML = `<span>背面 + 左 + 右</span><span class="flow-arrow">→</span><strong>${d.name} ${d.symbol}</strong><span>1 OUTPUT</span>`;
      ui.machineStatus.textContent = `3方向の入力を合流 / 最大 ${logisticsThroughput(building.type).toFixed(1)}個/秒`;
    } else {
      ui.machineFlow.innerHTML = `<span>現在の搬送方向</span><strong>${d.name} ${d.symbol}</strong><span>${logisticsThroughput(building.type).toFixed(1)}個/秒</span>`;
      ui.machineStatus.textContent = '黄色い矢印方向へ搬送。Route上で最も遅い物流設備が実効帯域になります。';
    }
  } else if (isGenerator) {
    ui.machineFlow.innerHTML = `<span>鉄くず ×1</span><span class="flow-arrow">→</span><strong>${def.powerGeneration} Power</strong><span>${GENERATOR_FUEL_SECONDS}秒</span>`;
    ui.machineStatus.textContent = generatorActive(building)
      ? `発電中 / 燃料残り ${Math.ceil(Number(building.powerFuelSeconds || 0))}秒 / ${powerSummary(powerSnapshot)}`
      : `燃料待ち / 鉄くずを投入すると自動始動 / ${powerSummary(powerSnapshot)}`;
  } else if (isPowerPole) {
    const connected = powerSnapshot.connectedPoleIds?.has(building.id);
    ui.machineFlow.innerHTML = '<span>POWER GRID</span><span class="flow-arrow">→</span><strong>10m給電範囲</strong>';
    ui.machineStatus.textContent = connected
      ? `電力網へ接続済み / ${powerSummary(powerSnapshot)}`
      : '未接続 / Starter Grid・Generator・接続済みPoleから12.5m以内へ設置してください';
  } else if (isBattery) {
    const capacity = buildingPowerStorageCapacity(building);
    const stored = Math.min(capacity, Math.max(0, Number(building.powerStored || 0)));
    const connected = powerSnapshot.connectedBatteryIds?.has(building.id);
    ui.machineFlow.innerHTML = `<span>余剰電力</span><span class="flow-arrow">→</span><strong>${Math.floor(stored)} / ${capacity}</strong><span class="flow-arrow">→</span><span>不足時 最大${def.powerDischargeRate} Power</span>`;
    ui.machineStatus.textContent = connected
      ? `Grid接続済み / 充電上限 ${def.powerChargeRate} Power / ${powerSummary(powerSnapshot)}`
      : '未接続 / Starter Gridまたは接続済みPower Poleの給電範囲へ設置してください';
  } else if (recipe) {
    ui.machineFlow.innerHTML = recipeFlowHtml(recipe);
    if (powerEnabled(game) && !powered) {
      ui.machineStatus.textContent = reason === 'coverage'
        ? `POWER STOP / 給電範囲外 / ${def.powerUse || 0} Power必要`
        : `POWER STOP / 発電不足 / ${def.powerUse || 0} Power必要`;
    } else {
      const powerNote = powerEnabled(game) && Number(def.powerUse || 0) > 0 ? ` / ${def.powerUse} Power` : '';
      ui.machineStatus.textContent = `${building.progress > 0 ? '稼働中' : '待機中'} / ${recipe.seconds.toFixed(1)}秒サイクル${powerNote}`;
    }
  } else if (storageBuilding) {
    const used = storageAmount(building);
    const capacity = storageCapacity(building);
    ui.machineFlow.innerHTML = `<span>受取</span><span class="flow-arrow">→</span><strong>${used} / ${capacity}</strong><span class="flow-arrow">→</span><span>次のライン</span>`;
    ui.machineStatus.textContent = storageRemaining(building) > 0
      ? `Storage ${Math.round(storageFillRatio(building) * 100)}% / 残り ${storageRemaining(building)}個`
      : 'STORAGE FULL / 上流搬送を停止してItem消失を防止';
  } else {
    ui.machineFlow.textContent = '設備';
    ui.machineStatus.textContent = '設備';
  }

  ui.machineBuffers.hidden = logisticsNode || isPowerPole || isBattery;
  ui.machineInput.textContent = bufferText(building.input);
  ui.machineOutput.textContent = bufferText(building.output);
  ui.machineDeposit.hidden = logisticsNode || isPowerPole || isBattery || !(def.accepts || []).length;
  ui.machineCollect.hidden = logisticsNode || isPowerPole || isGenerator || isBattery;
  ui.machineRotate.hidden = !logisticsNode;
  ui.machineReverse.hidden = !logisticsNode;
  ui.machineDeposit.textContent = storageBuilding ? '持ち物を保管' : isGenerator ? '鉄くずを燃料投入' : '対応素材を投入';
  ui.machineDeposit.disabled = storageBuilding && storageRemaining(building) <= 0
    ? true
    : !Object.entries(game.inventory).some(([itemId, amount]) => amount > 0 && acceptsItem(building, itemId));
  ui.machineCollect.disabled = !Object.values(building.output || {}).some((amount) => amount > 0);
  ui.machineRemove.hidden = Boolean(building.permanent);
  if (!building.permanent) ui.machineRemove.textContent = `撤去 +$${def.cost || 0}（100%返金）`;
}

function rotateSelectedLogistics(reverse = false) {
  const building = getBuilding(selectedMachineId);
  if (!building || !isLogisticsNode(building.type)) return;
  building.rotation = reverse ? reverseRotation(building.rotation) : rotateQuarter(building.rotation);
  building.logisticsCursor = 0;
  world.setBuildingRotation?.(building.id, building.rotation);
  const d = directionFromRotation(building.rotation);
  game.tutorialStats.automationComplete = detectAutomationComplete();
  persist(reverse ? '物流設備反転' : '物流設備回転');
  sound('click');
  toast(`${BUILDINGS[building.type]?.name || '物流設備'}：基準方向 ${d.name} ${d.symbol}`, 'success');
  renderMachinePanel();
  renderInteractionPrompt(world.currentTarget);
}

function combinedBuildingContents(building) {
  const contents = {};
  for (const buffer of [building.input, building.output]) {
    for (const [itemId, amount] of Object.entries(buffer || {})) {
      if (!ITEMS[itemId] || Number(amount) <= 0) continue;
      contents[itemId] = Number(contents[itemId] || 0) + Number(amount);
    }
  }
  return contents;
}

function inventoryCanFit(contents) {
  const simulated = { ...game.inventory };
  for (const [itemId, amount] of Object.entries(contents)) {
    for (let i = 0; i < amount; i += 1) {
      if (!canAddInventory(itemId, simulated)) return false;
      simulated[itemId] = Number(simulated[itemId] || 0) + 1;
    }
  }
  return true;
}

function removeBuildingSafely(building, { resumeAfter = false } = {}) {
  if (!building || building.permanent) {
    toast('この設備は固定設備のため撤去できません', 'warn');
    sound('error');
    return false;
  }
  const contents = combinedBuildingContents(building);
  if (!inventoryCanFit(contents)) {
    toast('設備内のアイテムがバッグに収まりません。先にバッグを空けてください。', 'warn');
    sound('error');
    return false;
  }
  for (const [itemId, amount] of Object.entries(contents)) addInventory(itemId, amount);
  const refund = BUILDINGS[building.type]?.cost || 0;
  game.money += refund;
  game.buildings = game.buildings.filter((entry) => entry.id !== building.id);
  powerSnapshot = computePowerSnapshot(game);
  previousPowerStatus = powerSnapshot.status;
  world.removeBuilding(building.id);
  selectedMachineId = null;
  game.tutorialStats.automationComplete = detectAutomationComplete();
  persist('設備撤去');
  sound('dismantle');
  toast(`${BUILDINGS[building.type]?.name ?? '設備'}を撤去 +$${refund}`, 'info');
  renderAll();
  if (resumeAfter) closePanelAndResume();
  return true;
}

function dismantleCurrentTarget() {
  const target = world.currentTarget;
  if (!target || target.kind !== 'building') {
    toast('撤去する設備を照準に合わせてください', 'info');
    return;
  }
  const building = getBuilding(target.id);
  if (removeBuildingSafely(building)) renderInteractionPrompt(null);
}

function processMachines(delta) {
  for (const building of game.buildings) {
    const def = BUILDINGS[building.type];
    const recipe = def?.recipe ? RECIPES[def.recipe] : null;
    if (Number(def?.powerGeneration || 0) > 0) {
      const active = generatorActive(building);
      world.updateBuildingState(building.id, {
        active,
        progress: active ? Number(building.powerFuelSeconds || 0) / GENERATOR_FUEL_SECONDS : 0,
      });
      continue;
    }
    if (buildingPowerStorageCapacity(building) > 0) {
      const capacity = buildingPowerStorageCapacity(building);
      const stored = Math.min(capacity, Math.max(0, Number(building.powerStored || 0)));
      const connected = powerSnapshot.connectedBatteryIds?.has(building.id);
      world.updateBuildingState(building.id, { active: Boolean(connected && stored > 0), progress: capacity > 0 ? stored / capacity : 0 });
      continue;
    }
    if (!recipe) {
      world.updateBuildingState(building.id, { active: false, progress: 0 });
      continue;
    }
    building.input ??= {};
    building.output ??= {};
    if (!isBuildingPowered(game, building, powerSnapshot)) {
      world.updateBuildingState(building.id, { active: false, progress: Number(building.progress || 0) / recipe.seconds });
      continue;
    }
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

function findRoute(source, itemId, specificTargetId = null) {
  return findDirectionalRoute(game.buildings, source, itemId, acceptsItem, specificTargetId);
}

function findRoutes(source, itemId, specificTargetId = null) {
  return findDirectionalRoutes(game.buildings, source, itemId, acceptsItem, specificTargetId);
}

function findTransferRoutes(source, itemId) {
  return findDirectionalRoutes(game.buildings, source, itemId, canReceiveItem);
}

function hasConveyorPath(source, target, itemId) {
  return Boolean(findRoute(source, itemId, target.id));
}

function detectAutomationComplete() {
  const hopper = game.buildings.find((b) => b.type === 'hopper');
  const crushers = game.buildings.filter((b) => b.type === 'crusher');
  const sellers = game.buildings.filter((b) => b.type === 'seller');
  if (!hopper || !crushers.length || !sellers.length) return false;
  return crushers.some((crusher) => (
    hasConveyorPath(hopper, crusher, 'metal_scrap')
    && sellers.some((seller) => hasConveyorPath(crusher, seller, 'crushed_metal'))
  ));
}

function transferOne(source, itemId, route) {
  const target = route.target;
  if (isStorageBuilding(target) && storageRemaining(target) <= 0) return false;
  source.output[itemId] -= 1;
  if (target.type === 'seller') {
    addRevenue(ITEMS[itemId]?.value || 0);
    if (itemId === 'crushed_metal') recordTutorialEvent(game, 'autoSale', true);
    sound('sell');
  } else if (isStorageBuilding(target)) {
    target.output ??= {};
    target.output[itemId] = Number(target.output[itemId] || 0) + 1;
  } else {
    target.input ??= {};
    target.input[itemId] = Number(target.input[itemId] || 0) + 1;
  }
  const animationSpeed = route.throughput >= 3 ? 9.5 : 5.8;
  world.animateTransfer(route.path, itemId, animationSpeed);
  return true;
}

function transportTick(delta) {
  let movedAny = false;
  for (const source of game.buildings) {
    source.output ??= {};
    const itemEntry = Object.entries(source.output).find(([, amount]) => Number(amount) > 0);
    if (!itemEntry) continue;
    const [itemId] = itemEntry;
    const routes = findTransferRoutes(source, itemId);
    const creditKey = `${source.id}:${itemId}`;
    if (!routes.length) {
      transportCredits.set(creditKey, 0);
      continue;
    }

    const firstChoice = selectDirectionalRoute(routes, source.logisticsCursor);
    const rate = Math.max(0.1, Number(firstChoice.route?.throughput || logisticsThroughput('conveyor')));
    let credit = Math.min(4, Number(transportCredits.get(creditKey) || 0) + delta * rate);
    let moved = 0;

    while (credit >= 1 && Number(source.output[itemId] || 0) > 0 && moved < 4) {
      const currentRoutes = findTransferRoutes(source, itemId);
      const choice = selectDirectionalRoute(currentRoutes, source.logisticsCursor);
      if (!choice.route) break;
      if (!transferOne(source, itemId, choice.route)) break;
      source.logisticsCursor = choice.nextCursor;
      credit -= 1;
      moved += 1;
      movedAny = true;
    }

    if (Number(source.output[itemId] || 0) <= 0) credit = 0;
    transportCredits.set(creditKey, credit);
  }

  if (!movedAny) return;
  game.tutorialStats.automationComplete = detectAutomationComplete();
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
  const result = advanceHomeTutorial(game);
  if (result.changed) {
    persist('Tutorial Progress');
    if (result.completed) toast('BASIC TUTORIAL COMPLETE / +$50', 'success');
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
  const goal = homeTutorialObjective(game);
  ui.tutorialTitle.textContent = `${goal.kind}: ${goal.title}`;
  ui.tutorialBody.textContent = goal.body;
  ui.tutorialProgress.textContent = goal.progress;
}

function renderHud() {
  ui.money.textContent = `$${Math.floor(game.money).toLocaleString('ja-JP')}`;
  ui.revenue.textContent = `$${Math.floor(game.lifetimeRevenue).toLocaleString('ja-JP')}`;
  ui.inventorySlots.textContent = `${usedSlots(game.inventory)} / ${maxSlots()}`;
  ui.fps.hidden = !game.settings.showFps;
  ui.shortcutBar.hidden = dismantleMode || game.settings.showShortcuts === false;
}

function renderInventory() {
  ui.inventoryGrid.replaceChildren();
  for (const item of Object.values(ITEMS)) {
    const amount = Number(game.inventory[item.id] || 0);
    const row = document.createElement('div');
    row.className = `inventory-row${amount === 0 ? ' is-empty' : ''}`;
    row.innerHTML = `
      <span class="inventory-row__swatch" style="--item-color:#${item.color.toString(16).padStart(6, '0')}"></span>
      <span class="inventory-row__name">${item.name}<small>$${item.value}/個 / 1枠${item.stack}個</small></span>
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
    const outputEntry = Object.entries(craft.output)[0];
    const value = outputEntry ? (ITEMS[outputEntry[0]]?.value || 0) * outputEntry[1] : 0;
    button.innerHTML = `<span><strong>${craft.name}</strong><small>${requirements} / 売値 $${value}</small></span><span>作る</span>`;
    button.disabled = !canCraft(craft);
    button.addEventListener('click', () => craftItem(craft));
    ui.craftList.append(button);
  }
}

function canCraft(craft) {
  if (!isHandCraftUnlocked(game, craft.id)) return false;
  const enough = Object.entries(craft.input).every(([itemId, amount]) => Number(game.inventory[itemId] || 0) >= amount);
  if (!enough) return false;
  const simulated = { ...game.inventory };
  for (const [itemId, amount] of Object.entries(craft.input)) simulated[itemId] -= amount;
  for (const [itemId, amount] of Object.entries(craft.output)) {
    for (let i = 0; i < amount; i += 1) {
      if (!canAddInventory(itemId, simulated)) return false;
      simulated[itemId] = Number(simulated[itemId] || 0) + 1;
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
  ui.settingShortcuts.checked = game.settings.showShortcuts !== false;
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
  }, 2600);
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

function updatePower(delta) {
  if (started) tickGeneratorFuel(game.buildings, delta);
  const next = started ? tickPowerStorage(game, delta) : computePowerSnapshot(game);
  if (started && powerEnabled(game) && next.status !== previousPowerStatus) {
    if (next.status === 'shortage') toast(powerSummary(next), 'warn');
    else if (previousPowerStatus === 'shortage') toast(`POWER RESTORED: ${Math.floor(next.generation)}供給 / ${next.demand}需要`, 'success');
  }
  powerSnapshot = next;
  previousPowerStatus = next.status;
}

function update(delta) {
  updatePower(delta);
  processMachines(delta);
  if (!started) return;
  unsavedPlaySeconds += delta;
  autosaveAccumulator += delta;
  tutorialCheckAccumulator += delta;
  transportTick(delta);

  if (autosaveAccumulator >= AUTOSAVE_INTERVAL) {
    autosaveAccumulator = 0;
    persist('オートセーブ');
  }
  if (tutorialCheckAccumulator >= 0.4) {
    tutorialCheckAccumulator = 0;
    advanceTutorial();
  }
}
