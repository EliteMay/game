import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

function replaceOnce(file, from, to) {
  const current = read(file);
  if (current.includes(to)) return;
  if (!current.includes(from)) throw new Error(`Anchor not found in ${file}: ${from.slice(0, 80)}`);
  write(file, current.replace(from, to));
}

function appendOnce(file, marker, content) {
  const current = read(file);
  if (current.includes(marker)) return;
  write(file, `${current.trimEnd()}\n\n${content.trim()}\n`);
}

const optimizationModule = String.raw`import { BUILDINGS } from './config.js';
import { analyzeFinalAutomation } from './final-automation.js';
import { computePowerSnapshot } from './power.js';
import { isStorageBuilding, storageAmount, storageCapacity } from './storage-capacity.js';

export const POST_CLEAR_OPTIMIZATION_VERSION = 1;

export const POST_CLEAR_OBJECTIVES = Object.freeze([
  {
    id: 'power_headroom',
    title: 'POWER HEADROOM',
    description: 'Main Clear後の工場でPower Shortageを起こさず、240 Power以上の余力を確保する。',
  },
  {
    id: 'storage_headroom',
    title: 'BUFFER RESERVE',
    description: 'Factory Storageを合計3,600容量以上へ拡張し、1,800以上の空きを維持する。',
  },
  {
    id: 'logistics_backbone',
    title: 'LOGISTICS BACKBONE',
    description: 'Mk.3 Conveyor 18基、Priority / Overflow系4基、Logistics Warehouse 2基以上で高密度物流を構成する。',
  },
  {
    id: 'redundant_automation',
    title: 'REDUNDANT AUTOMATION',
    description: '最終自動化Lineを維持したまま、Experimental Powerを2基、Advanced Drone Portを6基以上へ冗長化する。',
  },
]);

const OBJECTIVE_IDS = new Set(POST_CLEAR_OBJECTIVES.map((objective) => objective.id));

export function makeDefaultPostClearOptimization() {
  return {
    version: POST_CLEAR_OPTIMIZATION_VERSION,
    completedObjectiveIds: [],
    completedAt: {},
    masteredAt: null,
  };
}

function validTimestamp(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function normalizePostClearOptimization(candidate) {
  const base = makeDefaultPostClearOptimization();
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return base;
  const completedObjectiveIds = Array.isArray(candidate.completedObjectiveIds)
    ? [...new Set(candidate.completedObjectiveIds.map(String).filter((id) => OBJECTIVE_IDS.has(id)))]
    : [];
  const completedAt = {};
  if (candidate.completedAt && typeof candidate.completedAt === 'object' && !Array.isArray(candidate.completedAt)) {
    for (const id of completedObjectiveIds) {
      const timestamp = validTimestamp(candidate.completedAt[id]);
      if (timestamp) completedAt[id] = timestamp;
    }
  }
  return {
    version: POST_CLEAR_OPTIMIZATION_VERSION,
    completedObjectiveIds,
    completedAt,
    masteredAt: validTimestamp(candidate.masteredAt),
  };
}

function countByType(buildings) {
  const counts = {};
  for (const building of buildings) counts[building.type] = Number(counts[building.type] || 0) + 1;
  return counts;
}

function clampRatio(value) {
  return Math.min(1, Math.max(0, Number(value || 0)));
}

function ratioForParts(parts) {
  if (!parts.length) return 0;
  return clampRatio(parts.reduce((sum, value) => sum + clampRatio(value), 0) / parts.length);
}

export function buildOptimizationSnapshot(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const counts = countByType(buildings);
  const power = computePowerSnapshot(game || {});
  const finalAutomation = analyzeFinalAutomation(game || {});
  let capacity = 0;
  let used = 0;
  for (const building of buildings) {
    if (!isStorageBuilding(building)) continue;
    capacity += storageCapacity(building);
    used += storageAmount(building);
  }
  const advancedDronePorts = buildings.filter((building) => String(building.type || '').startsWith('advanced_drone_port')).length;
  const adaptiveSplitters = Number(counts.priority_splitter || 0) + Number(counts.overflow_splitter || 0);
  return {
    unlocked: Boolean(game?.finalChapter?.mainClearedAt),
    power: {
      status: power.status,
      reserve: Math.max(0, Number(power.reserve || 0)),
    },
    storage: {
      capacity,
      remaining: Math.max(0, capacity - used),
    },
    logistics: {
      mk3: Number(counts.conveyor_mk3 || 0),
      adaptiveSplitters,
      warehouses: Number(counts.logistics_warehouse || 0),
    },
    redundancy: {
      finalAutomation: Boolean(finalAutomation.qualifies),
      experimentalPowerSystems: Number(finalAutomation.experimentalPowerSystems || 0),
      advancedDronePorts,
    },
  };
}

function lockedState(objective) {
  return {
    ...objective,
    locked: true,
    done: false,
    ratio: 0,
    detail: 'MAIN CLEAR後に解放',
  };
}

export function evaluateOptimizationSnapshot(snapshot) {
  return POST_CLEAR_OBJECTIVES.map((objective) => {
    if (!snapshot?.unlocked) return lockedState(objective);
    if (objective.id === 'power_headroom') {
      const reserve = Math.max(0, Number(snapshot.power?.reserve || 0));
      const healthy = snapshot.power?.status === 'ok';
      return {
        ...objective,
        locked: false,
        done: healthy && reserve >= 240,
        ratio: ratioForParts([healthy ? 1 : 0, reserve / 240]),
        detail: `${healthy ? 'GRID OK' : 'POWER ALERT'} / 余力 ${Math.floor(reserve)} / 240`,
      };
    }
    if (objective.id === 'storage_headroom') {
      const capacity = Math.max(0, Number(snapshot.storage?.capacity || 0));
      const remaining = Math.max(0, Number(snapshot.storage?.remaining || 0));
      return {
        ...objective,
        locked: false,
        done: capacity >= 3600 && remaining >= 1800,
        ratio: ratioForParts([capacity / 3600, remaining / 1800]),
        detail: `容量 ${Math.floor(capacity)} / 3600 ・ 空き ${Math.floor(remaining)} / 1800`,
      };
    }
    if (objective.id === 'logistics_backbone') {
      const mk3 = Math.max(0, Number(snapshot.logistics?.mk3 || 0));
      const splitters = Math.max(0, Number(snapshot.logistics?.adaptiveSplitters || 0));
      const warehouses = Math.max(0, Number(snapshot.logistics?.warehouses || 0));
      return {
        ...objective,
        locked: false,
        done: mk3 >= 18 && splitters >= 4 && warehouses >= 2,
        ratio: ratioForParts([mk3 / 18, splitters / 4, warehouses / 2]),
        detail: `Mk.3 ${mk3}/18 ・ Priority/Overflow ${splitters}/4 ・ Warehouse ${warehouses}/2`,
      };
    }
    const finalAutomation = Boolean(snapshot.redundancy?.finalAutomation);
    const powerSystems = Math.max(0, Number(snapshot.redundancy?.experimentalPowerSystems || 0));
    const dronePorts = Math.max(0, Number(snapshot.redundancy?.advancedDronePorts || 0));
    return {
      ...objective,
      locked: false,
      done: finalAutomation && powerSystems >= 2 && dronePorts >= 6,
      ratio: ratioForParts([finalAutomation ? 1 : 0, powerSystems / 2, dronePorts / 6]),
      detail: `${finalAutomation ? 'FINAL LINE OK' : 'FINAL LINE BREAK'} ・ Experimental Power ${powerSystems}/2 ・ Advanced Drone ${dronePorts}/6`,
    };
  });
}

function timestamp(now) {
  const date = now instanceof Date ? now : new Date(now);
  return date.toISOString();
}

export function applyOptimizationResults(game, objectiveStates, now = new Date()) {
  const state = normalizePostClearOptimization(game?.postClearOptimization);
  if (!game || typeof game !== 'object') return { changed: false, newlyCompleted: [], mastered: false, state };
  game.postClearOptimization = state;
  if (!game.finalChapter?.mainClearedAt) return { changed: false, newlyCompleted: [], mastered: false, state };

  const newlyCompleted = [];
  const completed = new Set(state.completedObjectiveIds);
  for (const objective of objectiveStates || []) {
    if (!objective?.done || !OBJECTIVE_IDS.has(objective.id) || completed.has(objective.id)) continue;
    completed.add(objective.id);
    state.completedObjectiveIds.push(objective.id);
    state.completedAt[objective.id] = timestamp(now);
    newlyCompleted.push(objective.id);
  }

  let masteredNow = false;
  if (!state.masteredAt && POST_CLEAR_OBJECTIVES.every((objective) => completed.has(objective.id))) {
    state.masteredAt = timestamp(now);
    masteredNow = true;
  }
  return {
    changed: newlyCompleted.length > 0 || masteredNow,
    newlyCompleted,
    mastered: Boolean(state.masteredAt),
    masteredNow,
    state,
  };
}

export function optimizationStatus(game) {
  const snapshot = buildOptimizationSnapshot(game || {});
  const objectives = evaluateOptimizationSnapshot(snapshot);
  const state = normalizePostClearOptimization(game?.postClearOptimization);
  return {
    unlocked: snapshot.unlocked,
    snapshot,
    objectives,
    state,
    completed: state.completedObjectiveIds.length,
    total: POST_CLEAR_OBJECTIVES.length,
    mastered: Boolean(state.masteredAt),
  };
}

export function recordPostClearOptimization(game, now = new Date()) {
  const snapshot = buildOptimizationSnapshot(game || {});
  const objectives = evaluateOptimizationSnapshot(snapshot);
  const applied = applyOptimizationResults(game, objectives, now);
  return { ...applied, snapshot, objectives };
}
`;

const optimizationUi = String.raw`import { getRuntimeGame, persistRuntimeGame } from './storage.js';
import { POST_CLEAR_OBJECTIVES, optimizationStatus, recordPostClearOptimization } from './post-clear-optimization.js';

const POLL_MS = 1000;
let panel = null;
let hudButton = null;

function ensureStylesheet() {
  if (document.querySelector('link[data-post-clear-optimization]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './post-clear-optimization.css';
  link.dataset.postClearOptimization = 'true';
  document.head.append(link);
}

function otherOverlayOpen() {
  return [...document.querySelectorAll('.overlay-panel')].some((item) => !item.hidden)
    || Boolean(document.querySelector('#factory-management-panel:not([hidden])'));
}

function acquireOverlayCarrier() {
  if (otherOverlayOpen()) return false;
  const guideButton = document.querySelector('#open-guide-hud');
  const guidePanel = document.querySelector('#guide-panel');
  if (!guideButton || !guidePanel) return false;
  guideButton.click();
  guidePanel.hidden = true;
  return true;
}

function releaseOverlayCarrier() {
  document.querySelector('#close-guide')?.click();
}

function toast(message, tone = 'success') {
  const stack = document.querySelector('#toast-stack');
  if (!stack) return;
  const item = document.createElement('div');
  item.className = 'toast toast--' + tone;
  item.textContent = message;
  stack.append(item);
  requestAnimationFrame(() => item.classList.add('is-visible'));
  window.setTimeout(() => {
    item.classList.remove('is-visible');
    window.setTimeout(() => item.remove(), 220);
  }, 3000);
}

function objectiveRow(objective, completedIds) {
  const recorded = completedIds.includes(objective.id);
  const progress = Math.round(Math.min(1, Math.max(0, Number(objective.ratio || 0))) * 100);
  const stateText = recorded ? '✓' : objective.locked ? 'LOCK' : progress + '%';
  const history = recorded && !objective.done
    ? '<small class="optimization-history">達成記録済み。現在のFactory条件は ' + progress + '%。</small>'
    : recorded
      ? '<small class="optimization-history">達成記録済み</small>'
      : '';
  return [
    '<article class="optimization-objective' + (recorded ? ' is-complete' : '') + '">',
      '<div class="optimization-objective__state">' + stateText + '</div>',
      '<div class="optimization-objective__body">',
        '<strong>' + objective.title + '</strong>',
        '<span>' + objective.description + '</span>',
        '<div class="optimization-progress"><i style="width:' + progress + '%"></i></div>',
        '<small>' + objective.detail + '</small>',
        history,
      '</div>',
    '</article>',
  ].join('');
}

function render() {
  if (!panel || panel.hidden) return;
  const game = getRuntimeGame();
  const status = optimizationStatus(game || {});
  const completedIds = status.state.completedObjectiveIds || [];
  const rows = status.objectives.map((objective) => objectiveRow(objective, completedIds)).join('');
  const mastery = status.mastered
    ? '<div class="optimization-mastered"><span>POST CLEAR MILESTONE</span><strong>OPTIMIZATION MASTERED</strong><p>4つの最適化目標をすべて達成しました。Rankは7のまま、同じSaveで自由にFactory改善を続けられます。</p></div>'
    : '';
  const content = panel.querySelector('#post-clear-optimization-content');
  if (!content) return;
  content.innerHTML = [
    '<div class="optimization-summary">',
      '<div><span>FACTORY OPTIMIZATION</span><strong>' + status.completed + ' / ' + status.total + '</strong></div>',
      '<p>Main Clear後の任意Endgame目標です。Rank 8や新通貨は追加せず、既存のPower / Storage / Logistics / Automationをさらに詰めます。</p>',
    '</div>',
    mastery,
    '<section class="optimization-list">' + rows + '</section>',
  ].join('');
}

function openPanel() {
  if (!panel || !hudButton || hudButton.hidden || !panel.hidden) return;
  if (!acquireOverlayCarrier()) return;
  panel.hidden = false;
  render();
}

function closePanel() {
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  releaseOverlayCarrier();
}

function createUi() {
  ensureStylesheet();
  const shell = document.querySelector('.game-shell');
  const hud = document.querySelector('#hud');
  if (!shell || !hud || panel) return false;

  hudButton = document.createElement('button');
  hudButton.id = 'post-clear-optimization-hud';
  hudButton.className = 'post-clear-optimization-hud';
  hudButton.type = 'button';
  hudButton.hidden = true;
  hudButton.innerHTML = '<span>OPTIMIZE</span><strong id="post-clear-optimization-count">0 / ' + POST_CLEAR_OBJECTIVES.length + '</strong>';
  hudButton.addEventListener('click', openPanel);
  hud.append(hudButton);

  panel = document.createElement('section');
  panel.id = 'post-clear-optimization-panel';
  panel.className = 'post-clear-optimization-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'クリア後の工場最適化');
  panel.innerHTML = [
    '<div class="post-clear-optimization-card">',
      '<header class="post-clear-optimization-header">',
        '<div><p class="panel-kicker">POST CLEAR / FACTORY OS</p><h2>Factory Optimization</h2><p>Main Clear後の工場を、止まりにくく・詰まりにくく・余裕のある構成へ改善します。</p></div>',
        '<button id="close-post-clear-optimization" class="icon-button" type="button" aria-label="Factory Optimizationを閉じる">×</button>',
      '</header>',
      '<div id="post-clear-optimization-content" class="post-clear-optimization-content"></div>',
    '</div>',
  ].join('');
  shell.append(panel);
  panel.querySelector('#close-post-clear-optimization').addEventListener('click', closePanel);
  return true;
}

function update() {
  if (!panel && !createUi()) return;
  const game = getRuntimeGame();
  if (!game) return;
  const result = recordPostClearOptimization(game);
  if (result.changed) {
    persistRuntimeGame();
    for (const id of result.newlyCompleted) {
      const objective = POST_CLEAR_OBJECTIVES.find((entry) => entry.id === id);
      if (objective) toast('最適化達成：' + objective.title);
    }
    if (result.masteredNow) toast('Factory Optimization Mastered', 'success');
  }
  const status = optimizationStatus(game);
  hudButton.hidden = !status.unlocked;
  const count = document.querySelector('#post-clear-optimization-count');
  if (count) count.textContent = status.completed + ' / ' + status.total;
  if (!panel.hidden) render();
}

function waitForGame() {
  if (!window.__scrapFactoryBooted) {
    window.setTimeout(waitForGame, 120);
    return;
  }
  createUi();
  update();
  window.setInterval(update, POLL_MS);
}

waitForGame();
`;

const optimizationCss = String.raw`.post-clear-optimization-hud {
  position: absolute;
  right: 20px;
  top: 274px;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border: 1px solid rgb(255 255 255 / 0.16);
  border-left: 3px solid var(--accent);
  background: rgb(20 24 25 / 0.84);
  color: #e7e9e2;
  font: inherit;
  font-size: 0.65rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  cursor: pointer;
  pointer-events: auto;
  backdrop-filter: blur(8px);
}
.post-clear-optimization-hud[hidden] { display: none; }
.post-clear-optimization-hud:hover { border-color: rgb(255 255 255 / 0.34); background: rgb(31 36 37 / 0.94); }
.post-clear-optimization-hud strong { color: var(--accent); font-variant-numeric: tabular-nums; }

.post-clear-optimization-panel {
  position: absolute;
  inset: 0;
  z-index: 42;
  display: grid;
  place-items: center;
  overflow: auto;
  padding: 28px;
  background: rgb(11 14 15 / 0.8);
  backdrop-filter: blur(6px);
}
.post-clear-optimization-panel[hidden] { display: none; }
.post-clear-optimization-card {
  width: min(980px, 100%);
  max-height: calc(100vh - 56px);
  overflow: auto;
  border: 1px solid #444b4c;
  border-top: 4px solid var(--accent);
  background: #202526;
  box-shadow: var(--shadow);
}
.post-clear-optimization-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--line);
}
.post-clear-optimization-header h2 { margin: 0; font-size: clamp(1.7rem, 3vw, 2.5rem); letter-spacing: -0.035em; }
.post-clear-optimization-header p:last-child { max-width: 680px; margin: 8px 0 0; color: var(--muted); font-size: 0.8rem; line-height: 1.55; }
.post-clear-optimization-content { padding: 20px 24px 26px; }
.optimization-summary { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 20px; align-items: center; padding: 15px 16px; border-left: 4px solid var(--accent); background: #272d2e; }
.optimization-summary > div { display: grid; gap: 4px; min-width: 170px; }
.optimization-summary span, .optimization-mastered span { color: var(--accent); font-size: 0.6rem; font-weight: 900; letter-spacing: 0.12em; }
.optimization-summary strong { font-size: 1.4rem; font-variant-numeric: tabular-nums; }
.optimization-summary p { margin: 0; color: #a7afa9; font-size: 0.74rem; line-height: 1.55; }
.optimization-mastered { margin-top: 12px; padding: 14px 16px; border: 1px solid #55705b; background: #253027; }
.optimization-mastered strong { display: block; margin-top: 4px; color: #a3d7aa; font-size: 1rem; }
.optimization-mastered p { margin: 6px 0 0; color: #a9b8ab; font-size: 0.72rem; line-height: 1.5; }
.optimization-list { display: grid; gap: 8px; margin-top: 12px; }
.optimization-objective { display: grid; grid-template-columns: 62px minmax(0, 1fr); gap: 14px; align-items: center; padding: 13px; border: 1px solid #3b4243; background: #272d2e; }
.optimization-objective.is-complete { border-color: #526b57; background: #253027; }
.optimization-objective__state { width: 52px; height: 52px; display: grid; place-items: center; border: 1px solid #596061; color: var(--accent); font-size: 0.7rem; font-weight: 900; }
.optimization-objective.is-complete .optimization-objective__state { border-color: #6a8b70; color: #8fd098; }
.optimization-objective__body { min-width: 0; display: grid; gap: 4px; }
.optimization-objective__body strong { font-size: 0.86rem; }
.optimization-objective__body span { color: #a4aca6; font-size: 0.72rem; line-height: 1.45; }
.optimization-objective__body small { color: #8f9791; font-size: 0.66rem; }
.optimization-history { color: #8fc397 !important; }
.optimization-progress { height: 3px; margin: 3px 0 1px; background: #42494a; }
.optimization-progress i { display: block; height: 100%; background: var(--accent); }

@media (max-width: 620px) {
  .post-clear-optimization-hud { display: none; }
  .post-clear-optimization-panel { padding: 10px; }
  .post-clear-optimization-card { max-height: calc(100vh - 20px); }
  .post-clear-optimization-header, .post-clear-optimization-content { padding-left: 14px; padding-right: 14px; }
  .optimization-summary { grid-template-columns: 1fr; gap: 8px; }
  .optimization-objective { grid-template-columns: 52px minmax(0, 1fr); gap: 10px; }
  .optimization-objective__state { width: 44px; height: 44px; font-size: 0.62rem; }
}
`;

const optimizationTest = String.raw`import assert from 'node:assert/strict';
import {
  POST_CLEAR_OBJECTIVES,
  applyOptimizationResults,
  evaluateOptimizationSnapshot,
  makeDefaultPostClearOptimization,
  normalizePostClearOptimization,
} from '../games/scrap-factory/post-clear-optimization.js';
import { makeDefaultGameSave } from '../games/scrap-factory/storage.js';

const strongSnapshot = {
  unlocked: true,
  power: { status: 'ok', reserve: 320 },
  storage: { capacity: 4200, remaining: 2200 },
  logistics: { mk3: 22, adaptiveSplitters: 5, warehouses: 3 },
  redundancy: { finalAutomation: true, experimentalPowerSystems: 2, advancedDronePorts: 7 },
};

const locked = evaluateOptimizationSnapshot({ ...strongSnapshot, unlocked: false });
assert.equal(locked.length, POST_CLEAR_OBJECTIVES.length);
assert.equal(locked.every((objective) => objective.locked && !objective.done), true, 'optimization objectives must stay locked before Main Clear');

const completed = evaluateOptimizationSnapshot(strongSnapshot);
assert.equal(completed.every((objective) => objective.done), true, 'representative optimized factory snapshot should satisfy all objectives');

const partial = evaluateOptimizationSnapshot({
  unlocked: true,
  power: { status: 'shortage', reserve: 500 },
  storage: { capacity: 3600, remaining: 900 },
  logistics: { mk3: 18, adaptiveSplitters: 2, warehouses: 2 },
  redundancy: { finalAutomation: false, experimentalPowerSystems: 3, advancedDronePorts: 8 },
});
assert.equal(partial.find((objective) => objective.id === 'power_headroom')?.done, false, 'power reserve cannot hide a current shortage');
assert.equal(partial.find((objective) => objective.id === 'storage_headroom')?.done, false, 'storage objective requires both total capacity and free headroom');
assert.equal(partial.find((objective) => objective.id === 'logistics_backbone')?.done, false, 'logistics objective requires adaptive splitter redundancy');
assert.equal(partial.find((objective) => objective.id === 'redundant_automation')?.done, false, 'redundancy objective requires the current final automation graph to remain valid');

const game = makeDefaultGameSave();
assert.deepEqual(game.postClearOptimization, makeDefaultPostClearOptimization(), 'new save must include additive post-clear optimization state');
const beforeClear = applyOptimizationResults(game, completed, new Date('2026-09-06T00:00:00Z'));
assert.equal(beforeClear.changed, false, 'optimization history must not record before Main Clear');
assert.equal(game.postClearOptimization.completedObjectiveIds.length, 0);

game.finalChapter.mainClearedAt = '2026-09-06T00:00:00.000Z';
const first = applyOptimizationResults(game, completed, new Date('2026-09-06T00:10:00Z'));
assert.equal(first.changed, true);
assert.deepEqual(new Set(first.newlyCompleted), new Set(POST_CLEAR_OBJECTIVES.map((objective) => objective.id)));
assert.equal(first.mastered, true);
assert.equal(typeof game.postClearOptimization.masteredAt, 'string');

const regressed = applyOptimizationResults(game, partial, new Date('2026-09-06T00:20:00Z'));
assert.equal(regressed.changed, false, 'historical optimization completions must not be revoked when the factory is later rebuilt');
assert.equal(game.postClearOptimization.completedObjectiveIds.length, POST_CLEAR_OBJECTIVES.length);

const normalized = normalizePostClearOptimization({
  version: 999,
  completedObjectiveIds: ['power_headroom', 'unknown', 'power_headroom'],
  completedAt: { power_headroom: '2026-09-06T00:00:00.000Z', unknown: 'bad' },
  masteredAt: 123,
});
assert.deepEqual(normalized.completedObjectiveIds, ['power_headroom']);
assert.deepEqual(normalized.completedAt, { power_headroom: '2026-09-06T00:00:00.000Z' });
assert.equal(normalized.masteredAt, null);
assert.equal(game.schemaVersion, 1, 'post-clear content must not create a Rank/Save schema break');
assert.equal(game.progression.progressionRank, 1, 'test fixture must preserve existing Rank contract');

console.log('Post-clear Factory Optimization tests passed');
`;

write('games/scrap-factory/post-clear-optimization.js', optimizationModule);
write('games/scrap-factory/post-clear-optimization-ui.js', optimizationUi);
write('games/scrap-factory/post-clear-optimization.css', optimizationCss);
write('scripts/post-clear-optimization.test.mjs', optimizationTest);

replaceOnce(
  'games/scrap-factory/storage.js',
  "import { HOME_RESPAWN_POSITION, makeDefaultHomeState, normalizeHomeState } from './home-system.js';",
  "import { HOME_RESPAWN_POSITION, makeDefaultHomeState, normalizeHomeState } from './home-system.js';\nimport { makeDefaultPostClearOptimization, normalizePostClearOptimization } from './post-clear-optimization.js';",
);
replaceOnce(
  'games/scrap-factory/storage.js',
  '    finalChapter: makeDefaultFinalChapter(),\n    home: makeDefaultHomeState({ existingSave: false }),',
  '    finalChapter: makeDefaultFinalChapter(),\n    postClearOptimization: makeDefaultPostClearOptimization(),\n    home: makeDefaultHomeState({ existingSave: false }),',
);
replaceOnce(
  'games/scrap-factory/storage.js',
  '    finalChapter: normalizeFinalChapter(candidate.finalChapter),\n    home: normalizeHomeState(candidate.home, { existingSave: !isObject(candidate.home), legacyGame: candidate }),',
  '    finalChapter: normalizeFinalChapter(candidate.finalChapter),\n    postClearOptimization: normalizePostClearOptimization(candidate.postClearOptimization),\n    home: normalizeHomeState(candidate.home, { existingSave: !isObject(candidate.home), legacyGame: candidate }),',
);

replaceOnce(
  'games/scrap-factory/progression-ui.js',
  "import './home-runtime.js';\nexport * from './progression-ui-v4.js';",
  "import './home-runtime.js';\nimport './post-clear-optimization-ui.js';\nexport * from './progression-ui-v4.js';",
);

replaceOnce(
  'package.json',
  '"validate": "node scripts/validate.mjs && node scripts/phase6b.test.mjs && node scripts/phase6c.test.mjs && node scripts/final-phase.test.mjs && node scripts/home-system.test.mjs",',
  '"validate": "node scripts/validate.mjs && node scripts/phase6b.test.mjs && node scripts/phase6c.test.mjs && node scripts/final-phase.test.mjs && node scripts/home-system.test.mjs && node scripts/post-clear-optimization.test.mjs",',
);
replaceOnce(
  'package.json',
  '"test:home": "node scripts/home-system.test.mjs"',
  '"test:home": "node scripts/home-system.test.mjs",\n    "test:post-clear": "node scripts/post-clear-optimization.test.mjs"',
);

replaceOnce(
  'SPEC.md',
  '現在は **Final Phase: Mega Factory Stability / Main Clear** まで実装済み。',
  '現在は **Final Phase: Mega Factory Stability / Main Clear** に加え、**Post Clear: Factory Optimization Objectives** まで実装済み。',
);
replaceOnce(
  'SPEC.md',
  '- clear-after optimization objectivesの拡張\n',
  '',
);
replaceOnce(
  'SPEC.md',
  '├─ final-phase-ui.js\n',
  '├─ final-phase-ui.js\n├─ post-clear-optimization.js\n├─ post-clear-optimization-ui.js\n',
);
replaceOnce(
  'SPEC.md',
  'Final Phase UIは1秒pollingで更新し、self-triggering `MutationObserver` を使わない。\n\n---\n\n## 10. Research Facility / Central Core',
  `Final Phase UIは1秒pollingで更新し、self-triggering \`MutationObserver\` を使わない。\n\n### Post Clear Factory Optimization\n\nMain Clear後はRank 8を追加せず、同じSaveで次の任意目標を追跡する。\n\n- Power Headroom: Power状態OK + 240以上のreserve\n- Buffer Reserve: Factory Storage 3600容量 + 1800以上の空き\n- Logistics Backbone: Conveyor Mk.3 18基 + Priority/Overflow 4基 + Logistics Warehouse 2基\n- Redundant Automation: Final Automation維持 + Experimental Power 2基 + Advanced Drone Port 6基\n\n現在条件は既存Factory stateからderiveし、二重のFactory snapshotは保存しない。達成済みObjective ID / timestamp / Mastered timestampだけを \`postClearOptimization\` へadditive保存する。Save Schemaはv1維持。\n\n---\n\n## 10. Research Facility / Central Core`,
);

appendOnce('WORK_REPORT.md', '## 2026-09-06 — Post Clear Factory Optimization', String.raw`## 2026-09-06 — Post Clear Factory Optimization

### Implemented

- Main Clear後のみ解放されるFactory Optimization Objectiveを4種追加
  - Power Headroom
  - Buffer Reserve
  - Logistics Backbone
  - Redundant Automation
- Rank 8 / 新通貨 / Main Clear再判定は追加せず、既存Power / Storage / Logistics / Final Automationを再利用
- 現在条件はFactory stateからderiveし、達成履歴だけ `postClearOptimization` にadditive保存
- Objective達成後にFactoryを組み替えても履歴は取り消さない
- 4 / 4達成で `OPTIMIZATION MASTERED` を記録
- Main Clear後HUDから専用Optimization Panelを開ける
- `post-clear-optimization.test.mjs` を通常Validationへ追加

### Preserved Contracts

- Rank 1〜7 / No Rank 8
- Main Clearは歴史的Milestoneのまま
- Directional Logistics / 2.5m Grid / Factory Layout
- Root / Game / Progression / Exploration Save Schema v1
- Home / Player Upgrade / Tutorial / slot-based Backpack

### Verification

Implementation branchの`npm run validate`で既存RegressionとPost Clear unit/contract testsを実行する。Browser / Visual確認はFinal commitのVerification Stateへ別途記録する。`);

appendOnce('PROJECT_LEARNINGS.md', '### Post-clear optimization should derive current factory quality and persist only historical milestones', String.raw`### Post-clear optimization should derive current factory quality and persist only historical milestones

Factory OptimizationのPower余力、Storage空き、物流構成、Final Automation成立は現在のFactory graphから再計算できるため、Saveへ二重snapshotを持たせない。一方で「一度達成したOptional Objective」は現在状態だけでは復元できないため、Objective IDと達成時刻だけを履歴としてadditive保存する。

```text
current optimization condition
→ derive from Factory state

objective completion / mastered timestamp
→ persist minimal history
```

これによりClear後にFactoryを自由に組み替えられ、既存Save Contractを膨らませずEndgame Challengeを継続できる。`);

console.log('Post-clear optimization patch applied.');
