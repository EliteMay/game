import { BUILDINGS, BUILD_MENU_ORDER, ITEMS, RECIPES, SAVE_KEY } from './config.js';
import { analyzeFactory, CHALLENGES, challengeState, formatDuration, planProduction } from './factory-management.js';

const META_KEY = 'scrap-factory-management-v1';
const POLL_MS = 1000;
const LOG_LIMIT = 80;
const DIAGNOSTIC_WARN_LIMIT = 24;
const DIAGNOSTIC_INFO_LIMIT = 10;
const DIAGNOSTIC_HEALTHY_LIMIT = 6;
const DIAGNOSTIC_HEALTHY_RANGE = 12;

const state = {
  meta: loadMeta(),
  panel: null,
  activeTab: 'overview',
  logs: [],
  startedAt: Date.now(),
  startRevenue: null,
  startCash: null,
  latestGame: null,
  latestRoot: null,
  factory: null,
  revenueNow: 0,
  cashNow: 0,
  diagnosticOverlay: null,
  diagnosticEnabled: false,
  diagnosticFocusId: null,
  diagnosticLabels: new Map(),
  diagnosticFrame: 0,
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

function runtimeWorld() {
  return window.__scrapFactoryRuntime?.world || null;
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

  const diagnosticButton = document.createElement('button');
  diagnosticButton.id = 'factory-diagnostics-hud';
  diagnosticButton.className = 'factory-diagnostics-hud';
  diagnosticButton.type = 'button';
  diagnosticButton.innerHTML = '<kbd>V</kbd><span>DIAGNOSTICS</span><strong id="diagnostic-problem-count" hidden>0</strong>';
  diagnosticButton.addEventListener('click', () => toggleDiagnostics());
  hud.append(diagnosticButton);

  const hudButton = document.createElement('button');
  hudButton.id = 'factory-management-hud';
  hudButton.className = 'factory-management-hud';
  hudButton.type = 'button';
  hudButton.innerHTML = '<kbd>P</kbd><span>FACTORY</span><strong id="factory-alert-count">0</strong>';
  hudButton.addEventListener('click', () => openManagement('overview'));
  hud.append(hudButton);

  const pin = document.createElement('aside');
  pin.id = 'factory-challenge-pin';
  pin.className = 'factory-challenge-pin';
  pin.hidden = true;
  hud.append(pin);

  const diagnosticOverlay = document.createElement('aside');
  diagnosticOverlay.id = 'factory-diagnostic-overlay';
  diagnosticOverlay.className = 'factory-diagnostic-overlay';
  diagnosticOverlay.hidden = true;
  diagnosticOverlay.setAttribute('aria-label', '工場診断オーバーレイ');
  diagnosticOverlay.innerHTML = `
    <header class="factory-diagnostic-overlay__header">
      <div><span>FACTORY DIAGNOSTICS</span><strong data-diagnostic-summary>問題を確認中</strong></div>
      <small><kbd>V</kbd> CLOSE</small>
    </header>
    <div class="factory-diagnostic-overlay__layer" data-diagnostic-layer></div>
  `;
  shell.append(diagnosticOverlay);
  state.diagnosticOverlay = diagnosticOverlay;

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
          <p>工場全体を概要 → 問題 → 生産の順で確認し、必要な場所だけ詳しく調べます。</p>
        </div>
        <button id="close-factory-management" class="icon-button" type="button" aria-label="工場管理を閉じる">×</button>
      </header>
      <nav class="factory-tabs" aria-label="工場管理タブ">
        <button type="button" data-tab="overview">概要</button>
        <button type="button" data-tab="problems">問題</button>
        <button type="button" data-tab="production">生産</button>
        <button type="button" data-tab="planner">生産計画</button>
        <button type="button" data-tab="challenges">チャレンジ</button>
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

function openManagement(tab = 'overview') {
  if (!state.panel) return;
  setDiagnostics(false);
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
  if (state.diagnosticEnabled) syncDiagnosticLabels();
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
  const warnings = state.factory?.diagnostics?.filter((entry) => entry.severity === 'warn').length || 0;
  const problems = state.factory?.diagnosticProblemCount || 0;

  const alertCount = document.querySelector('#factory-alert-count');
  if (alertCount) {
    alertCount.textContent = String(warnings);
    alertCount.hidden = warnings === 0;
  }

  const diagnosticCount = document.querySelector('#diagnostic-problem-count');
  if (diagnosticCount) {
    diagnosticCount.textContent = String(problems);
    diagnosticCount.hidden = problems === 0;
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

function severityOrder(severity) {
  if (severity === 'warn') return 0;
  if (severity === 'info') return 1;
  return 2;
}

function diagnosticIcon(severity) {
  if (severity === 'warn') return '!';
  if (severity === 'info') return 'i';
  return '✓';
}

function renderOverview() {
  const game = state.latestGame || {};
  const factory = state.factory || analyzeFactory(game);
  const power = factory.power || {};
  const production = factory.production || {};
  const machineTotal = Number(factory.activeMachines || 0) + Number(factory.waitingMachines || 0);
  const warnings = (factory.diagnostics || []).filter((entry) => entry.severity === 'warn').length;
  const storageNote = factory.storageCapacity > 0 ? `満杯 ${factory.storageFull || 0}台` : 'Storage未設置';
  const powerNote = !power.enabled ? 'Rank 4で有効' : power.status === 'shortage' ? `ALERT / 範囲外 ${power.uncovered || 0}` : `余力 ${Math.floor(power.reserve || 0)}`;
  const throughput = `${Number(production.routeSupportedPerMinute || 0).toFixed(1)} / ${Number(production.theoreticalPerMinute || 0).toFixed(1)}`;
  const problemRows = (factory.diagnostics || [])
    .filter((entry) => entry.severity !== 'ok')
    .sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
    .slice(0, 6)
    .map((entry) => `
      <article class="factory-alert factory-alert--${entry.severity}">
        <strong>${entry.name}: ${entry.status}</strong><span>${entry.detail}</span>
      </article>
    `).join('') || '<p class="management-empty">現在、診断対象の問題はありません。</p>';

  return `
    <section class="management-stat-grid management-stat-grid--overview">
      ${summaryCard('MACHINES', `${factory.activeMachines} / ${machineTotal}`, `稼働可能 / 対象 ${machineTotal}`)}
      ${summaryCard('PROBLEMS', factory.diagnosticProblemCount || 0, `Warning ${warnings}`)}
      ${summaryCard('PRODUCTION', throughput, '搬送対応 / 理論 個/分')}
      ${summaryCard('POWER', `${Math.floor(power.generation || 0)} / ${Math.floor(power.demand || 0)}`, powerNote)}
      ${summaryCard('STORAGE', `${factory.storageUsed || 0} / ${factory.storageCapacity || 0}`, storageNote)}
      ${summaryCard('CASH', `$${Math.floor(state.cashNow).toLocaleString('ja-JP')}`, `累計 $${Math.floor(state.revenueNow).toLocaleString('ja-JP')}`)}
    </section>
    <div class="management-two-column">
      <section class="management-section">
        <div class="management-section__head"><div><span>FACTORY HEALTH</span><h3>優先して見る問題</h3></div><strong>${factory.diagnosticProblemCount || 0}</strong></div>
        <p class="management-help">原因を先に確認し、場所を探すときは「問題」タブの LOCATE または <kbd>V</kbd> 診断Overlayを使います。</p>
        <div class="factory-alert-list">${problemRows}</div>
      </section>
      <section class="management-section">
        <div class="management-section__head"><div><span>OPERATING PICTURE</span><h3>工場の状態</h3></div></div>
        <div class="factory-health-list">
          <div><span>Machine utilization</span><strong>${Math.round(Number(production.utilization || 0) * 100)}%</strong></div>
          <div><span>Logistics nodes</span><strong>${factory.logisticsNodes || 0}</strong></div>
          <div><span>Logistics capacity</span><strong>${Number(factory.logisticsCapacity || 0).toFixed(1)}/秒</strong></div>
          <div><span>Bottlenecks</span><strong>${production.bottleneckCount || 0}</strong></div>
          <div><span>Buffered items</span><strong>${factory.bufferedItems || 0}</strong></div>
          <div><span>Session revenue/min</span><strong>$${revenuePerMinute().toFixed(1)}</strong></div>
        </div>
      </section>
    </div>
  `;
}

function renderProblems() {
  const factory = state.factory || analyzeFactory(state.latestGame || {});
  const systemAlerts = (factory.alerts || []).filter((alert) => !alert.buildingId);
  const problems = (factory.diagnostics || [])
    .filter((entry) => entry.severity !== 'ok')
    .sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity) || String(a.name).localeCompare(String(b.name)));

  const systemRows = systemAlerts.map((alert) => `
    <article class="problem-row problem-row--${alert.severity}">
      <div class="problem-row__icon">${diagnosticIcon(alert.severity)}</div>
      <div><span>SYSTEM</span><strong>${alert.title}</strong><small>${alert.detail}</small></div>
    </article>
  `).join('');

  const rows = problems.map((entry) => `
    <article class="problem-row problem-row--${entry.severity}">
      <div class="problem-row__icon">${diagnosticIcon(entry.severity)}</div>
      <div class="problem-row__body">
        <span>${entry.type.toUpperCase()}</span>
        <strong>${entry.name} — ${entry.status}</strong>
        <small>${entry.detail}</small>
      </div>
      <button class="secondary-action" type="button" data-locate-building="${entry.buildingId}">LOCATE</button>
    </article>
  `).join('');

  return `
    <section class="management-section management-section--problems">
      <div class="management-section__head"><div><span>PROBLEMS / DIAGNOSTICS</span><h3>原因から直す</h3></div><strong>${problems.length}</strong></div>
      <p class="management-help">赤は生産停止やPower/物流の重大要因、灰色は素材待ちや改善候補です。LOCATEで管理画面を閉じ、3D診断Overlay上の対象を強調します。</p>
      <div class="problem-list">${systemRows}${rows || '<p class="management-empty">現在、修正が必要な問題はありません。</p>'}</div>
    </section>
  `;
}

function renderProduction() {
  const factory = state.factory || analyzeFactory(state.latestGame || {});
  const production = factory.production || {};
  const productionTypes = Object.entries(factory.counts || {})
    .filter(([type]) => BUILDINGS[type]?.recipe)
    .sort((a, b) => b[1] - a[1]);
  const rows = productionTypes.map(([type, count]) => {
    const def = BUILDINGS[type];
    const recipe = def?.recipe ? RECIPES[def.recipe] : null;
    const input = Object.entries(recipe?.input || {}).map(([id, n]) => `${ITEMS[id]?.short || ITEMS[id]?.name || id}×${n}`).join(' + ');
    const output = Object.entries(recipe?.output || {}).map(([id, n]) => `${ITEMS[id]?.short || ITEMS[id]?.name || id}×${n}`).join(' + ');
    return `<div class="production-machine-row"><span>${def?.name || type}</span><strong>${count}台</strong><small>${input} → ${output}</small></div>`;
  }).join('') || '<p class="management-empty">生産設備がありません。</p>';

  return `
    <section class="management-stat-grid management-stat-grid--production">
      ${summaryCard('THEORETICAL', `${Number(production.theoreticalPerMinute || 0).toFixed(1)}/分`, '設備の理論生産')}
      ${summaryCard('ROUTE SUPPORTED', `${Number(production.routeSupportedPerMinute || 0).toFixed(1)}/分`, '現在の物流で支えられる量')}
      ${summaryCard('UTILIZATION', `${Math.round(Number(production.utilization || 0) * 100)}%`, `素材待ち ${state.factory?.waitingMachines || 0}`)}
      ${summaryCard('BOTTLENECKS', production.bottleneckCount || 0, `Smart Sorter ${production.smartSorters || 0}`)}
    </section>
    <section class="management-section">
      <div class="management-section__head"><div><span>PRODUCTION FLOW</span><h3>生産設備構成</h3></div></div>
      <p class="management-help">Graphを大量に並べるより、現在のRecipeとどこで能力が落ちているかを優先します。詳細な必要設備数は「生産計画」で逆算できます。</p>
      <div class="production-machine-list">${rows}</div>
    </section>
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
  if (state.activeTab === 'overview' || state.activeTab === 'console') content.innerHTML = renderOverview();
  else if (state.activeTab === 'problems') content.innerHTML = renderProblems();
  else if (state.activeTab === 'production') content.innerHTML = renderProduction();
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

  state.panel?.querySelectorAll('[data-locate-building]').forEach((button) => {
    button.addEventListener('click', () => {
      const buildingId = button.dataset.locateBuilding;
      closeManagement();
      setDiagnostics(true, buildingId);
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

function diagnosticDistance(entry) {
  const world = runtimeWorld();
  const building = state.latestGame?.buildings?.find((candidate) => candidate.id === entry.buildingId);
  if (!building || !world?.player) return Number.POSITIVE_INFINITY;
  return Math.hypot(Number(building.x || 0) - Number(world.player.x || 0), Number(building.z || 0) - Number(world.player.z || 0));
}

function diagnosticEntriesForOverlay() {
  const diagnostics = state.factory?.diagnostics || [];
  const warnings = diagnostics
    .filter((entry) => entry.severity === 'warn')
    .sort((a, b) => diagnosticDistance(a) - diagnosticDistance(b))
    .slice(0, DIAGNOSTIC_WARN_LIMIT);
  const info = diagnostics
    .filter((entry) => entry.severity === 'info')
    .sort((a, b) => diagnosticDistance(a) - diagnosticDistance(b))
    .slice(0, DIAGNOSTIC_INFO_LIMIT);
  const healthy = diagnostics
    .filter((entry) => entry.severity === 'ok' && diagnosticDistance(entry) <= DIAGNOSTIC_HEALTHY_RANGE)
    .sort((a, b) => diagnosticDistance(a) - diagnosticDistance(b))
    .slice(0, DIAGNOSTIC_HEALTHY_LIMIT);

  const entries = [...warnings, ...info, ...healthy];
  if (state.diagnosticFocusId && !entries.some((entry) => entry.buildingId === state.diagnosticFocusId)) {
    const focused = diagnostics.find((entry) => entry.buildingId === state.diagnosticFocusId);
    if (focused) entries.unshift(focused);
  }
  return entries;
}

function syncDiagnosticLabels() {
  if (!state.diagnosticOverlay || !state.diagnosticEnabled) return;
  const layer = state.diagnosticOverlay.querySelector('[data-diagnostic-layer]');
  const summary = state.diagnosticOverlay.querySelector('[data-diagnostic-summary]');
  if (!layer || !summary) return;

  const entries = diagnosticEntriesForOverlay();
  const problemCount = state.factory?.diagnosticProblemCount || 0;
  const warningCount = state.factory?.diagnostics?.filter((entry) => entry.severity === 'warn').length || 0;
  summary.textContent = problemCount
    ? `${problemCount} issues / ${warningCount} warning${warningCount === 1 ? '' : 's'}`
    : 'NO ACTIVE ISSUES / 近距離設備のみ表示';

  layer.replaceChildren();
  state.diagnosticLabels.clear();
  for (const entry of entries) {
    const label = document.createElement('div');
    label.className = `diagnostic-label diagnostic-label--${entry.severity}${entry.buildingId === state.diagnosticFocusId ? ' is-focused' : ''}`;
    label.dataset.buildingId = entry.buildingId;
    label.innerHTML = `
      <span>${diagnosticIcon(entry.severity)} ${entry.name}</span>
      <strong>${entry.status}</strong>
      <small>${entry.detail}</small>
    `;
    layer.append(label);
    state.diagnosticLabels.set(entry.buildingId, label);
  }
}

function positionDiagnosticLabels() {
  if (!state.diagnosticEnabled || !state.diagnosticOverlay || state.diagnosticOverlay.hidden) return;
  const world = runtimeWorld();
  const shell = document.querySelector('.game-shell');
  if (!world?.camera || !world?.canvas || !world?.buildingMeshes || !shell) return;

  const canvasRect = world.canvas.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();
  const forward = world.camera.position.clone();
  world.camera.getWorldDirection(forward);

  for (const [buildingId, label] of state.diagnosticLabels) {
    const mesh = world.buildingMeshes.get(buildingId);
    if (!mesh) {
      label.hidden = true;
      continue;
    }

    const worldPosition = mesh.position.clone();
    worldPosition.y += 2.35;
    const toTarget = worldPosition.clone().sub(world.camera.position);
    if (toTarget.dot(forward) <= 0) {
      label.hidden = true;
      continue;
    }

    const projected = worldPosition.clone().project(world.camera);
    const visible = projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) <= 1.08 && Math.abs(projected.y) <= 1.08;
    if (!visible) {
      label.hidden = true;
      continue;
    }

    const left = canvasRect.left - shellRect.left + (projected.x * 0.5 + 0.5) * canvasRect.width;
    const top = canvasRect.top - shellRect.top + (-projected.y * 0.5 + 0.5) * canvasRect.height;
    label.hidden = false;
    label.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0) translate(-50%, -100%)`;
  }
}

function diagnosticAnimationLoop() {
  if (!state.diagnosticEnabled) {
    state.diagnosticFrame = 0;
    return;
  }
  positionDiagnosticLabels();
  state.diagnosticFrame = requestAnimationFrame(diagnosticAnimationLoop);
}

function setDiagnostics(enabled, focusId = null) {
  if (!state.diagnosticOverlay) return;
  const next = Boolean(enabled);
  if (next && (!gameplayReady() || otherOverlayOpen() || !state.panel?.hidden)) return;

  state.diagnosticEnabled = next;
  state.diagnosticFocusId = next ? focusId : null;
  state.diagnosticOverlay.hidden = !next;
  document.body.classList.toggle('factory-diagnostics-active', next);
  document.querySelector('#factory-diagnostics-hud')?.setAttribute('aria-pressed', String(next));

  if (!next) {
    if (state.diagnosticFrame) cancelAnimationFrame(state.diagnosticFrame);
    state.diagnosticFrame = 0;
    state.diagnosticLabels.clear();
    state.diagnosticOverlay.querySelector('[data-diagnostic-layer]')?.replaceChildren();
    return;
  }

  syncDiagnosticLabels();
  if (!state.diagnosticFrame) state.diagnosticFrame = requestAnimationFrame(diagnosticAnimationLoop);
}

function toggleDiagnostics() {
  setDiagnostics(!state.diagnosticEnabled);
}

function quickBuild(index) {
  if (!gameplayReady() || otherOverlayOpen() || !state.panel?.hidden) return;
  setDiagnostics(false);
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

    if (state.diagnosticEnabled && event.code === 'Escape') {
      event.preventDefault();
      setDiagnostics(false);
      return;
    }

    if (event.code === 'KeyV') {
      if (!gameplayReady() || otherOverlayOpen()) return;
      event.preventDefault();
      toggleDiagnostics();
      return;
    }

    if (event.code === 'KeyP') {
      if (!gameplayReady() || otherOverlayOpen()) return;
      event.preventDefault();
      openManagement('overview');
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
}

waitForGame();