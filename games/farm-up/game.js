import { CROPS, LAND, SEASONS, TOOL_UPGRADE, WEATHER } from './config.js';
import {
  advanceSimulation,
  getActionTileIds,
  getCropProgress,
  getFarmLevel,
  getFarmSummary,
  getLevelProgress,
  getTutorial,
  getUnlockedCrops,
  harvestTile,
  inventoryValue,
  plantTile,
  purchaseLandExpansion,
  sellInventory,
  tillTile,
  tutorialEvent,
  upgradeTools,
  waterTile,
} from './core.js';
import { exportSaveText, importSaveText, loadSave, resetSave, saveState } from './storage.js';
import { FarmWorld } from './world.js';

const $ = (selector) => document.querySelector(selector);
const moneyFormat = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 });
const cropById = new Map(CROPS.map((crop) => [crop.id, crop]));
const seasonById = new Map(SEASONS.map((season) => [season.id, season]));
const weatherById = new Map(WEATHER.map((weather) => [weather.id, weather]));
const loaded = loadSave();
let state = loaded.state;
let running = false;
let dirty = false;
let shuttingDown = false;
let autosaveElapsed = 0;
let lastUiRender = 0;
let currentTarget = null;
let previousLevel = getFarmLevel(state.xp);
let world;

const ui = {
  boot: $('#boot-screen'), start: $('#start-game'), bootSaveStatus: $('#boot-save-status'), hud: $('#hud'),
  money: $('#money'), levelLabel: $('#farm-level-label'), levelProgress: $('#level-progress'), xpLabel: $('#xp-label'),
  seasonDay: $('#season-day'), timeWeather: $('#time-weather'), saveNow: $('#save-now'), openSettings: $('#open-settings'),
  tutorialCount: $('#tutorial-count'), tutorialTitle: $('#tutorial-title'), tutorialDetail: $('#tutorial-detail'), tutorialProgress: $('#tutorial-progress'),
  fieldCount: $('#field-count'), plantedCount: $('#planted-count'), readyCount: $('#ready-count'), stockValue: $('#stock-value'),
  expandLand: $('#expand-land'), upgradeTools: $('#upgrade-tools'), contextPrompt: $('#context-prompt'), contextKicker: $('#context-kicker'),
  contextTitle: $('#context-title'), contextDetail: $('#context-detail'), hoeLevel: $('#hoe-level'), seedName: $('#seed-name'),
  waterLevel: $('#water-level'), cycleCrop: $('#cycle-crop'), cropName: $('#crop-name'), pointerHint: $('#pointer-hint'),
  settings: $('#settings-panel'), settingSensitivity: $('#setting-sensitivity'), settingDistance: $('#setting-distance'),
  settingMotion: $('#setting-motion'), exportSave: $('#export-save'), importSave: $('#import-save'), resetSave: $('#reset-save'),
  saveState: $('#save-state'), levelPanel: $('#level-panel'), levelPanelTitle: $('#level-panel-title'), levelPanelUnlock: $('#level-panel-unlock'),
  toastStack: $('#toast-stack'), toolButtons: [...document.querySelectorAll('[data-tool]')], closeSettings: $('[data-close="settings"]'),
};

const formatMoney = (value) => `¥${moneyFormat.format(Math.max(0, Math.floor(Number(value) || 0)))}`;
function formatTime(minutes) {
  const value = ((Number(minutes) || 0) % 1440 + 1440) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
}

function toast(message, kind = 'info') {
  const node = document.createElement('div');
  node.className = `toast toast--${kind}`;
  node.textContent = message;
  ui.toastStack.append(node);
  window.setTimeout(() => node.remove(), 2700);
}

function setSaveStatus(message, kind = 'idle') {
  ui.saveState.textContent = message;
  ui.saveState.dataset.state = kind;
}

function markDirty() {
  dirty = true;
  setSaveStatus('未保存の変更', 'dirty');
}

function saveSafe(label = '') {
  if (shuttingDown) return false;
  try {
    state = saveState(state);
    dirty = false;
    setSaveStatus('保存済み', 'saved');
    if (label) toast(`${label}しました`, 'success');
    return true;
  } catch (error) {
    console.error(error);
    setSaveStatus('保存に失敗', 'error');
    toast('保存できませんでした。ブラウザの保存領域を確認してください。', 'error');
    return false;
  }
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function showLevelUp(fromLevel, toLevel) {
  if (toLevel <= fromLevel) return;
  const unlocks = CROPS.filter((crop) => crop.unlockLevel > fromLevel && crop.unlockLevel <= toLevel);
  ui.levelPanelTitle.textContent = `FARM LEVEL ${toLevel}`;
  ui.levelPanelUnlock.textContent = unlocks.length ? `${unlocks.map((crop) => crop.name).join(' / ')} が栽培可能になりました。` : '農場経験が上がりました。次の投資へ進めます。';
  ui.levelPanel.hidden = false;
  window.setTimeout(() => { ui.levelPanel.hidden = true; }, 2800);
}

function checkLevelUp(before = previousLevel) {
  const next = getFarmLevel(state.xp);
  showLevelUp(before, next);
  previousLevel = next;
}

function renderTutorial() {
  const tutorial = getTutorial(state);
  if (tutorial.completed) {
    ui.tutorialCount.textContent = `${tutorial.total} / ${tutorial.total}`;
    ui.tutorialTitle.textContent = '最初の農場運営を達成';
    ui.tutorialDetail.textContent = '作物を増やし、農具強化と次のFarm Levelを目指せます。';
    ui.tutorialProgress.style.width = '100%';
    return;
  }
  ui.tutorialCount.textContent = `${tutorial.index + 1} / ${tutorial.total}`;
  ui.tutorialTitle.textContent = tutorial.step.label;
  ui.tutorialDetail.textContent = tutorial.step.detail;
  ui.tutorialProgress.style.width = `${tutorial.index / tutorial.total * 100}%`;
}

function renderTarget(target = currentTarget) {
  currentTarget = target;
  if (!target) { ui.contextPrompt.hidden = true; return; }
  ui.contextPrompt.hidden = false;
  if (target.type === 'shipping') {
    const value = inventoryValue(state);
    ui.contextKicker.textContent = 'SHIPPING BOX';
    ui.contextTitle.textContent = value > 0 ? `出荷する ${formatMoney(value)}` : '出荷箱';
    ui.contextDetail.textContent = value > 0 ? 'Eで在庫をまとめて出荷' : '収穫した作物を持ってくる';
    return;
  }
  const tile = state.tiles[target.id];
  const progress = getCropProgress(state, target.id);
  const crop = tile?.cropId ? cropById.get(tile.cropId) : null;
  ui.contextKicker.textContent = crop ? crop.shortName : 'FIELD';
  ui.contextTitle.textContent = crop ? (progress.ready ? `${crop.name} · 収穫可能` : `${crop.name} · ${Math.round(progress.ratio * 100)}%`) : (tile?.soil === 'tilled' ? '耕した土' : '農地区画');
  ui.contextDetail.textContent = { hoe: 'Eで耕す', seed: `Eで${cropById.get(state.selectedCropId)?.name || '種'}を植える`, water: 'Eで水やり', harvest: 'Eで収穫' }[state.selectedTool];
}

function render() {
  const summary = getFarmSummary(state);
  const level = getLevelProgress(state);
  const crop = cropById.get(state.selectedCropId) || CROPS[0];
  const season = seasonById.get(state.seasonId) || SEASONS[0];
  const weather = weatherById.get(state.weatherId) || WEATHER[0];
  ui.money.textContent = formatMoney(state.money);
  ui.levelLabel.textContent = `LV ${level.level}`;
  ui.levelProgress.style.width = `${Math.min(100, level.earned / level.required * 100)}%`;
  ui.xpLabel.textContent = `${Math.floor(level.earned)} / ${Math.floor(level.required)} XP`;
  ui.seasonDay.textContent = `${season.name} · DAY ${state.dayNumber}`;
  ui.timeWeather.textContent = `${formatTime(state.timeMinutes)} · ${weather.name}`;
  ui.fieldCount.textContent = `${summary.unlockedTiles}区画`;
  ui.plantedCount.textContent = String(summary.planted);
  ui.readyCount.textContent = String(summary.ready);
  ui.stockValue.textContent = formatMoney(summary.inventoryValue);
  ui.hoeLevel.textContent = `LV${state.toolLevels.hoe}`;
  ui.waterLevel.textContent = `LV${state.toolLevels.water}`;
  ui.seedName.textContent = `${crop.name} · ${formatMoney(crop.seedCost)}`;
  ui.cropName.textContent = crop.name;
  ui.expandLand.disabled = state.landLevel >= 2;
  ui.expandLand.querySelector('b').textContent = state.landLevel >= 2 ? '拡張済み' : formatMoney(LAND.expansionCost);
  ui.upgradeTools.disabled = state.toolLevels.hoe >= TOOL_UPGRADE.maxLevel && state.toolLevels.water >= TOOL_UPGRADE.maxLevel;
  ui.upgradeTools.querySelector('b').textContent = ui.upgradeTools.disabled ? '強化済み' : formatMoney(TOOL_UPGRADE.cost);
  ui.toolButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.tool === state.selectedTool));
  renderTutorial();
  renderTarget();
}

function setTool(tool) {
  if (!['hoe', 'seed', 'water', 'harvest'].includes(tool)) return;
  state.selectedTool = tool;
  markDirty();
  render();
}

function cycleCrop() {
  const crops = getUnlockedCrops(state);
  const index = Math.max(0, crops.findIndex((crop) => crop.id === state.selectedCropId));
  state.selectedCropId = crops[(index + 1) % crops.length]?.id || 'wheat';
  markDirty();
  render();
}

function applyTileAction(id) {
  const before = getFarmLevel(state.xp);
  const results = [];
  if (state.selectedTool === 'hoe') getActionTileIds(state, id, 'hoe').forEach((tileId) => results.push(tillTile(state, tileId)));
  else if (state.selectedTool === 'water') getActionTileIds(state, id, 'water').forEach((tileId) => results.push(waterTile(state, tileId)));
  else if (state.selectedTool === 'seed') results.push(plantTile(state, id, state.selectedCropId));
  else results.push(harvestTile(state, id));
  const successful = results.filter((result) => result?.ok);
  if (!successful.length) return toast(results.find((result) => result?.reason)?.reason || '今はその作業をできません', 'warning');
  markDirty();
  checkLevelUp(before);
  toast(successful.length > 1 ? `${successful.length}区画へ作業しました` : successful[0].message, 'success');
  world.refresh(state, true);
  render();
}

function interact(target) {
  if (!running || !ui.settings.hidden) return;
  if (target.type === 'shipping') {
    const before = getFarmLevel(state.xp);
    const result = sellInventory(state);
    if (!result.ok) return toast(result.reason, 'warning');
    markDirty();
    checkLevelUp(before);
    toast(result.message, 'success');
    render();
  } else if (target.type === 'tile') applyTileAction(target.id);
}

function purchaseExpansion() {
  const before = getFarmLevel(state.xp);
  const result = purchaseLandExpansion(state);
  if (!result.ok) return toast(result.reason, 'warning');
  markDirty();
  checkLevelUp(before);
  world.refresh(state, true);
  render();
  toast(result.message, 'success');
  saveSafe('土地購入を保存');
}

function purchaseToolUpgrade() {
  const before = getFarmLevel(state.xp);
  const result = upgradeTools(state);
  if (!result.ok) return toast(result.reason, 'warning');
  markDirty();
  checkLevelUp(before);
  render();
  toast(result.message, 'success');
  saveSafe('農具強化を保存');
}

function openSettings() {
  document.exitPointerLock?.();
  world?.setEnabled(false);
  ui.settings.hidden = false;
  ui.settingSensitivity.value = String(state.settings.sensitivity);
  ui.settingDistance.value = String(state.settings.cameraDistance);
  ui.settingMotion.checked = Boolean(state.settings.reducedMotion);
}

function closeSettings() {
  ui.settings.hidden = true;
  if (running) world?.setEnabled(true);
  render();
}

function updateSettings() {
  state.settings.sensitivity = Number(ui.settingSensitivity.value);
  state.settings.cameraDistance = Number(ui.settingDistance.value);
  state.settings.reducedMotion = ui.settingMotion.checked;
  world.setSettings(state.settings);
  markDirty();
}

function onFrame(dt) {
  if (!running || !ui.settings.hidden) return;
  advanceSimulation(state, dt * 1000, Date.now());
  dirty = true;
  autosaveElapsed += dt;
  if (performance.now() - lastUiRender > 220) {
    lastUiRender = performance.now();
    world.refresh(state);
    render();
  }
  if (autosaveElapsed >= 5) {
    autosaveElapsed = 0;
    if (dirty) saveSafe();
  }
}

function bindUi() {
  ui.start.addEventListener('click', () => {
    ui.boot.hidden = true;
    ui.hud.hidden = false;
    running = true;
    world?.setEnabled(true);
    render();
    toast(loaded.status === 'loaded' ? '農場へ戻りました' : 'Farm Upを開始しました', 'success');
  });
  ui.toolButtons.forEach((button) => button.addEventListener('click', () => setTool(button.dataset.tool)));
  ui.cycleCrop.addEventListener('click', cycleCrop);
  ui.expandLand.addEventListener('click', purchaseExpansion);
  ui.upgradeTools.addEventListener('click', purchaseToolUpgrade);
  ui.saveNow.addEventListener('click', () => saveSafe('セーブ'));
  ui.openSettings.addEventListener('click', openSettings);
  ui.closeSettings.addEventListener('click', closeSettings);
  ui.settings.addEventListener('click', (event) => { if (event.target === ui.settings) closeSettings(); });
  ui.settingSensitivity.addEventListener('input', updateSettings);
  ui.settingDistance.addEventListener('input', updateSettings);
  ui.settingMotion.addEventListener('change', updateSettings);
  ui.exportSave.addEventListener('click', () => {
    try {
      saveSafe();
      downloadText(exportSaveText(state), `farm-up-save-${new Date().toISOString().slice(0, 10)}.json`);
      toast('バックアップを書き出しました', 'success');
    } catch (error) { console.error(error); toast('バックアップを書き出せませんでした', 'error'); }
  });
  ui.importSave.addEventListener('change', async () => {
    const file = ui.importSave.files?.[0];
    ui.importSave.value = '';
    if (!file) return;
    try {
      state = importSaveText(await file.text());
      previousLevel = getFarmLevel(state.xp);
      world.setSettings(state.settings);
      world.refresh(state, true);
      render();
      toast('バックアップから農場を復元しました', 'success');
    } catch (error) { console.error(error); toast('復元できません。Farm Upの正しいバックアップか確認してください。', 'error'); }
  });
  ui.resetSave.addEventListener('click', () => {
    if (!window.confirm('Farm Upの農場を初期状態へ戻します。現在のセーブはRecovery領域へ退避します。')) return;
    try { shuttingDown = true; resetSave(); window.location.reload(); }
    catch (error) { shuttingDown = false; console.error(error); toast('リセットに失敗しました。', 'error'); }
  });
  window.addEventListener('keydown', (event) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (event.code === 'Digit1') setTool('hoe');
    if (event.code === 'Digit2') setTool('seed');
    if (event.code === 'Digit3') setTool('water');
    if (event.code === 'Digit4') setTool('harvest');
    if (event.code === 'KeyQ' && !event.repeat) cycleCrop();
    if (event.code === 'Escape' && !ui.settings.hidden) closeSettings();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && dirty && !shuttingDown) saveSafe();
  });
  window.addEventListener('beforeunload', () => {
    if (dirty && !shuttingDown) { try { state = saveState(state); } catch {} }
  });
}

function bootStatus() {
  if (loaded.status === 'recovery') ui.bootSaveStatus.textContent = '破損したセーブをRecovery領域へ保護しました。新しい農場を開始します。';
  else ui.bootSaveStatus.textContent = loaded.status === 'loaded' ? `CONTINUE · FARM LV ${getFarmLevel(state.xp)} · ${formatMoney(state.money)}` : 'NEW FARM · LOCAL SAVE';
}

document.documentElement.dataset.farmUpReady = 'true';
bootStatus();
bindUi();
render();
try {
  world = new FarmWorld($('#farm-canvas'), state, {
    onFrame,
    onInteract: interact,
    onMove: () => { if (tutorialEvent(state, 'move')) { markDirty(); render(); } },
    onTarget: (target) => renderTarget(target),
    onPointerLock: (locked) => { ui.pointerHint.textContent = locked ? 'ESCでカーソルを戻す' : '画面をクリックしてカメラ操作'; },
    onMessage: (message) => toast(message, 'warning'),
  });
} catch (error) {
  console.error(error);
  ui.start.disabled = true;
  ui.bootSaveStatus.textContent = '3D描画を開始できませんでした。WebGL対応ブラウザで開いてください。';
}
