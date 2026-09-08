import { ITEMS, usedSlots } from './config.js';
import {
  PLAYER_UPGRADES,
  backpackSlotCapacity,
  ensureHomeState,
  hasPlayerUpgrade,
  homeStorageSlotCapacity,
  homeTutorialObjective,
  moveBackpackToHome,
  moveHomeToBackpack,
  recordTutorialEvent,
  secureCaseSlotCapacity,
  tutorialUnreadCount,
} from './home-system.js';

const STYLE_HREF = './home-surface-ui.css';
const ENHANCE_MS = 180;

const state = {
  runtime: null,
  panel: null,
  previousInteract: null,
  guideSignature: null,
};

function game() {
  return state.runtime?.getGame?.() || null;
}

function persist(reason) {
  try { state.runtime?.persist?.(reason); }
  catch (error) { console.error('Home surface persist failed', error); }
}

function ensureStylesheet() {
  if (document.querySelector('link[data-home-surface-ui]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  link.dataset.homeSurfaceUi = 'true';
  document.head.append(link);
}

function gameplayReady() {
  const hud = document.querySelector('#hud');
  const boot = document.querySelector('#boot-screen');
  return Boolean(hud && !hud.hidden && boot?.hidden);
}

function otherOverlayOpen() {
  return [...document.querySelectorAll('.overlay-panel, .factory-management-panel, .progression-panel, .transport-terminal-panel, .home-system-panel')]
    .some((panel) => panel !== state.panel && !panel.hidden);
}

function acquireCarrier() {
  if (!gameplayReady() || otherOverlayOpen()) return false;
  const guideButton = document.querySelector('#open-guide-hud');
  const guidePanel = document.querySelector('#guide-panel');
  if (!guideButton || !guidePanel) return false;
  guideButton.click();
  guidePanel.hidden = true;
  return true;
}

function createDashboard() {
  const shell = document.querySelector('.game-shell');
  if (!shell || document.querySelector('#home-pc-dashboard')) return;

  const panel = document.createElement('section');
  panel.id = 'home-pc-dashboard';
  panel.className = 'home-system-panel home-pc-dashboard-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Home PC Dashboard');
  panel.innerHTML = `
    <div class="home-pc-dashboard-card">
      <header class="home-pc-dashboard-header">
        <div>
          <p class="panel-kicker">HOME PC / PLAYER HUB</p>
          <h2>Home Console</h2>
          <p>探索準備・Player Upgrade・Tutorialをまとめます。Factoryの診断と管理は <kbd>V</kbd> / <kbd>P</kbd> を使います。</p>
        </div>
        <button type="button" class="icon-button" data-home-dashboard-close aria-label="Home PCを閉じる">×</button>
      </header>
      <div class="home-pc-dashboard-content" data-home-dashboard-content></div>
    </div>
  `;
  shell.append(panel);
  panel.querySelector('[data-home-dashboard-close]')?.addEventListener('click', closeDashboard);
  state.panel = panel;
}

function dashboardAction(tab, eyebrow, title, note, badge = '') {
  return `
    <button type="button" class="home-pc-action" data-pc-target="${tab}">
      <span>${eyebrow}</span>
      <strong>${title}</strong>
      <small>${note}</small>
      ${badge ? `<em>${badge}</em>` : ''}
    </button>
  `;
}

function renderDashboard() {
  const g = game();
  const content = state.panel?.querySelector('[data-home-dashboard-content]');
  if (!g || !content) return;

  const h = ensureHomeState(g);
  const objective = homeTutorialObjective(g);
  const upgradesOwned = h.upgrades.length;
  const upgradesTotal = Object.keys(PLAYER_UPGRADES).length;
  const unread = tutorialUnreadCount(g);
  const backpackUsed = usedSlots(g.inventory || {});
  const backpackMax = backpackSlotCapacity(g);
  const homeUsed = usedSlots(h.storage || {});
  const homeMax = homeStorageSlotCapacity(g);
  const secureMax = secureCaseSlotCapacity(g);
  const tracking = h.materialTracking ? ITEMS[h.materialTracking]?.name || h.materialTracking : 'なし';
  const quickDeposit = hasPlayerUpgrade(g, 'quick_deposit');

  content.innerHTML = `
    <section class="home-pc-priority">
      <div>
        <span>CURRENT GOAL</span>
        <strong>${objective.title}</strong>
        <p>${objective.body}</p>
        <small>${objective.progress} · ${objective.hint}</small>
      </div>
      <button type="button" class="primary-action" data-pc-target="tutorial">詳細を見る</button>
    </section>

    <section class="home-pc-summary">
      <article><span>BACKPACK</span><strong>${backpackUsed} / ${backpackMax}</strong><small>SLOTS</small></article>
      <article><span>HOME STORAGE</span><strong>${homeUsed} / ${homeMax}</strong><small>SLOTS</small></article>
      <article><span>UPGRADES</span><strong>${upgradesOwned} / ${upgradesTotal}</strong><small>PLAYER QoL</small></article>
      <article><span>TUTORIAL</span><strong>${unread}</strong><small>UNREAD</small></article>
    </section>

    <section class="home-pc-action-grid">
      ${dashboardAction('workbench', 'PREPARE', 'Exploration Workbench', quickDeposit ? 'Backpack整理・Quick Deposit・Preset' : 'Backpack ↔ Home Storage・Preset', `${homeUsed}/${homeMax}`)}
      ${dashboardAction('upgrades', 'PLAYER', 'Upgrades', 'Scanner・Backpack・Home QoLを強化', `${upgradesOwned}/${upgradesTotal}`)}
      ${dashboardAction('tracking', 'TRACK', 'Material Tracking', '必要素材を1種類だけ追跡', tracking)}
      ${dashboardAction('tutorial', 'LEARN', 'Tutorial Library', '操作・理由・成功条件・詰まり方を詳しく確認', unread ? `NEW ${unread}` : 'READ')}
      ${dashboardAction('progress', 'STATUS', 'Player Progress', 'Rank・Main Clear・主要System状態', `RANK ${g.progression?.progressionRank || 1}`)}
      ${dashboardAction('home', 'HOME', 'Home Status', 'Bed・Storage・Secure Case・Home設定', secureMax ? `CASE ${usedSlots(h.secureCase || {})}/${secureMax}` : 'CASE LOCKED')}
    </section>

    <section class="home-pc-system-split">
      <div><span>PLAYER / HOME</span><strong>このPC</strong><small>Upgrade・Tutorial・探索準備・個人Storage</small></div>
      <div><span>FACTORY / WORLD</span><strong><kbd>V</kbd> Diagnostics · <kbd>P</kbd> Management</strong><small>工場の問題・生産・Power・物流はPCへ重複させません。</small></div>
    </section>
  `;

  content.querySelectorAll('[data-pc-target]').forEach((button) => {
    button.addEventListener('click', () => openLegacyTab(button.dataset.pcTarget));
  });
}

function openDashboard() {
  if (!state.panel) return;
  if (state.panel.hidden && !acquireCarrier()) return;
  state.panel.hidden = false;
  renderDashboard();
}

function closeDashboard() {
  if (!state.panel || state.panel.hidden) return;
  state.panel.hidden = true;
  document.querySelector('#close-guide')?.click();
}

function openLegacyTab(tab) {
  const legacy = document.querySelector('#home-system-panel');
  if (!legacy || !state.panel) return;

  state.panel.hidden = true;
  legacy.hidden = false;
  const title = legacy.querySelector('#home-system-title');
  const subtitle = legacy.querySelector('#home-system-subtitle');
  if (title) title.textContent = tab === 'tutorial' ? 'Tutorial Library' : tab === 'workbench' ? 'Exploration Workbench' : 'Player Management PC';
  if (subtitle) subtitle.textContent = tab === 'tutorial'
    ? 'Oは短いQuick Guide。ここでは解放済みの詳細Manualを確認します。'
    : 'Factory Researchとは分離したPlayer / Home管理です。';
  legacy.querySelector(`[data-home-tab="${tab}"]`)?.click();
}

function wrapPcInteraction() {
  const world = state.runtime?.world;
  if (!world?.callbacks?.onInteract || state.previousInteract) return;
  state.previousInteract = world.callbacks.onInteract;
  world.callbacks.onInteract = (entity) => {
    if (entity?.kind === 'home' && entity.action === 'pc') {
      const g = game();
      if (g) {
        recordTutorialEvent(g, 'pcOpened', true);
        persist('PC Open');
      }
      openDashboard();
      state.runtime?.renderAll?.();
      return;
    }
    state.previousInteract?.(entity);
  };
}

function quickGuideSignature(g) {
  const objective = homeTutorialObjective(g);
  const h = ensureHomeState(g);
  return [
    objective.id,
    objective.title,
    objective.body,
    objective.hint,
    objective.progress,
    g.settings?.scannerKey || 'KeyQ',
    h.upgrades.join(','),
  ].join('|');
}

function renderQuickGuide(force = false) {
  const g = game();
  const panel = document.querySelector('#guide-panel');
  const layout = panel?.querySelector('.guide-layout');
  if (!g || !panel || !layout) return;

  layout.dataset.homeLibrary = 'true';
  layout.dataset.quickGuide = 'true';
  const signature = quickGuideSignature(g);
  if (!force && signature === state.guideSignature) return;
  state.guideSignature = signature;

  const objective = homeTutorialObjective(g);
  const h = ensureHomeState(g);
  const scannerKey = String(g.settings?.scannerKey || 'KeyQ').replace('Key', '');
  const scannerUnlocked = hasPlayerUpgrade(g, 'loot_scanner_i');

  const kicker = panel.querySelector('.panel-header .panel-kicker');
  const title = panel.querySelector('.panel-header h2');
  if (kicker) kicker.textContent = 'FIELD QUICK GUIDE';
  if (title) title.textContent = 'Quick Guide';

  layout.innerHTML = `
    <section class="guide-section guide-section--wide quick-guide-goal">
      <span class="guide-number">GOAL</span>
      <div><h3>${objective.kind}: ${objective.title}</h3><p>${objective.body}</p><p><strong>${objective.progress}</strong> · ${objective.hint}</p></div>
    </section>
    <section class="guide-section">
      <span class="guide-number">01</span>
      <div><h3>PLAY</h3><p><kbd>E</kbd> 操作 / <kbd>B</kbd> 建築 / <kbd>Tab</kbd> Backpack / <kbd>F</kbd> 解体</p></div>
    </section>
    <section class="guide-section">
      <span class="guide-number">02</span>
      <div><h3>FACTORY</h3><p><kbd>V</kbd> 3D診断 / <kbd>P</kbd> 工場管理。問題は原因→場所の順で確認します。</p></div>
    </section>
    <section class="guide-section">
      <span class="guide-number">03</span>
      <div><h3>HOME / EXPLORATION</h3><p>${scannerUnlocked ? `<kbd>${scannerKey}</kbd> Scanner / ` : ''}Home PCでUpgrade・Tracking・探索準備を管理します。</p></div>
    </section>
    <section class="guide-section quick-guide-detail">
      <span class="guide-number">?</span>
      <div><h3>詳しい説明</h3><p>Home PC → <strong>TUTORIAL LIBRARY</strong> に操作理由・成功条件・例・詰まった時の確認先をまとめています。</p></div>
    </section>
  `;
}

function transferAll(direction, itemId) {
  const g = game();
  if (!g || !ITEMS[itemId]) return;
  const h = ensureHomeState(g);
  const available = direction === 'deposit'
    ? Math.max(0, Number(g.inventory?.[itemId] || 0))
    : Math.max(0, Number(h.storage?.[itemId] || 0));
  if (available <= 0) return;

  const result = direction === 'deposit'
    ? moveBackpackToHome(g, itemId, available)
    : moveHomeToBackpack(g, itemId, available);
  if (!result.changed) return;

  persist(direction === 'deposit' ? 'Home Storage Deposit All' : 'Home Storage Withdraw All');
  state.runtime?.renderAll?.();
  const active = document.querySelector('#home-system-panel [data-home-tab].is-active');
  active?.click();
}

function enhanceWorkbenchTransfers() {
  const legacy = document.querySelector('#home-system-panel');
  if (!legacy || legacy.hidden) return;
  const active = legacy.querySelector('[data-home-tab].is-active')?.dataset.homeTab;
  if (active !== 'workbench') return;

  legacy.querySelectorAll('[data-home-deposit]').forEach((oneButton) => {
    const itemId = oneButton.dataset.homeDeposit;
    const article = oneButton.closest('article');
    if (!itemId || !article || article.querySelector(`[data-home-transfer-all="deposit:${itemId}"]`)) return;
    oneButton.textContent = '1';
    oneButton.setAttribute('aria-label', `${ITEMS[itemId]?.name || itemId}を1個預ける`);
    const all = document.createElement('button');
    all.type = 'button';
    all.textContent = 'ALL';
    all.dataset.homeTransferAll = `deposit:${itemId}`;
    all.setAttribute('aria-label', `${ITEMS[itemId]?.name || itemId}を入るだけ全部預ける`);
    all.addEventListener('click', () => transferAll('deposit', itemId));
    article.append(all);
  });

  legacy.querySelectorAll('[data-home-withdraw]').forEach((oneButton) => {
    const itemId = oneButton.dataset.homeWithdraw;
    const article = oneButton.closest('article');
    if (!itemId || !article || article.querySelector(`[data-home-transfer-all="withdraw:${itemId}"]`)) return;
    oneButton.textContent = '1';
    oneButton.setAttribute('aria-label', `${ITEMS[itemId]?.name || itemId}を1個取り出す`);
    const all = document.createElement('button');
    all.type = 'button';
    all.textContent = 'ALL';
    all.dataset.homeTransferAll = `withdraw:${itemId}`;
    all.setAttribute('aria-label', `${ITEMS[itemId]?.name || itemId}を入るだけ全部取り出す`);
    all.addEventListener('click', () => transferAll('withdraw', itemId));
    article.append(all);
  });
}

function updateOpenSurfaces() {
  if (state.panel && !state.panel.hidden) renderDashboard();
  renderQuickGuide();
  enhanceWorkbenchTransfers();
}

function boot() {
  if (!window.__scrapFactoryBooted || !window.__scrapFactoryRuntime || !document.querySelector('#home-system-panel')) {
    window.setTimeout(boot, 100);
    return;
  }
  state.runtime = window.__scrapFactoryRuntime;
  ensureStylesheet();
  createDashboard();
  wrapPcInteraction();
  renderQuickGuide(true);
  window.setInterval(updateOpenSurfaces, ENHANCE_MS);
}

boot();
