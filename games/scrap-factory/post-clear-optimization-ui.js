import { getRuntimeGame, persistRuntimeGame } from './storage.js';
import { POST_CLEAR_OBJECTIVES, optimizationStatus, recordPostClearOptimization } from './post-clear-optimization.js';

const POLL_MS = 1000;
const OPTIMIZATION_KEY = 'KeyK';
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

function gameplayReady() {
  const hud = document.querySelector('#hud');
  const boot = document.querySelector('#boot-screen');
  return Boolean(window.__scrapFactoryBooted && hud && !hud.hidden && boot?.hidden);
}

function otherOverlayOpen() {
  return [...document.querySelectorAll('.overlay-panel, .factory-management-panel, .progression-panel, .transport-terminal-panel, .home-system-panel')]
    .some((item) => item !== panel && !item.hidden);
}

function acquireOverlayCarrier() {
  if (!gameplayReady() || otherOverlayOpen()) return false;
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
  if (!panel || !hudButton || hudButton.hidden || !panel.hidden) return false;
  if (!acquireOverlayCarrier()) return false;
  panel.hidden = false;
  render();
  return true;
}

function closePanel() {
  if (!panel || panel.hidden) return false;
  panel.hidden = true;
  releaseOverlayCarrier();
  return true;
}

function handleKeydown(event) {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;

  if (!panel?.hidden) {
    if (event.code === 'Escape' || event.code === OPTIMIZATION_KEY) {
      event.preventDefault();
      closePanel();
    }
    return;
  }

  if (event.code !== OPTIMIZATION_KEY || hudButton?.hidden) return;
  if (!gameplayReady() || otherOverlayOpen()) return;
  event.preventDefault();
  openPanel();
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
  hudButton.innerHTML = '<kbd>K</kbd><span>OPTIMIZE</span><strong id="post-clear-optimization-count">0 / ' + POST_CLEAR_OBJECTIVES.length + '</strong>';
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
  document.addEventListener('keydown', handleKeydown);
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
