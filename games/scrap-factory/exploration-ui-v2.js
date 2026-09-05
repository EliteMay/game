import { ITEMS } from './config.js';
import {
  EXPLORATION_AREAS,
  claimExplorationDepot,
  explorationAreaState,
  explorationProgressSummary,
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
  try { document.querySelector('#save-now')?.click(); }
  catch (error) { console.warn('Factory runtime sync before expedition failed', error); }
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

function readCurrent() { return loadGameSave(); }

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
    </div>`;
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

function researchLabels(summary) {
  if (summary?.completed) return { status: 'CLEARED', objective: 'CENTRAL CORE COMPLETE / EXPERIMENTAL RESEARCH READY' };
  if (summary?.archiveRecovered) return { status: 'ARCHIVE RECOVERED', objective: 'FACTORY RESEARCH REQUIRED' };
  if (summary?.stabilizerOnline) return { status: 'CORE STABLE', objective: 'EXPERIMENTAL ARCHIVE ACTIVE' };
  if (summary?.centralCoreUnlocked) return { status: 'CORE OPEN', objective: 'CORE STABILIZER ACTIVE' };
  if (summary?.finalComponentsReady) return { status: 'CORE ACCESS READY', objective: 'CENTRAL CORE COMPONENT INSTALL READY' };
  if (Number(summary?.securedComponents || 0) >= 3) return { status: 'FABRICATION REQUIRED', objective: 'FACTORY FABRICATOR PARTS REQUIRED' };
  if (summary?.labsCompleted) return { status: 'CARGO RETURN REQUIRED', objective: 'SPECIAL CARGO MUST BE FACTORY SECURED' };
  return { status: null, objective: 'MAIN OBJECTIVE ACTIVE' };
}

function areaCard(game, definition) {
  const areaState = explorationAreaState(game, definition.id);
  const summary = explorationProgressSummary(game, definition.id);
  const activeSession = game.exploration?.activeSession;
  const activeHere = activeSession?.areaId === definition.id;
  const activeOther = Boolean(activeSession && !activeHere);
  const progressPercent = Math.round((summary?.discoveryRatio || 0) * 100);
  const research = definition.id === 'research' ? researchLabels(summary) : null;
  const objectiveLabel = summary?.completed ? 'MAIN OBJECTIVE COMPLETE' : research?.objective || 'MAIN OBJECTIVE ACTIVE';
  const available = areaState.unlocked && !activeOther;
  const buttonLabel = activeHere
    ? `${definition.name}の探索を再開`
    : activeOther
      ? '別エリアの探索Sessionが進行中'
      : `${definition.name}へ出発`;
  const status = summary?.completed
    ? 'CLEARED'
    : activeHere
      ? 'SESSION ACTIVE'
      : research?.status
        ? research.status
        : areaState.unlocked
          ? 'AVAILABLE'
          : 'LOCKED';
  const lockReason = areaState.unlocked ? '' : `Rank ${areaState.requiredRank}で解放`;
  const detailNote = definition.id === 'industrial'
    ? `<small>${summary?.shortcutOpened ? 'Service Shortcut 開通済み' : 'Control Room復旧後にService Shortcutを開通可能'}</small>`
    : definition.id === 'research'
      ? `<small>Special Cargo ${summary?.securedComponents || 0} / 3 / Experimental部品 ${summary?.finalComponentsReady || summary?.fabricationSetInstalled ? 'READY' : 'NOT READY'}</small>`
      : '<small>進行必須報酬はObjective完了時に保証</small>';

  return `
    <article class="expedition-card${available || activeHere ? '' : ' is-locked'}">
      <div class="expedition-card__top">
        <div><span>AREA / DANGER ${definition.danger}</span><h3>${definition.name}</h3></div>
        <strong>${status}</strong>
      </div>
      <div class="expedition-card__grid">
        <div><span>MAIN OBJECTIVE</span><p>${definition.objective}</p><small>${objectiveLabel}</small></div>
        <div><span>MAIN LOOT</span><p>${lootNames(definition)}</p>${detailNote}</div>
        <div><span>RECOMMENDED</span><p>${definition.recommended}</p><small>正常帰還前のLootはExpedition Session内</small></div>
        <div><span>DISCOVERY</span><p>${progressPercent}% / ${summary?.discovered || 0} / ${summary?.zoneTotal || definition.zoneIds.length} 区画</p><small>Resource Point ${summary?.resourcePoints || 0}</small></div>
      </div>
      ${lockReason ? `<p class="terminal-lock-note">${lockReason}</p>` : ''}
      <button class="primary-action" type="button" data-expedition="${definition.id}" ${available || activeHere ? '' : 'disabled'}>${buttonLabel}</button>
    </article>`;
}

function renderPanel() {
  if (!state.panel || state.panel.hidden) return;
  const content = state.panel.querySelector('#transport-terminal-content');
  if (!content) return;
  const { game } = readCurrent();
  const definitions = Object.values(EXPLORATION_AREAS);
  const summaries = definitions.map((definition) => explorationProgressSummary(game, definition.id));
  const cleared = summaries.filter((summary) => summary?.completed).length;
  const returned = summaries.reduce((sum, summary) => sum + Number(summary?.returnedLootTotal || 0), 0);
  const depotItems = summaries[0]?.depotItems || 0;

  content.innerHTML = `
    <div class="transport-summary-grid">
      <article><span>PROGRESSION</span><strong>RANK ${game.progression?.progressionRank || 1}</strong></article>
      <article><span>AREAS CLEARED</span><strong>${cleared} / ${definitions.length}</strong></article>
      <article><span>RETURNED LOOT</span><strong>${returned}</strong><small>全探索エリア累計</small></article>
      <article><span>TRANSPORT DEPOT</span><strong>${depotItems} ITEMS</strong><small>${depotText(game.exploration?.depot)}</small></article>
    </div>
    ${definitions.map((definition) => areaCard(game, definition)).join('')}
    <section class="transport-depot-section">
      <div><span>RETURNED LOOT</span><strong>Transport Depot</strong><p>正常帰還したLootを一時保管します。バッグに空きがある分だけ受け取れます。</p></div>
      <button id="claim-transport-depot" class="secondary-action" type="button" ${depotItems ? '' : 'disabled'}>バッグへ受け取る</button>
    </section>`;

  content.querySelectorAll('[data-expedition]').forEach((button) => {
    button.addEventListener('click', () => {
      const areaId = button.dataset.expedition;
      const definition = EXPLORATION_AREAS[areaId];
      const current = readCurrent();
      const result = startExpedition(current.game, areaId);
      if (!result.changed && result.reason !== 'already-active') return;
      saveGameSave(current.root, current.game);
      window.location.href = definition.scene;
    });
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
    if (!state.panel?.hidden) { event.preventDefault(); closePanel(); return; }
    if (!gameplayReady() || otherOverlayOpen()) return;
    event.preventDefault();
    openPanel();
  }, true);
}

function boot() {
  if (!window.__scrapFactoryBooted) { window.setTimeout(boot, 120); return; }
  createUi();
  bindKey();
}

boot();
