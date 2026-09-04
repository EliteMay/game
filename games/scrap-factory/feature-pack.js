import { BUILDINGS, BUILD_MENU_ORDER, ITEMS, RECIPES, SAVE_KEY } from './config.js';
import { analyzeFactory, CHALLENGES, challengeState, formatDuration, planProduction } from './factory-management.js';

const META_KEY = 'scrap-factory-management-v1';
const POLL_MS = 1000;
const LOG_LIMIT = 80;

const state = {
  meta: loadMeta(),
  panel: null,
  activeTab: 'console',
  logs: [],
  startedAt: Date.now(),
  startRevenue: null,
  startCash: null,
  latestGame: null,
  latestRoot: null,
  factory: null,
  revenueNow: 0,
  cashNow: 0,
};

function loadMeta() {
  try {
    const parsed = JSON.parse(localStorage.getItem(META_KEY) || '{}');
    return {
      unlockedChallenges: Array.isArray(parsed.unlockedChallenges) ? parsed.unlockedChallenges : [],
      pinnedChallenge: typeof parsed.pinnedChallenge === 'string' ? parsed.pinnedChallenge : null,
      plannerTarget: typeof parsed.plannerTarget === 'string' ? parsed.plannerTarget : 'iron_ingot',
      plannerRate: Number.isFinite(Number(parsed.plannerRate)) ? Number(parsed.plannerRate) : 30,
    };
  } catch {
    return { unlockedChallenges: [], pinnedChallenge: null, plannerTarget: 'iron_ingot', plannerRate: 30 };
  }
}

function saveMeta() {
  localStorage.setItem(META_KEY, JSON.stringify(state.meta));
}

function readSave() {
  try {
    const root = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    return { root, game: root?.games?.['scrap-factory'] || null };
  } catch {
    return { root: null, game: null };
  }
}

function parseCurrency(text) {
  const number = Number(String(text || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function liveValues() {
  return {
    cash: parseCurrency(document.querySelector('#money-value')?.textContent),
    revenue: parseCurrency(document.querySelector('#revenue-value')?.textContent),
  };
}

function ensureStylesheet() {
  if (document.querySelector('link[data-factory-management]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './factory-management.css';
  link.dataset.factoryManagement = 'true';
  document.head.append(link);
}

function createUi() {
  ensureStylesheet();
  const shell = document.querySelector('.game-shell');
  const hud = document.querySelector('#hud');
  if (!shell || !hud || document.querySelector('#factory-management-panel')) return;

  const hudButton = document.createElement('button');
  hudButton.id = 'factory-management-hud';
  hudButton.className = 'factory-management-hud';
  hudButton.type = 'button';
  hudButton.innerHTML = '<kbd>P</kbd><span>FACTORY</span><strong id="factory-alert-count">0</strong>';
  hudButton.addEventListener('click', () => openManagement('console'));
  hud.append(hudButton);

  const pin = document.createElement('aside');
  pin.id = 'factory-challenge-pin';
  pin.className = 'factory-challenge-pin';
  pin.hidden = true;
  hud.append(pin);

  const panel = document.createElement('section');
  panel.id = 'factory-management-panel';
  panel.className = 'factory-management-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', '工場管理コンソール');
  panel.innerHTML = `
    <div class="factory-management-card">
      <header class="factory-management-header">
        <div>
          <p class="panel-kicker">FACTORY OS / MANAGEMENT</p>
          <h2>工場管理コンソール</h2>
          <p>統計・警告・チャレンジ・生産計画・Codexを1か所で確認できます。</p>
        </div>
        <button id="close-factory-management" class="icon-button" type="button" aria-label="工場管理を閉じる">×</button>
      </header>
      <nav class="factory-tabs" aria-label="工場管理タブ">
        <button type="button" data-tab="console">コンソール</button>
        <button type="button" data-tab="challenges">チャレンジ</button>
        <button type="button" data-tab="planner">生産計画</button>
        <button type="button" data-tab="codex">Codex</button>
        <button type="button" data-tab="log">ログ</button>
      </nav>
      <div id="factory-management-content" class="factory-management-content"></div>
    </div>
  `;
  shell.append(panel);
  state.panel = panel;

  panel.querySelector('#close-factory-management').addEventListener('click', closeManagement);
  panel.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.tab;
      renderPanel();
    });
  });
}

function gameplayReady() {
  const hud = document.querySelector('#hud');
  const boot = document.querySelector('#boot-screen');
  return Boolean(hud && !hud.hidden && boot?.hidden);
}

function otherOverlayOpen() {
  return [...document.querySelectorAll('.overlay-panel')].some((panel) => !panel.hidden);
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

function openManagement(tab = 'console') {
  if (!state.panel) return;
  if (!state.panel.hidden) {
    state.activeTab = tab;
    renderPanel();
    return;
  }
  if (!acquireOverlayCarrier()) return;
  state.activeTab = tab;
  state.panel.hidden = false;
  renderPanel();
}

function closeManagement() {
  if (!state.panel || state.panel.hidden) return;
  state.panel.hidden = true;
  const closeGuide = document.querySelector('#close-guide');
  closeGuide?.click();
}

function featureToast(message, tone = 'info') {
  const stack = document.querySelector('#toast-stack');
  if (!stack) return;
  const item = document.createElement('div');
  item.className = `toast toast--${tone}`;
  item.dataset.managementToast = 'true';
  item.textContent = message;
  stack.append(item);
  requestAnimationFrame(() => item.classList.add('is-visible'));
  window.setTimeout(() => {
    item.classList.remove('is-visible');
    window.setTimeout(() => item.remove(), 220);
  }, 2800);
}

function startToastObserver() {
  const stack = document.querySelector('#toast-stack');
  if (!stack) return;
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement) || !node.classList.contains('toast') || node.dataset.managementToast) continue;
        const message = node.textContent?.trim();
        if (!message) continue;
        state.logs.unshift({ time: Date.now(), message });
        state.logs = state.logs.slice(0, LOG_LIMIT);
        if (!state.panel?.hidden && state.activeTab === 'log') renderPanel();
      }
    }
  });
  observer.observe(stack, { childList: true });
}

function updateSnapshots() {
  const { root, game } = readSave();
  const live = liveValues();
  state.latestRoot = root;
  state.latestGame = game;
  state.cashNow = live.cash || Number(game?.money || 0);
  state.revenueNow = live.revenue || Number(game?.lifetimeRevenue || 0);
  if (state.startRevenue === null) state.startRevenue = state.revenueNow;
  if (state.startCash === null) state.startCash = state.cashNow;
  state.factory = analyzeFactory(game || {});
  updateChallenges();
  renderHudExtras();
  if (!state.panel?.hidden) renderPanel();
}

function updateChallenges() {
  if (!state.latestGame) return;
  let changed = false;
  for (const challenge of CHALLENGES) {
    const progress = challengeState(state.latestGame, challenge);
    if (!progress.done || state.meta.unlockedChallenges.includes(challenge.id)) continue;
    state.meta.unlockedChallenges.push(challenge.id);
    changed = true;
    featureToast(`実績解除：${challenge.title}`, 'success');
  }
  if (changed) saveMeta();
}

function renderHudExtras() {
  const alertCount = document.querySelector('#factory-alert-count');
  if (alertCount) {
    const warns = state.factory?.alerts?.filter((alert) => alert.severity === 'warn').length || 0;
    alertCount.textContent = String(warns);
    alertCount.hidden = warns === 0;
  }

  const pin = document.querySelector('#factory-challenge-pin');
  if (!pin) return;
  const challenge = CHALLENGES.find((entry) => entry.id === state.meta.pinnedChallenge);
  if (!challenge || !state.latestGame) {
    pin.hidden = true;
    return;
  }
  const progress = challengeState(state.latestGame, challenge);
  pin.hidden = false;
  pin.innerHTML = `<span>TRACKED</span><strong>${challenge.title}</strong><small>${formatChallengeProgress(progress)}</small><i style="--progress:${Math.round(progress.ratio * 100)}%"></i>`;
}

function rankName(count) {
  if (count >= 8) return 'INDUSTRIAL DIRECTOR';
  if (count >= 6) return 'FACTORY ENGINEER';
  if (count >= 4) return 'LINE SUPERVISOR';
  if (count >= 2) return 'SALVAGE TECH';
  return 'YARD HAND';
}

function formatChallengeProgress(progress) {
  if (progress.metric === 'revenue') return `$${Math.floor(progress.value).toLocaleString('ja-JP')} / $${progress.target.toLocaleString('ja-JP')}`;
  if (progress.metric === 'playtime') return `${formatDuration(progress.value)} / ${formatDuration(progress.target)}`;
  return `${Math.floor(progress.value)} / ${progress.target}`;
}

function revenuePerMinute() {
  const elapsedMinutes = Math.max(1 / 60, (Date.now() - state.startedAt) / 60000);
  return Math.max(0, (state.revenueNow - Number(state.startRevenue || 0)) / elapsedMinutes);
}

function summaryCard(label, value, note = '') {
  return `<article class="management-stat"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ''}</article>`;
}

function renderConsole() {
  const game = state.latestGame || {};
  const factory = state.factory || analyzeFactory(game);
  const alerts = factory.alerts || [];
  const typeRows = Object.entries(factory.counts || {})
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `<div><span>${BUILDINGS[type]?.name || type}</span><strong>${count}</strong></div>`)
    .join('') || '<p class="management-empty">設備がありません。</p>';
  const alertRows = alerts.slice(0, 12).map((alert) => `
    <article class="factory-alert factory-alert--${alert.severity}">
      <strong>${alert.title}</strong><span>${alert.detail}</span>
    </article>
  `).join('') || '<p class="management-empty">現在検出できる問題はありません。</p>';

  return `
    <section class="management-stat-grid">
      ${summaryCard('現在資金', `$${Math.floor(state.cashNow).toLocaleString('ja-JP')}`)}
      ${summaryCard('累計売上', `$${Math.floor(state.revenueNow).toLocaleString('ja-JP')}`)}
      ${summaryCard('今セッション売上/分', `$${revenuePerMinute().toFixed(1)}`)}
      ${summaryCard('設置設備', factory.totalBuildings, `自作 ${factory.playerBuilt}`)}
      ${summaryCard('稼働可能', factory.activeMachines, `素材待ち ${factory.waitingMachines}`)}
      ${summaryCard('設備内アイテム', factory.bufferedItems)}
      ${summaryCard('発見アイテム', (game.discoveredItems || []).length, `${Object.keys(ITEMS).length}種類中`)}
      ${summaryCard('プレイ時間', formatDuration(game.playTimeSeconds || 0))}
    </section>
    <div class="management-two-column">
      <section class="management-section">
        <div class="management-section__head"><div><span>FACTORY HEALTH</span><h3>工場アラート</h3></div><strong>${alerts.length}</strong></div>
        <p class="management-help">素材不足は情報、出力滞留は要確認です。コンベアの矢印と搬送先を確認してください。</p>
        <div class="factory-alert-list">${alertRows}</div>
      </section>
      <section class="management-section">
        <div class="management-section__head"><div><span>ASSET SUMMARY</span><h3>設備構成</h3></div></div>
        <div class="factory-count-list">${typeRows}</div>
        <div class="management-tip"><strong>クイック建築</strong><span><kbd>1</kbd> 粉砕 / <kbd>2</kbd> 精錬 / <kbd>3</kbd> コンベア / <kbd>4</kbd> 倉庫 / <kbd>5</kbd> 販売</span></div>
      </section>
    </div>
  `;
}

function renderChallenges() {
  const unlocked = state.meta.unlockedChallenges.length;
  const rows = CHALLENGES.map((challenge) => {
    const progress = challengeState(state.latestGame || {}, challenge);
    const complete = state.meta.unlockedChallenges.includes(challenge.id);
    const pinned = state.meta.pinnedChallenge === challenge.id;
    return `
      <article class="challenge-row${complete ? ' is-complete' : ''}">
        <div class="challenge-row__state">${complete ? '✓' : Math.round(progress.ratio * 100) + '%'}</div>
        <div class="challenge-row__body">
          <strong>${challenge.title}</strong><span>${challenge.description}</span>
          <div class="challenge-progress"><i style="width:${Math.round(progress.ratio * 100)}%"></i></div>
          <small>${formatChallengeProgress(progress)}</small>
        </div>
        <button type="button" data-pin-challenge="${challenge.id}" class="secondary-action">${pinned ? '追跡解除' : 'HUDで追跡'}</button>
      </article>
    `;
  }).join('');
  return `
    <div class="management-rank">
      <span>FACTORY RANK</span><strong>${rankName(unlocked)}</strong><small>${unlocked} / ${CHALLENGES.length} 実績解除</small>
    </div>
    <section class="challenge-list">${rows}</section>
  `;
}

function plannerTargets() {
  const outputIds = new Set();
  for (const recipe of Object.values(RECIPES)) for (const itemId of Object.keys(recipe.output)) outputIds.add(itemId);
  return [...outputIds];
}

function renderPlanner() {
  const target = ITEMS[state.meta.plannerTarget] ? state.meta.plannerTarget : plannerTargets()[0];
  const rate = Math.max(1, Number(state.meta.plannerRate || 30));
  const plan = planProduction(target, rate);
  const options = plannerTargets().map((id) => `<option value="${id}"${id === target ? ' selected' : ''}>${ITEMS[id]?.name || id}</option>`).join('');
  const lines = plan.lines.map((line) => {
    if (line.kind === 'raw') return `<div class="planner-line" style="--depth:${line.depth}"><span>RAW</span><strong>${ITEMS[line.itemId]?.name || line.itemId}</strong><em>${line.rate.toFixed(1)}/分 必要</em></div>`;
    return `<div class="planner-line" style="--depth:${line.depth}"><span>MACHINE</span><strong>${BUILDINGS[line.machine]?.name || line.machine}</strong><em>${line.machines.toFixed(2)}台 → ${ITEMS[line.itemId]?.name || line.itemId} ${line.rate.toFixed(1)}/分</em></div>`;
  }).join('');
  return `
    <section class="management-section">
      <div class="management-section__head"><div><span>PRODUCTION PLANNER</span><h3>必要設備を逆算</h3></div></div>
      <p class="management-help">欲しい生産量を入力すると、現在実装済みレシピから必要な機械数と原料量を逆算します。</p>
      <div class="planner-controls">
        <label><span>作りたい物</span><select id="planner-target">${options}</select></label>
        <label><span>目標 / 分</span><input id="planner-rate" type="number" min="1" max="10000" step="1" value="${rate}"></label>
      </div>
      <div class="planner-result">${lines || '<p class="management-empty">計算できるレシピがありません。</p>'}</div>
    </section>
    <section class="management-section">
      <div class="management-section__head"><div><span>BUILD COST</span><h3>現在の設備価格</h3></div></div>
      <div class="factory-count-list">${BUILD_MENU_ORDER.map((type) => `<div><span>${BUILDINGS[type]?.name || type}</span><strong>$${BUILDINGS[type]?.cost || 0}</strong></div>`).join('')}</div>
    </section>
  `;
}

function categoryLabel(category) {
  return { raw: 'RAW', processed: 'PROCESSED', product: 'PRODUCT' }[category] || String(category || '').toUpperCase();
}

function renderCodex() {
  const itemRows = Object.values(ITEMS).sort((a, b) => b.value - a.value).map((item) => `
    <article class="codex-item" data-search="${item.name.toLowerCase()} ${item.id.toLowerCase()} ${item.category}">
      <i style="--item-color:#${item.color.toString(16).padStart(6, '0')}"></i>
      <div><span>${categoryLabel(item.category)}</span><strong>${item.name}</strong><small>1枠 ${item.stack}個</small></div>
      <em>$${item.value}</em>
    </article>
  `).join('');
  const buildingRows = BUILD_MENU_ORDER.map((type) => {
    const def = BUILDINGS[type];
    const recipe = def.recipe ? RECIPES[def.recipe] : null;
    const flow = recipe ? `${Object.keys(recipe.input).map((id) => ITEMS[id]?.name || id).join(' + ')} → ${Object.keys(recipe.output).map((id) => ITEMS[id]?.name || id).join(' + ')}` : '';
    return `<article class="codex-building" data-search="${def.name.toLowerCase()} ${type} ${def.description.toLowerCase()}"><div><span>${def.category.toUpperCase()}</span><strong>${def.name}</strong><p>${def.description}</p>${flow ? `<small>${flow} / ${recipe.seconds.toFixed(1)}秒</small>` : ''}</div><em>$${def.cost}</em></article>`;
  }).join('');
  return `
    <div class="codex-toolbar"><input id="codex-search" type="search" placeholder="アイテム・設備を検索"></div>
    <div class="management-two-column">
      <section class="management-section"><div class="management-section__head"><div><span>MARKET / ITEMS</span><h3>アイテム図鑑</h3></div></div><div id="codex-items" class="codex-list">${itemRows}</div></section>
      <section class="management-section"><div class="management-section__head"><div><span>CONSTRUCTION</span><h3>設備図鑑</h3></div></div><div id="codex-buildings" class="codex-list">${buildingRows}</div></section>
    </div>
  `;
}

function renderLog() {
  const rows = state.logs.map((entry) => `<div class="session-log-row"><time>${new Date(entry.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time><span>${entry.message}</span></div>`).join('');
  return `
    <section class="management-section">
      <div class="management-section__head"><div><span>SESSION EVENT LOG</span><h3>今回の行動ログ</h3></div><strong>${state.logs.length}</strong></div>
      <p class="management-help">拾った物、売却、建築、撤去、目標進行などゲーム内通知をこのセッションだけ記録します。セーブ容量は消費しません。</p>
      <div class="session-log">${rows || '<p class="management-empty">まだイベントがありません。</p>'}</div>
    </section>
  `;
}

function renderPanel() {
  if (!state.panel || state.panel.hidden) return;
  state.panel.querySelectorAll('[data-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.tab === state.activeTab));
  const content = state.panel.querySelector('#factory-management-content');
  if (!content) return;
  if (state.activeTab === 'console') content.innerHTML = renderConsole();
  else if (state.activeTab === 'challenges') content.innerHTML = renderChallenges();
  else if (state.activeTab === 'planner') content.innerHTML = renderPlanner();
  else if (state.activeTab === 'codex') content.innerHTML = renderCodex();
  else content.innerHTML = renderLog();
  bindPanelActions();
}

function bindPanelActions() {
  state.panel?.querySelectorAll('[data-pin-challenge]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.pinChallenge;
      state.meta.pinnedChallenge = state.meta.pinnedChallenge === id ? null : id;
      saveMeta();
      renderHudExtras();
      renderPanel();
    });
  });

  const target = state.panel?.querySelector('#planner-target');
  const rate = state.panel?.querySelector('#planner-rate');
  if (target) target.addEventListener('change', () => {
    state.meta.plannerTarget = target.value;
    saveMeta();
    renderPanel();
  });
  if (rate) rate.addEventListener('change', () => {
    state.meta.plannerRate = Math.max(1, Number(rate.value || 1));
    saveMeta();
    renderPanel();
  });

  const search = state.panel?.querySelector('#codex-search');
  if (search) search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    state.panel.querySelectorAll('[data-search]').forEach((row) => {
      row.hidden = Boolean(query) && !row.dataset.search.includes(query);
    });
  });
}

function quickBuild(index) {
  if (!gameplayReady() || otherOverlayOpen() || !state.panel?.hidden) return;
  const buildButton = document.querySelector('#open-build-menu');
  if (!buildButton) return;
  buildButton.click();
  const options = [...document.querySelectorAll('#build-list .build-option')];
  const option = options[index];
  if (!option || option.disabled) {
    document.querySelector('#close-build')?.click();
    featureToast('クイック建築：資金不足または設備を選べません', 'warn');
    return;
  }
  option.click();
}

function bindKeys() {
  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;

    if (!state.panel?.hidden) {
      if (event.code === 'Escape' || event.code === 'KeyP') {
        event.preventDefault();
        closeManagement();
      }
      return;
    }

    if (event.code === 'KeyP') {
      if (!gameplayReady() || otherOverlayOpen()) return;
      event.preventDefault();
      openManagement('console');
      return;
    }

    const quickIndex = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4 }[event.code];
    if (quickIndex !== undefined) {
      event.preventDefault();
      quickBuild(quickIndex);
    }
  }, true);
}

function waitForGame() {
  if (!window.__scrapFactoryBooted) {
    window.setTimeout(waitForGame, 120);
    return;
  }
  createUi();
  startToastObserver();
  bindKeys();
  updateSnapshots();
  window.setInterval(updateSnapshots, POLL_MS);
  featureToast('Factory Management追加：Pで工場コンソール / 1〜5でクイック建築', 'info');
}

waitForGame();
