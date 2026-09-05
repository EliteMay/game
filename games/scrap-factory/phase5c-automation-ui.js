import { BUILDINGS, ITEMS } from './config.js';
import {
  assignDroneResourcePoint,
  dronePortAssignments,
  securedDroneResourcePoints,
} from './drone-routes.js';
import { isBuildingUnlocked } from './progression.js';
import { loadRootSave, saveRootSave } from './storage.js';

const GAME_ID = 'scrap-factory';
const WAREHOUSE_UPGRADE_COST = Math.max(0, BUILDINGS.logistics_warehouse.cost - BUILDINGS.industrial_storage.cost);

let panel = null;
let overlayCarrierAcquired = false;

function gameFromRoot(root) {
  return root?.games?.[GAME_ID] || null;
}

function buildingAmount(building) {
  return Object.values(building?.output || {}).reduce((sum, amount) => sum + Math.max(0, Number(amount || 0)), 0);
}

function featureToast(message, tone = 'info') {
  const stack = document.querySelector('#toast-stack');
  if (!stack) return;
  const item = document.createElement('div');
  item.className = `toast toast--${tone}`;
  item.textContent = message;
  stack.append(item);
  requestAnimationFrame(() => item.classList.add('is-visible'));
  window.setTimeout(() => {
    item.classList.remove('is-visible');
    window.setTimeout(() => item.remove(), 220);
  }, 2600);
}

function ensureStyles() {
  if (document.querySelector('style[data-phase5c-automation]')) return;
  const style = document.createElement('style');
  style.dataset.phase5cAutomation = 'true';
  style.textContent = `
    .automation-console-hud { top: 228px; }
    .automation-console-card { width:min(980px,100%); }
    .automation-console-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; padding:22px 24px 26px; }
    .automation-console-section { min-width:0; padding:16px; border:1px solid #3d4445; background:#272d2e; }
    .automation-console-section h3 { margin:0; font-size:1rem; }
    .automation-console-section > p { margin:7px 0 14px; color:#9fa7a1; font-size:.75rem; line-height:1.55; }
    .automation-route-list { display:grid; gap:8px; }
    .automation-route-row { display:grid; gap:8px; padding:11px; border:1px solid #3b4243; background:#222829; }
    .automation-route-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
    .automation-route-head strong { font-size:.82rem; }
    .automation-route-head small { color:#8f9891; font-size:.65rem; }
    .automation-route-controls { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; }
    .automation-route-controls select { min-width:0; height:38px; border:1px solid #505859; background:#171c1d; color:#eef0e9; padding:0 9px; font:inherit; font-size:.72rem; }
    .automation-route-meta { color:#aab1ab; font-size:.66rem; line-height:1.5; }
    .automation-upgrade-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center; padding:11px; border-bottom:1px solid #373e3f; }
    .automation-upgrade-row:last-child { border-bottom:0; }
    .automation-upgrade-row span { display:grid; gap:3px; color:#c4c9c3; font-size:.76rem; }
    .automation-upgrade-row small { color:#909892; font-size:.64rem; }
    .automation-empty { color:#89918b; font-size:.76rem; line-height:1.55; }
    .automation-note { margin:0 24px 22px; padding:11px 12px; border-left:3px solid var(--accent); background:rgb(212 183 79 / .07); color:#aeb5af; font-size:.68rem; line-height:1.55; }
    @media (max-width: 760px) { .automation-console-grid { grid-template-columns:1fr; } }
  `;
  document.head.append(style);
}

function gameplayReady() {
  const hud = document.querySelector('#hud');
  const boot = document.querySelector('#boot-screen');
  return Boolean(hud && !hud.hidden && boot?.hidden);
}

function otherOverlayOpen() {
  return [...document.querySelectorAll('.overlay-panel, .factory-management-panel')]
    .some((entry) => entry !== panel && !entry.hidden);
}

function acquireOverlayCarrier() {
  if (!gameplayReady() || otherOverlayOpen()) return false;
  const guideButton = document.querySelector('#open-guide-hud');
  const guidePanel = document.querySelector('#guide-panel');
  if (!guideButton || !guidePanel) return false;
  guideButton.click();
  guidePanel.hidden = true;
  overlayCarrierAcquired = true;
  return true;
}

function closePanel() {
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  if (overlayCarrierAcquired) document.querySelector('#close-guide')?.click();
  overlayCarrierAcquired = false;
}

function applyAndReload(root, message) {
  saveRootSave(root);
  featureToast(message, 'success');
  window.setTimeout(() => window.location.reload(), 120);
}

function renderRoutes(game, root) {
  const assignments = dronePortAssignments(game);
  if (!assignments.length) return '<p class="automation-empty">Drone Portがありません。軍事施設のDrone Control Research完了後、Bメニューから建築できます。</p>';
  const secured = securedDroneResourcePoints(game);
  return `<div class="automation-route-list">${assignments.map(({ building, point }, index) => {
    const options = secured.map((candidate) => `<option value="${candidate.id}"${candidate.id === point?.id ? ' selected' : ''}>${candidate.name} → ${ITEMS[candidate.itemId]?.name || candidate.itemId}</option>`).join('');
    const meta = point
      ? `${ITEMS[point.itemId]?.name || point.itemId} / ${point.seconds}秒 / 約${point.capacityPerMinute}個/分 / 距離${point.distanceMeters}m / Danger ${point.danger}`
      : '利用可能なResource Pointがありません';
    return `
      <article class="automation-route-row" data-port-id="${building.id}">
        <div class="automation-route-head"><strong>DRONE PORT ${index + 1}</strong><small>${building.x}, ${building.z}</small></div>
        <div class="automation-route-controls">
          <select data-route-select ${secured.length ? '' : 'disabled'}>${options}</select>
          <button class="secondary-action" type="button" data-route-apply ${secured.length ? '' : 'disabled'}>Route適用</button>
        </div>
        <div class="automation-route-meta">${meta}</div>
      </article>
    `;
  }).join('')}</div>`;
}

function renderUpgrades(game) {
  const rankReady = isBuildingUnlocked(game, 'logistics_warehouse');
  const storages = (game.buildings || []).filter((building) => building.type === 'industrial_storage');
  if (!storages.length) return '<p class="automation-empty">Upgrade可能な産業倉庫はありません。物流倉庫はRank 6から直接建築もできます。</p>';
  return storages.map((building) => {
    const used = buildingAmount(building);
    const canAfford = Number(game.money || 0) >= WAREHOUSE_UPGRADE_COST;
    const disabled = !rankReady || !canAfford;
    const reason = !rankReady ? 'Rank 6で解放' : !canAfford ? `資金不足 / $${WAREHOUSE_UPGRADE_COST}` : `中身 ${used}/600 → ${used}/1800`;
    return `
      <div class="automation-upgrade-row" data-storage-id="${building.id}">
        <span><strong>産業倉庫 @ ${building.x}, ${building.z}</strong><small>${reason}</small></span>
        <button class="secondary-action" type="button" data-warehouse-upgrade ${disabled ? 'disabled' : ''}>+$${WAREHOUSE_UPGRADE_COST} Upgrade</button>
      </div>
    `;
  }).join('');
}

function bindPanelActions(root, game) {
  panel.querySelectorAll('[data-route-apply]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = button.closest('[data-port-id]');
      const port = game.buildings.find((building) => building.id === row?.dataset.portId);
      const selected = row?.querySelector('[data-route-select]')?.value;
      const result = assignDroneResourcePoint(game, port, selected);
      if (!result.changed) {
        featureToast(result.reason === 'same' ? 'このDrone Routeはすでに使用中です' : 'Drone Routeを変更できません', result.reason === 'same' ? 'info' : 'warn');
        return;
      }
      applyAndReload(root, `${result.point.name}へDrone Routeを変更`);
    });
  });

  panel.querySelectorAll('[data-warehouse-upgrade]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = button.closest('[data-storage-id]');
      const building = game.buildings.find((entry) => entry.id === row?.dataset.storageId);
      if (!building || building.type !== 'industrial_storage') return;
      if (!isBuildingUnlocked(game, 'logistics_warehouse')) {
        featureToast('物流倉庫はRank 6で解放されます', 'warn');
        return;
      }
      if (Number(game.money || 0) < WAREHOUSE_UPGRADE_COST) {
        featureToast(`Upgradeには $${WAREHOUSE_UPGRADE_COST} 必要です`, 'warn');
        return;
      }
      game.money -= WAREHOUSE_UPGRADE_COST;
      building.type = 'logistics_warehouse';
      applyAndReload(root, '産業倉庫を物流倉庫へUpgradeしました');
    });
  });
}

function renderPanel() {
  if (!panel) return;
  const root = loadRootSave();
  const game = gameFromRoot(root);
  const content = panel.querySelector('[data-automation-content]');
  if (!game || !content) return;
  content.innerHTML = `
    <div class="automation-console-grid">
      <section class="automation-console-section">
        <h3>Drone Route Management</h3>
        <p>攻略済みResource Pointだけを回収先にできます。Route変更ではPortの出力Bufferを消さず、途中サイクルだけリセットします。</p>
        ${renderRoutes(game, root)}
      </section>
      <section class="automation-console-section">
        <h3>Storage Upgrade</h3>
        <p>産業倉庫を同じ位置・同じID・同じ中身のまま、1800容量の物流倉庫へUpgradeします。</p>
        <div>${renderUpgrades(game)}</div>
      </section>
    </div>
    <p class="automation-note">変更適用時は現在のFactory Saveへ安全に反映して再読み込みします。旧Drone PortはRoute未指定でも従来どおり軍事施設の合金備蓄庫を使用します。</p>
  `;
  bindPanelActions(root, game);
}

function openPanel() {
  if (!panel) return;
  if (!panel.hidden) return;
  if (!acquireOverlayCarrier()) {
    featureToast('他の画面を閉じてからAutomation Consoleを開いてください', 'info');
    return;
  }
  renderPanel();
  panel.hidden = false;
}

function createUi() {
  if (document.querySelector('#phase5c-automation-panel')) return;
  ensureStyles();
  const shell = document.querySelector('.game-shell');
  const hud = document.querySelector('#hud');
  if (!shell || !hud) return;

  const button = document.createElement('button');
  button.id = 'phase5c-automation-hud';
  button.className = 'factory-management-hud automation-console-hud';
  button.type = 'button';
  button.innerHTML = '<span>AUTOMATION</span>';
  button.addEventListener('click', openPanel);
  hud.append(button);

  panel = document.createElement('section');
  panel.id = 'phase5c-automation-panel';
  panel.className = 'factory-management-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'オートメーション管理');
  panel.innerHTML = `
    <div class="factory-management-card automation-console-card">
      <header class="factory-management-header">
        <div>
          <p class="panel-kicker">PHASE 5-C / AUTOMATION</p>
          <h2>Automation Console</h2>
          <p>確保済みResource PointのDrone Routeと、高密度Storage Upgradeを管理します。</p>
        </div>
        <button class="icon-button" type="button" data-automation-close aria-label="Automation Consoleを閉じる">×</button>
      </header>
      <div data-automation-content></div>
    </div>
  `;
  shell.append(panel);
  panel.querySelector('[data-automation-close]').addEventListener('click', closePanel);
}

function boot() {
  createUi();
  if (!panel) window.setTimeout(boot, 250);
}

boot();
