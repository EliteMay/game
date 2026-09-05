import { ITEMS } from './config.js';
import {
  EXPLORATION_AREAS,
  RESIDENTIAL_AREA_ID,
  claimExplorationDepot,
  explorationAreaState,
  residentialProgressSummary,
  startExpedition,
} from './exploration.js';
import { loadGameSave, saveGameSave } from './storage.js';

const STYLE_HREF = './exploration-ui.css';
const state = { panel: null };

function gameplayReady() {
  const hud = document.querySelector('#hud');
  const boot = document.querySelector('#boot-screen');
  return Boolean(hud && !hud.hidden && boot?.hidden);
}

function otherOverlayOpen() {
  return [...document.querySelectorAll('.overlay-panel, .factory-management-panel, .progression-panel')]
    .some((panel) => panel !== state.panel && !panel.hidden);
}

function syncFactoryRuntime() {
  try {
    document.querySelector('#save-now')?.click();
  } catch (error) {
    console.warn('Factory runtime sync before expedition failed', error);
  }
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

function ensureStylesheet() {
  if (document.querySelector('link[data-exploration-ui]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  link.dataset.explorationUi = 'true';
  document.head.append(link);
}

function readCurrent() {
  return loadGameSave();
}

function createUi() {
  ensureStylesheet();
  const shell = document.querySelector('.game-shell');
  const bottomLeft = document.querySelector('.hud__bottom-left');
  if (!shell || !bottomLeft || document.querySelector('#transport-terminal-panel')) return;

  const button = document.createElement('button');
  button.id = 'open-transport-terminal';
  button.className = 'hud-key transport-hud-key';
  button.type = 'button';
  button.innerHTML = '<kbd>T</kbd><span>TERMINAL</span>';
  button.addEventListener('click', openPanel);
  bottomLeft.append(button);

  const panel = document.createElement('section');
  panel.id = 'transport-terminal-panel';
  panel.className = 'overlay-panel transport-terminal-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Transport Terminal');
  panel.innerHTML = `
    <div class="panel-card transport-terminal-card">
      <header class="panel-header">
        <div><p class="panel-kicker">TRANSPORT TERMINAL / EXPEDITION</p><h2>探索エリア</h2><p class="transport-terminal-lead">Factory外の独立エリアへ出発します。探索中のLootは正常帰還するまでFactoryへ確定しません。</p></div>
        <button id="close-transport-terminal" class="icon-button" type="button" aria-label="Transport Terminalを閉じる">×</button>
      </header>
      <div id="transport-terminal-content"></div>
    </div>
  `;
  shell.append(panel);
  state.panel = panel;
  panel.querySelector('#close-transport-terminal')?.addEventListener('click', closePanel);
}

function openPanel() {
  if (!state.panel) return;
  if (state.panel.hidden) {
    syncFactoryRuntime();
    if (!acquireOverlayCarrier()) return;
  }
  state.panel.hidden = false;
  renderPanel();
}

function closePanel() {
  if (!state.panel || state.panel.hidden) return;
  state.panel.hidden = true;
  document.querySelector('#close-guide')?.click();
}

function lootNames(definition) {
  return definition.loot.map((id) => ITEMS[id]?.name || id).join(' / ');
}

function depotText(depot) {
  const entries = Object.entries(depot || {}).filter(([, amount]) => Number(amount) > 0);
  if (!entries.length) return '空';
  return entries.map(([id, amount]) => `${ITEMS[id]?.name || id} ×${amount}`).join(' / ');
}

function renderPanel() {
  if (!state.panel || state.panel.hidden) return;
  const content = state.panel.querySelector('#transport-terminal-content');
  if (!content) return;
  const { game } = readCurrent();
  const areaState = explorationAreaState(game, RESIDENTIAL_AREA_ID);
  const summary = residentialProgressSummary(game);
  const definition = EXPLORATION_AREAS.residential;
  const session = game.exploration?.activeSession;
  const activeHere = session?.areaId === RESIDENTIAL_AREA_ID;
  const progressPercent = Math.round(summary.discoveryRatio * 100);
  const objectiveLabel = summary.completed ? 'MAIN OBJECTIVE COMPLETE' : 'MAIN OBJECTIVE ACTIVE';
  const buttonLabel = activeHere ? '廃住宅街の探索を再開' : '廃住宅街へ出発';
  const lockReason = areaState.unlocked ? '' : `Rank ${areaState.requiredRank}で解放`;

  content.innerHTML = `
    <div class="transport-summary-grid">
      <article><span>PROGRESSION</span><strong>RANK ${game.progression?.progressionRank || 1}</strong></article>
      <article><span>DISTRICT DISCOVERY</span><strong>${progressPercent}%</strong><small>${summary.discovered} / ${summary.zoneTotal} 区画</small></article>
      <article><span>SUCCESSFUL RETURNS</span><strong>${summary.successfulReturns}</strong><small>持帰り ${summary.returnedLootTotal}個</small></article>
      <article><span>TRANSPORT DEPOT</span><strong>${summary.depotItems} ITEMS</strong><small>${depotText(game.exploration?.depot)}</small></article>
    </div>

    <article class="expedition-card${areaState.unlocked ? '' : ' is-locked'}">
      <div class="expedition-card__top">
        <div><span>AREA 01 / DANGER ${definition.danger}</span><h3>${definition.name}</h3></div>
        <strong>${summary.completed ? 'CLEARED' : activeHere ? 'SESSION ACTIVE' : areaState.unlocked ? 'AVAILABLE' : 'LOCKED'}</strong>
      </div>
      <div class="expedition-card__grid">
        <div><span>MAIN OBJECTIVE</span><p>${definition.objective}</p><small>${objectiveLabel}</small></div>
        <div><span>MAIN LOOT</span><p>${lootNames(definition)}</p><small>進行必須報酬はObjective完了時に保証</small></div>
        <div><span>RECOMMENDED</span><p>${definition.recommended}</p><small>正常帰還前のLootはExpedition Session内</small></div>
        <div><span>RESOURCE POINT</span><p>${summary.resourcePoints ? '住宅街の銅資源Networkを確保済み' : '未発見'}</p><small>将来のDrone回収地点候補</small></div>
      </div>
      ${lockReason ? `<p class="terminal-lock-note">${lockReason}</p>` : ''}
      <button id="start-residential-expedition" class="primary-action" type="button" ${areaState.unlocked ? '' : 'disabled'}>${buttonLabel}</button>
    </article>

    <section class="transport-depot-section">
      <div><span>RETURNED LOOT</span><strong>Transport Depot</strong><p>正常帰還したLootを一時保管します。バッグに空きがある分だけ受け取れます。</p></div>
      <button id="claim-transport-depot" class="secondary-action" type="button" ${summary.depotItems ? '' : 'disabled'}>バッグへ受け取る</button>
    </section>
  `;

  content.querySelector('#start-residential-expedition')?.addEventListener('click', () => {
    const current = readCurrent();
    const result = startExpedition(current.game, RESIDENTIAL_AREA_ID);
    if (!result.changed && result.reason !== 'already-active') return;
    saveGameSave(current.root, current.game);
    window.location.href = './exploration/residential.html';
  });

  content.querySelector('#claim-transport-depot')?.addEventListener('click', () => {
    const current = readCurrent();
    const result = claimExplorationDepot(current.game);
    if (!result.changed) return;
    saveGameSave(current.root, current.game);
    renderPanel();
  });
}

function bindKey() {
  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.code !== 'KeyT') return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
    if (!state.panel?.hidden) {
      event.preventDefault();
      closePanel();
      return;
    }
    if (!gameplayReady() || otherOverlayOpen()) return;
    event.preventDefault();
    openPanel();
  }, true);
}

function boot() {
  if (!window.__scrapFactoryBooted) {
    window.setTimeout(boot, 120);
    return;
  }
  createUi();
  bindKey();
}

boot();
