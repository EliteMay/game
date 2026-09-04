import { BUILDINGS, BUILD_MENU_ORDER, ITEMS, TUTORIAL } from './config.js';
import { findDirectionalRoute } from './logistics.js';
import { loadRootSave, saveRootSave } from './storage.js';
import {
  RESEARCH,
  completeRankUp,
  completeResearch,
  evaluateRank,
  hasUnlock,
  researchState,
  withNormalizedProgression,
} from './progression.js';

const GAME_ID = 'scrap-factory';
const POLL_MS = 600;
const LOCKED_BUILDINGS = ['smelter', 'storage'];
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const state = {
  panel: null,
  hudButton: null,
  objective: null,
  game: null,
  rankState: null,
  context: { firstAutomation: false, ironAutomation: false },
  returnToManagement: false,
  buildObserver: null,
  managementObserver: null,
};

function featureToast(message, tone = 'info') {
  const stack = document.querySelector('#toast-stack');
  if (!stack) return;
  const item = document.createElement('div');
  item.className = `toast toast--${tone}`;
  item.dataset.progressionToast = 'true';
  item.textContent = message;
  stack.append(item);
  requestAnimationFrame(() => item.classList.add('is-visible'));
  window.setTimeout(() => {
    item.classList.remove('is-visible');
    window.setTimeout(() => item.remove(), 220);
  }, 2800);
}

function routeAccepts(building, itemId) {
  const def = BUILDINGS[building?.type];
  const item = ITEMS[itemId];
  if (!def || !item) return false;
  return (def.accepts || []).includes(itemId) || (def.accepts || []).includes(item.category);
}

function hasRoute(buildings, source, target, itemId) {
  if (!source || !target) return false;
  return Boolean(findDirectionalRoute(buildings, source, itemId, routeAccepts, target.id));
}

export function progressionRouteContext(game = {}) {
  const buildings = Array.isArray(game.buildings) ? game.buildings : [];
  const hopper = buildings.find((building) => building.type === 'hopper');
  const crushers = buildings.filter((building) => building.type === 'crusher');
  const smelters = buildings.filter((building) => building.type === 'smelter');
  const sellers = buildings.filter((building) => building.type === 'seller');
  const destinations = buildings.filter((building) => building.type === 'storage' || building.type === 'seller');

  const firstAutomation = Boolean(game?.tutorialStats?.automationComplete) || Boolean(hopper && crushers.some((crusher) => (
    hasRoute(buildings, hopper, crusher, 'metal_scrap')
    && sellers.some((seller) => hasRoute(buildings, crusher, seller, 'crushed_metal'))
  )));

  const ironAutomation = Boolean(hopper && crushers.some((crusher) => (
    hasRoute(buildings, hopper, crusher, 'metal_scrap')
    && smelters.some((smelter) => (
      hasRoute(buildings, crusher, smelter, 'crushed_metal')
      && destinations.some((target) => target.id !== smelter.id && hasRoute(buildings, smelter, target, 'iron_ingot'))
    ))
  )));

  return { firstAutomation, ironAutomation };
}

function readGame() {
  const root = loadRootSave();
  const game = withNormalizedProgression(root.games?.[GAME_ID] || {});
  return { root, game };
}

function applyBuildUnlocks(game) {
  for (const type of LOCKED_BUILDINGS) {
    if (!BUILDINGS[type]) continue;
    const unlocked = hasUnlock(game, `building:${type}`);
    BUILDINGS[type].buildable = unlocked;
    BUILDINGS[type].progressionLocked = !unlocked;
  }
  syncBuildMenuLocks();
}

function researchLabelForBuilding(type) {
  const research = RESEARCH.find((entry) => (entry.unlocks || []).includes(`building:${type}`));
  return research ? `Rank ${research.rank} / ${research.title}` : 'Researchで解放';
}

function syncBuildMenuLocks() {
  const list = document.querySelector('#build-list');
  if (!list) return;
  const buttons = [...list.querySelectorAll('.build-option')];
  buttons.forEach((button, index) => {
    const type = BUILD_MENU_ORDER[index];
    const def = BUILDINGS[type];
    const note = button.querySelector('.progression-lock-note');
    if (!def?.progressionLocked) {
      note?.remove();
      button.removeAttribute('data-progression-locked');
      return;
    }
    button.disabled = true;
    button.dataset.progressionLocked = 'true';
    if (!note) {
      const main = button.querySelector('.build-option__main');
      const lock = document.createElement('small');
      lock.className = 'progression-lock-note';
      lock.textContent = `LOCKED — ${researchLabelForBuilding(type)}`;
      main?.append(lock);
    }
  });
}

function patchFactoryTitle() {
  document.querySelectorAll('.management-rank span').forEach((label) => {
    if (label.textContent?.trim() === 'FACTORY RANK') label.textContent = 'FACTORY TITLE';
  });
}

function saveProgression(nextGame, message) {
  const root = loadRootSave();
  const current = root.games?.[GAME_ID] || {};
  root.games = {
    ...root.games,
    [GAME_ID]: {
      ...current,
      progressionRank: nextGame.progressionRank,
      progression: structuredClone(nextGame.progression),
    },
  };
  saveRootSave(root);
  featureToast(message, 'success');
  refresh();
}

function rankProgressText(rankState) {
  if (!rankState?.phase1Implemented) return 'PHASE 1 COMPLETE';
  return `${rankState.required?.done ? '必須 ✓' : '必須 0/1'} / 選択 ${rankState.optionalDone}/${rankState.optionalRequired}`;
}

function renderHud() {
  if (!state.game || !state.hudButton || !state.objective) return;
  const rank = state.game.progressionRank;
  state.hudButton.querySelector('strong').textContent = String(rank);
  state.hudButton.querySelector('small').textContent = state.rankState?.phase1Implemented
    ? `→ ${state.rankState.nextRank}`
    : 'PHASE 1';

  const tutorialPanel = document.querySelector('.objective-panel');
  const tutorialComplete = Number(state.game.tutorialStep || 0) >= TUTORIAL.length;
  if (!tutorialComplete) {
    if (tutorialPanel) tutorialPanel.hidden = false;
    state.objective.hidden = true;
    return;
  }

  if (tutorialPanel) tutorialPanel.hidden = true;
  state.objective.hidden = false;
  const eyebrow = state.objective.querySelector('[data-rank-objective-label]');
  const title = state.objective.querySelector('[data-rank-objective-title]');
  const detail = state.objective.querySelector('[data-rank-objective-detail]');
  const progress = state.objective.querySelector('[data-rank-objective-progress]');
  eyebrow.textContent = state.rankState?.phase1Implemented ? `RANK ${rank} → ${state.rankState.nextRank}` : `RANK ${rank}`;
  title.textContent = state.rankState?.phase1Implemented ? state.rankState.title : 'Phase 1 完了';
  detail.textContent = state.rankState?.phase1Implemented
    ? state.rankState.required.description
    : 'Progression / Research基盤まで実装済み。次の設備・探索システムは次Phaseで追加します。';
  progress.textContent = rankProgressText(state.rankState);
}

function optionalProgress(optional) {
  if (optional.metric === 'lifetimeRevenue') return `$${Math.floor(optional.value).toLocaleString('ja-JP')} / $${optional.target.toLocaleString('ja-JP')}`;
  return `${Math.floor(optional.value)} / ${optional.target}`;
}

function researchStatusText(entry, result) {
  if (result.complete) return 'RESEARCHED';
  if (result.status === 'blueprint-locked') return 'BLUEPRINT REQUIRED';
  if (result.status === 'rank-locked') return `RANK ${entry.rank} REQUIRED`;
  if (result.status === 'data-locked') return 'RESEARCH DATA REQUIRED';
  return 'AVAILABLE';
}

function renderPanel() {
  if (!state.panel || state.panel.hidden || !state.game) return;
  const rank = state.game.progressionRank;
  const rankState = state.rankState;
  const migration = state.game.progression?.migratedFromLegacy && state.game.progression?.migrationNote
    ? `<div class="progression-legacy"><strong>LEGACY SAVE</strong><span>${state.game.progression.migrationNote}</span></div>`
    : '';

  const required = rankState?.phase1Implemented ? `
    <article class="rank-required ${rankState.required.done ? 'is-complete' : ''}">
      <span>REQUIRED</span>
      <div><strong>${rankState.required.title}</strong><small>${rankState.required.description}</small></div>
      <em>${rankState.required.done ? '✓' : '—'}</em>
    </article>` : '';
  const optionals = rankState?.phase1Implemented ? rankState.optionals.map((goal) => `
    <article class="rank-optional ${goal.done ? 'is-complete' : ''}">
      <span>${goal.done ? '✓' : ''}</span>
      <div><strong>${goal.title}</strong><small>${optionalProgress(goal)}</small></div>
    </article>`).join('') : '<p class="progression-empty">Rank 3以降の目標は次の実装Phaseで追加します。</p>';

  const researchRows = RESEARCH.map((entry) => {
    const result = researchState(state.game, entry);
    const unlockText = (entry.unlocks || []).map((unlock) => unlock.replace('building:', '設備: ').replace('area:', 'エリア: ')).join(' / ');
    return `
      <article class="research-row research-row--${result.status}">
        <div class="research-row__meta"><span>${entry.category.toUpperCase()}</span><em>RANK ${entry.rank}</em></div>
        <div class="research-row__body">
          <strong>${entry.title}</strong><p>${entry.description}</p><small>${unlockText}${entry.blueprint ? ` / Blueprint: ${entry.blueprint}` : ''}${entry.researchData?.length ? ` / Data: ${entry.researchData.join(', ')}` : ''}</small>
        </div>
        <div class="research-row__action">
          <span>${researchStatusText(entry, result)}</span>
          <button type="button" class="secondary-action" data-research="${entry.id}" ${result.available ? '' : 'disabled'}>${result.complete ? '研究済み' : '研究する'}</button>
        </div>
      </article>`;
  }).join('');

  const unlocks = (state.game.progression?.unlocks || []).map((unlock) => `<span>${unlock}</span>`).join('') || '<small>まだResearch Unlockはありません。</small>';

  state.panel.querySelector('#progression-content').innerHTML = `
    <section class="progression-rank-hero">
      <div><span>PROGRESSION RANK</span><strong>${rank}</strong></div>
      <div><h3>${rankState?.phase1Implemented ? rankState.title : 'Phase 1 完了'}</h3><p>${rankProgressText(rankState)}</p></div>
      ${rankState?.phase1Implemented ? `<button id="rank-up-action" class="primary-action" type="button" ${rankState.eligible ? '' : 'disabled'}>Rank ${rankState.nextRank}へ昇格</button>` : '<strong class="phase-complete-label">NEXT PHASE</strong>'}
    </section>
    ${migration}
    <div class="progression-columns">
      <section class="progression-section">
        <header><span>RANK GOALS</span><h3>昇格条件</h3></header>
        ${required}
        <div class="rank-optionals">
          <div class="rank-optionals__head"><strong>選択目標</strong><span>${rankState?.optionalDone || 0} / ${rankState?.optionalRequired || 0} 達成</span></div>
          ${optionals}
        </div>
      </section>
      <section class="progression-section">
        <header><span>UNLOCKS</span><h3>現在の解放</h3></header>
        <div class="progression-unlocks">${unlocks}</div>
        <p class="progression-note">AchievementはFactory Titleとして別管理。Progression RankはAchievement数から決まりません。</p>
      </section>
    </div>
    <section class="progression-section progression-section--research">
      <header><span>RESEARCH</span><h3>Research Tier</h3></header>
      <p class="progression-note">通常Researchは必要Rankで解放。特殊ResearchはRankに加えて探索でBlueprintとResearch Dataを見つける必要があります。</p>
      <div class="research-list">${researchRows}</div>
    </section>
  `;

  state.panel.querySelector('#rank-up-action')?.addEventListener('click', () => {
    const result = completeRankUp(state.game, state.context);
    if (!result.ok) {
      featureToast(result.reason, 'warn');
      return;
    }
    saveProgression(result.game, `Progression Rank ${result.previousRank} → ${result.nextRank}`);
  });
  state.panel.querySelectorAll('[data-research]').forEach((button) => {
    button.addEventListener('click', () => {
      const result = completeResearch(state.game, button.dataset.research);
      if (!result.ok) {
        featureToast(result.reason, 'warn');
        return;
      }
      saveProgression(result.game, `Research完了：${result.research.title}`);
    });
  });
}

function refresh() {
  const { game } = readGame();
  state.game = game;
  state.context = progressionRouteContext(game);
  state.rankState = evaluateRank(game, state.context);
  applyBuildUnlocks(game);
  renderHud();
  renderPanel();
  patchFactoryTitle();
}

function gameplayReady() {
  const hud = document.querySelector('#hud');
  const boot = document.querySelector('#boot-screen');
  return Boolean(hud && !hud.hidden && boot?.hidden);
}

function acquireOverlayCarrier() {
  if (!gameplayReady()) return false;
  const openGuide = document.querySelector('#open-guide-hud');
  const guide = document.querySelector('#guide-panel');
  if (!openGuide || !guide) return false;
  openGuide.click();
  guide.hidden = true;
  return true;
}

function openProgression({ fromManagement = false } = {}) {
  if (!state.panel || !state.panel.hidden) return;
  const management = document.querySelector('#factory-management-panel');
  if (fromManagement && management && !management.hidden) {
    state.returnToManagement = true;
    management.hidden = true;
  } else {
    if ([...document.querySelectorAll('.overlay-panel')].some((panel) => panel !== state.panel && !panel.hidden)) return;
    if (!acquireOverlayCarrier()) return;
    state.returnToManagement = false;
  }
  refresh();
  state.panel.hidden = false;
  renderPanel();
}

function closeProgression() {
  if (!state.panel || state.panel.hidden) return;
  state.panel.hidden = true;
  if (state.returnToManagement) {
    const management = document.querySelector('#factory-management-panel');
    if (management) management.hidden = false;
    state.returnToManagement = false;
    return;
  }
  document.querySelector('#close-guide')?.click();
}

function ensureStylesheet() {
  if (document.querySelector('link[data-progression-ui]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './progression.css';
  link.dataset.progressionUi = 'true';
  document.head.append(link);
}

function createUi() {
  if (document.querySelector('#progression-panel')) return;
  ensureStylesheet();
  const shell = document.querySelector('.game-shell');
  const hud = document.querySelector('#hud');
  const tabs = document.querySelector('.factory-tabs');
  if (!shell || !hud || !tabs) return;

  const hudButton = document.createElement('button');
  hudButton.id = 'progression-hud';
  hudButton.className = 'progression-hud';
  hudButton.type = 'button';
  hudButton.innerHTML = '<span>RANK</span><strong>1</strong><small>→ 2</small>';
  hudButton.addEventListener('click', () => openProgression());
  hud.append(hudButton);
  state.hudButton = hudButton;

  const objective = document.createElement('aside');
  objective.id = 'progression-objective';
  objective.className = 'progression-objective';
  objective.hidden = true;
  objective.innerHTML = `
    <div><span data-rank-objective-label>RANK 1 → 2</span><strong data-rank-objective-progress>必須 0/1 / 選択 0/2</strong></div>
    <h2 data-rank-objective-title>最初の自動化</h2>
    <p data-rank-objective-detail></p>
  `;
  hud.append(objective);
  state.objective = objective;

  const progressionTab = document.createElement('button');
  progressionTab.type = 'button';
  progressionTab.dataset.progressionTab = 'true';
  progressionTab.textContent = '進行 / Research';
  progressionTab.addEventListener('click', () => openProgression({ fromManagement: true }));
  tabs.prepend(progressionTab);

  const panel = document.createElement('section');
  panel.id = 'progression-panel';
  panel.className = 'progression-panel overlay-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Progression Rank / Research');
  panel.innerHTML = `
    <div class="progression-card">
      <header class="progression-header">
        <div><p class="panel-kicker">FACTORY PROGRESSION</p><h2>進行 / Research</h2><p>Rankは工場の大きな進行、ResearchはRank内で設備・技術を解放します。</p></div>
        <button id="close-progression" class="icon-button" type="button" aria-label="進行画面を閉じる">×</button>
      </header>
      <div id="progression-content" class="progression-content"></div>
    </div>
  `;
  shell.append(panel);
  state.panel = panel;
  panel.querySelector('#close-progression').addEventListener('click', closeProgression);

  const buildList = document.querySelector('#build-list');
  if (buildList) {
    state.buildObserver = new MutationObserver(syncBuildMenuLocks);
    state.buildObserver.observe(buildList, { childList: true, subtree: true });
  }
  const managementContent = document.querySelector('#factory-management-content');
  if (managementContent) {
    state.managementObserver = new MutationObserver(patchFactoryTitle);
    state.managementObserver.observe(managementContent, { childList: true, subtree: true, characterData: true });
  }
}

function bindGlobalKeys() {
  window.addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (state.panel && !state.panel.hidden && (event.code === 'Escape' || event.code === 'KeyP')) {
      event.preventDefault();
      event.stopPropagation();
      closeProgression();
      return;
    }
    const quickType = { Digit2: 'smelter', Digit4: 'storage' }[event.code];
    if (!quickType || !BUILDINGS[quickType]?.progressionLocked) return;
    if (!gameplayReady()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    featureToast(`${BUILDINGS[quickType].name}は未解放です。${researchLabelForBuilding(quickType)}を確認してください。`, 'warn');
  }, true);
}

function waitForManagement() {
  if (!document.querySelector('#factory-management-panel')) {
    window.setTimeout(waitForManagement, 80);
    return;
  }
  createUi();
  refresh();
  window.setInterval(refresh, POLL_MS);
}

if (isBrowser) {
  bindGlobalKeys();
  try {
    const { game } = readGame();
    applyBuildUnlocks(game);
  } catch {
    // Storage may be temporarily unavailable during startup; refresh retries later.
  }
  waitForManagement();
}
