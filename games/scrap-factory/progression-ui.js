import { BUILDINGS, BUILD_MENU_ORDER, HAND_CRAFTS, SAVE_KEY } from './config.js';
import {
  RESEARCH,
  claimRankUp,
  completeResearch,
  isBuildingUnlocked,
  isHandCraftUnlocked,
  normalizeProgression,
  rankProgress,
  requiredBuildingRank,
  researchState,
} from './progression.js';

const STYLE_HREF = './progression.css';
const state = {
  panel: null,
  authoritativeProgression: null,
};

function readRoot() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  } catch {
    return null;
  }
}

function readGame() {
  const root = readRoot();
  const game = root?.games?.['scrap-factory'];
  if (!game) return { root, game: null };
  game.progression = normalizeProgression(state.authoritativeProgression || game.progression, game);
  return { root, game };
}

function writeProgression(root, game) {
  if (!root || !game?.progression) return false;
  try {
    state.authoritativeProgression = structuredClone(game.progression);
    const next = structuredClone(root);
    next.games ??= {};
    next.games['scrap-factory'] = { ...next.games['scrap-factory'], progression: state.authoritativeProgression };
    next.revision = Math.max(1, Number(next.revision || 0) + 1);
    next.updatedAt = new Date().toISOString();
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    return true;
  } catch (error) {
    console.error('Progression save failed', error);
    return false;
  }
}

function enforceAuthoritativeProgression() {
  if (!state.authoritativeProgression) return;
  const root = readRoot();
  const currentGame = root?.games?.['scrap-factory'];
  if (!root || !currentGame) return;
  try {
    const next = structuredClone(root);
    next.games['scrap-factory'] = { ...next.games['scrap-factory'], progression: state.authoritativeProgression };
    next.revision = Math.max(1, Number(next.revision || 0) + 1);
    next.updatedAt = new Date().toISOString();
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Progression final merge failed', error);
  }
}

function gameplayReady() {
  const hud = document.querySelector('#hud');
  const boot = document.querySelector('#boot-screen');
  return Boolean(hud && !hud.hidden && boot?.hidden);
}

function otherOverlayOpen() {
  return [...document.querySelectorAll('.overlay-panel, .factory-management-panel, .progression-panel')]
    .some((panel) => panel !== state.panel && !panel.hidden);
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

function openPanel() {
  if (!state.panel) return;
  if (state.panel.hidden && !acquireOverlayCarrier()) return;
  state.panel.hidden = false;
  renderPanel();
}

function closePanel() {
  if (!state.panel || state.panel.hidden) return;
  state.panel.hidden = true;
  document.querySelector('#close-guide')?.click();
}

function ensureStylesheet() {
  if (document.querySelector('link[data-progression-ui]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  link.dataset.progressionUi = 'true';
  document.head.append(link);
}

function createUi() {
  ensureStylesheet();
  const shell = document.querySelector('.game-shell');
  const hud = document.querySelector('#hud');
  if (!shell || !hud || document.querySelector('#progression-panel')) return;

  const button = document.createElement('button');
  button.id = 'progression-hud';
  button.className = 'progression-hud';
  button.type = 'button';
  button.addEventListener('click', openPanel);
  hud.append(button);

  const panel = document.createElement('section');
  panel.id = 'progression-panel';
  panel.className = 'progression-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', '工場ランクと研究');
  panel.innerHTML = `
    <div class="progression-card">
      <header class="progression-header">
        <div><p class="panel-kicker">FACTORY PROGRESSION</p><h2>工場ランク / Research</h2><p>必須目標と選択目標を達成してRankを上げ、Research Dataで技術を解放します。</p></div>
        <button id="close-progression" class="icon-button" type="button" aria-label="進行画面を閉じる">×</button>
      </header>
      <div id="progression-content" class="progression-content"></div>
    </div>
  `;
  shell.append(panel);
  state.panel = panel;
  panel.querySelector('#close-progression')?.addEventListener('click', closePanel);
}

function goalRow(goal, mandatory = false) {
  return `<div class="progression-goal${goal.done ? ' is-done' : ''}"><strong>${goal.done ? '✓' : '○'}</strong><span>${mandatory ? '必須: ' : ''}${goal.label}</span></div>`;
}

function reasonLabel(research) {
  if (research.completed) return '研究済み';
  if (research.reason === 'rank') return `Rank ${research.requiredRank} が必要`;
  if (research.reason === 'blueprint') return 'Blueprint未発見';
  if (research.reason === 'data') return `Research Data ${research.researchDataCost} 必要`;
  return research.available ? '研究可能' : '未解放';
}

function renderResearch(game) {
  return Object.keys(RESEARCH).map((id) => {
    const research = researchState(game, id);
    return `
      <article class="research-row${research.completed ? ' is-complete' : ''}">
        <div><span>${research.category}</span><strong>${research.name}</strong><p>${research.description}</p><small>${reasonLabel(research)}</small></div>
        <button type="button" data-research="${id}" class="secondary-action" ${research.available ? '' : 'disabled'}>${research.completed ? '研究済み' : `研究 ${research.researchDataCost}`}</button>
      </article>
    `;
  }).join('');
}

function renderPanel() {
  if (!state.panel || state.panel.hidden) return;
  const content = state.panel.querySelector('#progression-content');
  const { game } = readGame();
  if (!content || !game) return;
  const progression = game.progression;
  const progress = rankProgress(game);
  const definition = progress.definition;
  const rankBlock = definition ? `
    <section class="progression-section">
      <div class="progression-section__head"><div><span>RANK ${progression.progressionRank} → ${definition.nextRank}</span><h3>${definition.title}</h3></div><strong>${progress.eligible ? 'READY' : `${progress.optionalDone}/${progress.optionalRequired}`}</strong></div>
      <div class="progression-goals">
        ${goalRow(progress.mandatory, true)}
        ${progress.optionals.map((goal) => goalRow(goal)).join('')}
      </div>
      <div class="progression-rewards"><span>解放</span><strong>${definition.rewards.join(' / ')}</strong></div>
      <button id="claim-rank-up" type="button" class="primary-action" ${progress.eligible ? '' : 'disabled'}>Rank ${definition.nextRank}へ昇格</button>
    </section>
  ` : `
    <section class="progression-section progression-section--cap">
      <div class="progression-section__head"><div><span>PHASE 1 CAP</span><h3>Rank ${progression.progressionRank}</h3></div><strong>ACTIVE</strong></div>
      <p>通常GameplayのRank Upは現在ここまでです。Phase 2-AのPower CoreはRank 4状態向けに実装済みで、自然なRank 4到達条件は探索Phaseで接続します。Splitter / Merger / Mk.2は次のPhase 2 sliceで追加します。</p>
    </section>
  `;

  content.innerHTML = `
    <div class="progression-summary">
      <article><span>PROGRESSION RANK</span><strong>${progression.progressionRank}</strong></article>
      <article><span>RESEARCH DATA</span><strong>${progression.researchData}</strong></article>
      <article><span>RESEARCHED</span><strong>${progression.completedResearch.length}</strong></article>
      <article><span>BLUEPRINTS</span><strong>${progression.blueprints.length}</strong></article>
    </div>
    ${rankBlock}
    <section class="progression-section">
      <div class="progression-section__head"><div><span>RESEARCH</span><h3>技術研究</h3></div></div>
      <div class="research-list">${renderResearch(game)}</div>
    </section>
  `;

  content.querySelector('#claim-rank-up')?.addEventListener('click', () => {
    const current = readGame();
    if (!current.game) return;
    const result = claimRankUp(current.game);
    if (result.changed && writeProgression(current.root, current.game)) window.location.reload();
  });

  content.querySelectorAll('[data-research]').forEach((button) => {
    button.addEventListener('click', () => {
      const current = readGame();
      if (!current.game) return;
      const result = completeResearch(current.game, button.dataset.research);
      if (result.changed && writeProgression(current.root, current.game)) window.location.reload();
    });
  });
}

function renderHud() {
  const button = document.querySelector('#progression-hud');
  if (!button) return;
  const { game } = readGame();
  if (!game) return;
  const progress = rankProgress(game);
  button.innerHTML = `<span>RANK</span><strong>${game.progression.progressionRank}</strong><small>${progress.eligible ? 'UP READY' : `DATA ${game.progression.researchData}`}</small>`;
}

function applyBuildGate(game) {
  const options = [...document.querySelectorAll('#build-list .build-option')];
  options.forEach((button, index) => {
    const type = BUILD_MENU_ORDER[index];
    if (!type) return;
    const unlocked = isBuildingUnlocked(game, type);
    if (!unlocked) {
      button.disabled = true;
      button.dataset.progressionLocked = 'true';
      const cost = button.querySelector('.build-option__cost');
      if (cost) cost.textContent = `RANK ${requiredBuildingRank(type)}`;
    } else if (button.dataset.progressionLocked) {
      delete button.dataset.progressionLocked;
      const cost = BUILDINGS[type]?.cost || 0;
      const costNode = button.querySelector('.build-option__cost');
      if (costNode) costNode.textContent = `$${cost}`;
      button.disabled = Number(game.money || 0) < cost;
    }
  });
}

function applyCraftGate(game) {
  const buttons = [...document.querySelectorAll('#craft-list .craft-option')];
  Object.values(HAND_CRAFTS).forEach((craft, index) => {
    const button = buttons[index];
    if (!button) return;
    if (!isHandCraftUnlocked(game, craft.id)) {
      button.disabled = true;
      button.dataset.progressionLocked = 'true';
      const action = button.lastElementChild;
      if (action) action.textContent = '研究必要';
    }
  });
}

function renameLegacyFactoryRank() {
  document.querySelectorAll('.management-rank > span').forEach((label) => {
    if (label.textContent?.trim() === 'FACTORY RANK') label.textContent = 'FACTORY TITLE';
  });
}

function applyProgressionGates() {
  const { game } = readGame();
  if (!game) return;
  applyBuildGate(game);
  applyCraftGate(game);
  renameLegacyFactoryRank();
}

function blockedBuildFromClick(event, game) {
  const button = event.target instanceof Element ? event.target.closest('#build-list .build-option') : null;
  if (!button) return false;
  const index = [...document.querySelectorAll('#build-list .build-option')].indexOf(button);
  const type = BUILD_MENU_ORDER[index];
  return Boolean(type && !isBuildingUnlocked(game, type));
}

function blockedCraftFromClick(event, game) {
  const button = event.target instanceof Element ? event.target.closest('#craft-list .craft-option') : null;
  if (!button) return false;
  const index = [...document.querySelectorAll('#craft-list .craft-option')].indexOf(button);
  const craft = Object.values(HAND_CRAFTS)[index];
  return Boolean(craft && !isHandCraftUnlocked(game, craft.id));
}

function bindGuards() {
  document.addEventListener('click', (event) => {
    const { game } = readGame();
    if (!game) return;
    if (!blockedBuildFromClick(event, game) && !blockedCraftFromClick(event, game)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    const type = { Digit2: 'smelter', Digit4: 'storage' }[event.code];
    if (!type) return;
    const { game } = readGame();
    if (!game || isBuildingUnlocked(game, type)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.addEventListener('beforeunload', enforceAuthoritativeProgression);
  window.addEventListener('pagehide', enforceAuthoritativeProgression);
}

function boot() {
  if (!window.__scrapFactoryBooted) {
    window.setTimeout(boot, 120);
    return;
  }
  createUi();
  bindGuards();
  applyProgressionGates();
  renderHud();
  window.setInterval(() => {
    renderHud();
    applyProgressionGates();
    if (!state.panel?.hidden) renderPanel();
  }, 500);
}

boot();
