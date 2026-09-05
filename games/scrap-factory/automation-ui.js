import { BUILDINGS, ITEMS } from './config.js';
import {
  assignDroneResourcePoint,
  dronePortAssignments,
  securedDroneResourcePoints,
} from './drone-routes.js';
import { analyzeFinalAutomation } from './final-automation.js';
import {
  assignProductionRecipe,
  configurableProductionBuildings,
  productionRecipeFamily,
  productionRecipeOptions,
} from './production-recipes.js';
import { isBuildingUnlocked } from './progression.js';
import { loadRootSave, saveRootSave } from './storage.js';

const GAME_ID = 'scrap-factory';
const WAREHOUSE_UPGRADE_COST = Math.max(0, BUILDINGS.logistics_warehouse.cost - BUILDINGS.industrial_storage.cost);

let panel = null;
let overlayCarrierAcquired = false;

function gameFromRoot(root) { return root?.games?.[GAME_ID] || null; }
function buildingAmount(building) { return Object.values(building?.output || {}).reduce((sum, amount) => sum + Math.max(0, Number(amount || 0)), 0); }

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
  if (document.querySelector('style[data-automation-console]')) return;
  const style = document.createElement('style');
  style.dataset.automationConsole = 'true';
  style.textContent = `
    .automation-console-hud { top:228px; }
    .automation-console-card { width:min(1080px,100%); }
    .automation-console-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; padding:22px 24px 12px; }
    .automation-console-section { min-width:0; padding:16px; border:1px solid #3d4445; background:#272d2e; }
    .automation-console-section--wide { grid-column:1/-1; }
    .automation-console-section h3 { margin:0; font-size:1rem; }
    .automation-console-section > p { margin:7px 0 14px; color:#9fa7a1; font-size:.75rem; line-height:1.55; }
    .automation-route-list,.automation-recipe-list,.final-line-list { display:grid; gap:8px; }
    .automation-route-row,.automation-recipe-row { display:grid; gap:8px; padding:11px; border:1px solid #3b4243; background:#222829; }
    .automation-route-head,.automation-recipe-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
    .automation-route-head strong,.automation-recipe-head strong { font-size:.82rem; }
    .automation-route-head small,.automation-recipe-head small { color:#8f9891; font-size:.65rem; }
    .automation-route-controls,.automation-recipe-controls { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; }
    .automation-route-controls select,.automation-recipe-controls select { min-width:0; height:38px; border:1px solid #505859; background:#171c1d; color:#eef0e9; padding:0 9px; font:inherit; font-size:.72rem; }
    .automation-route-meta,.automation-recipe-meta { color:#aab1ab; font-size:.66rem; line-height:1.5; }
    .automation-upgrade-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center; padding:11px; border-bottom:1px solid #373e3f; }
    .automation-upgrade-row:last-child { border-bottom:0; }
    .automation-upgrade-row span { display:grid; gap:3px; color:#c4c9c3; font-size:.76rem; }
    .automation-upgrade-row small { color:#909892; font-size:.64rem; }
    .automation-empty { color:#89918b; font-size:.76rem; line-height:1.55; }
    .automation-note { margin:0 24px 22px; padding:11px 12px; border-left:3px solid var(--accent); background:rgb(212 183 79 / .07); color:#aeb5af; font-size:.68rem; line-height:1.55; }
    .final-line-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-bottom:10px; }
    .final-line-summary > div { padding:10px; border:1px solid #3b4243; background:#202627; display:grid; gap:3px; }
    .final-line-summary span { color:#87918b; font-size:.6rem; letter-spacing:.08em; }
    .final-line-summary strong { font-size:.82rem; }
    .final-line-step { display:flex; gap:8px; align-items:flex-start; padding:8px 10px; border:1px solid #343b3c; background:#202627; color:#9da69f; font-size:.7rem; }
    .final-line-step.is-done { color:#cbd6cb; border-color:#405448; }
    .final-line-step strong { width:16px; color:#7eaa8d; }
    @media (max-width:760px) { .automation-console-grid { grid-template-columns:1fr; } .automation-console-section--wide { grid-column:auto; } .final-line-summary { grid-template-columns:1fr 1fr; } }
  `;
  document.head.append(style);
}

function gameplayReady() {
  const hud = document.querySelector('#hud');
  const boot = document.querySelector('#boot-screen');
  return Boolean(hud && !hud.hidden && boot?.hidden);
}

function otherOverlayOpen() {
  return [...document.querySelectorAll('.overlay-panel, .factory-management-panel, .progression-panel')]
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

function renderRoutes(game) {
  const assignments = dronePortAssignments(game);
  if (!assignments.length) return '<p class="automation-empty">Drone Portがありません。Drone Control / Experimental Technologyを進めて建築してください。</p>';
  return `<div class="automation-route-list">${assignments.map(({ building, point, route, tier }, index) => {
    const secured = securedDroneResourcePoints(game, tier);
    const options = secured.map((candidate) => `<option value="${candidate.id}"${candidate.id === point?.id ? ' selected' : ''}>${candidate.name} → ${ITEMS[candidate.itemId]?.name || candidate.itemId}</option>`).join('');
    const meta = point && route
      ? `${tier === 'advanced' ? 'ADVANCED' : 'UTILITY'} / ${ITEMS[point.itemId]?.name || point.itemId} / ${route.seconds}秒 / 約${route.capacityPerMinute}個/分 / ${point.distanceMeters}m / Danger ${point.danger}`
      : '利用可能なResource Pointがありません';
    return `
      <article class="automation-route-row" data-port-id="${building.id}">
        <div class="automation-route-head"><strong>${tier === 'advanced' ? 'ADVANCED DRONE' : 'DRONE PORT'} ${index + 1}</strong><small>${building.x}, ${building.z}</small></div>
        <div class="automation-route-controls">
          <select data-route-select ${secured.length ? '' : 'disabled'}>${options}</select>
          <button class="secondary-action" type="button" data-route-apply ${secured.length ? '' : 'disabled'}>Route適用</button>
        </div>
        <div class="automation-route-meta">${meta}</div>
      </article>`;
  }).join('')}</div>`;
}

function renderRecipes(game) {
  const buildings = configurableProductionBuildings(game);
  if (!buildings.length) return '<p class="automation-empty">Recipe切替対応のAssembler / Fabricatorがありません。</p>';
  return `<div class="automation-recipe-list">${buildings.map((building) => {
    const family = productionRecipeFamily(building);
    const options = productionRecipeOptions(game, building);
    const optionHtml = options.map((option) => `<option value="${option.recipeId}"${option.selected ? ' selected' : ''}${option.available ? '' : ' disabled'}>${option.label}${option.available ? '' : ' / Research必要'}</option>`).join('');
    const current = options.find((option) => option.selected);
    return `
      <article class="automation-recipe-row" data-production-id="${building.id}">
        <div class="automation-recipe-head"><strong>${family?.name || 'MACHINE'} / ${current?.label || BUILDINGS[building.type]?.name}</strong><small>${building.x}, ${building.z}</small></div>
        <div class="automation-recipe-controls">
          <select data-recipe-select>${optionHtml}</select>
          <button class="secondary-action" type="button" data-recipe-apply>Recipe適用</button>
        </div>
        <div class="automation-recipe-meta">Recipe変更時もInput / Output Bufferは保持。不適合Inputが残っている場合は安全のため切替を拒否します。</div>
      </article>`;
  }).join('')}</div>`;
}

function renderUpgrades(game) {
  const rankReady = isBuildingUnlocked(game, 'logistics_warehouse');
  const storages = (game.buildings || []).filter((building) => building.type === 'industrial_storage');
  if (!storages.length) return '<p class="automation-empty">Upgrade可能な産業倉庫はありません。物流倉庫はRank 6から直接建築できます。</p>';
  return storages.map((building) => {
    const used = buildingAmount(building);
    const canAfford = Number(game.money || 0) >= WAREHOUSE_UPGRADE_COST;
    const disabled = !rankReady || !canAfford;
    const reason = !rankReady ? 'Rank 6で解放' : !canAfford ? `資金不足 / $${WAREHOUSE_UPGRADE_COST}` : `中身 ${used}/600 → ${used}/1800`;
    return `
      <div class="automation-upgrade-row" data-storage-id="${building.id}">
        <span><strong>産業倉庫 @ ${building.x}, ${building.z}</strong><small>${reason}</small></span>
        <button class="secondary-action" type="button" data-warehouse-upgrade ${disabled ? 'disabled' : ''}>+$${WAREHOUSE_UPGRADE_COST} Upgrade</button>
      </div>`;
  }).join('');
}

function renderFinalAutomation(game) {
  const status = analyzeFinalAutomation(game);
  const stageRows = Object.entries(status.stages).map(([id, done]) => {
    const missing = status.missing.find((entry) => entry.id === id);
    const labels = {
      experimentalTechnology: 'Experimental Technology研究',
      advancedScrap: 'Advanced Drone / 鉄くず',
      advancedCopper: 'Advanced Drone / 銅線',
      advancedPlastic: 'Advanced Drone / プラスチック',
      advancedElectronics: 'Advanced Drone / 電子ジャンク',
      advancedAlloy: 'Advanced Drone / レア合金',
      metallurgy: 'Crusher → Smelter',
      plateAutomation: '鉄板Assembler',
      motorAutomation: 'Motor Assembler',
      circuitAutomation: 'Circuit Assembler',
      controlAutomation: 'Control Unit Assembler',
      experimentalSetAutomation: 'Experimental部品Fabricator',
      autonomousCoreAutomation: 'Autonomous Core Fabricator',
      finalStorageRoute: '最終Core → Storage',
      experimentalPowerRouted: 'レア合金 → Experimental Power',
      experimentalPowerActive: 'Experimental Power稼働',
      poweredLine: '最終Line給電',
      productProven: 'Autonomous Industrial Core生産確認',
    };
    return `<div class="final-line-step${done ? ' is-done' : ''}"><strong>${done ? '✓' : '○'}</strong><span>${labels[id] || missing?.label || id}</span></div>`;
  }).join('');
  return `
    <div class="final-line-summary">
      <div><span>FINAL LINE</span><strong>${status.qualifies ? 'COMPLETE' : 'BUILDING'}</strong></div>
      <div><span>PRODUCT</span><strong>${status.productCount}</strong></div>
      <div><span>POWER</span><strong>${Math.floor(status.power.generation)} / ${status.power.demand}</strong></div>
      <div><span>ROUTE BANDWIDTH</span><strong>${status.routeThroughput ? `${status.routeThroughput.toFixed(1)}/s` : '-'}</strong></div>
    </div>
    <div class="final-line-list">${stageRows}</div>`;
}

function bindPanelActions(root, game) {
  panel.querySelectorAll('[data-route-apply]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = button.closest('[data-port-id]');
      const port = game.buildings.find((building) => building.id === row?.dataset.portId);
      const selected = row?.querySelector('[data-route-select]')?.value;
      const result = assignDroneResourcePoint(game, port, selected);
      if (!result.changed) {
        const message = result.reason === 'same' ? 'このDrone Routeはすでに使用中です'
          : result.reason === 'tier-unavailable' ? 'このDrone Tierでは選択できないResource Pointです'
          : 'Drone Routeを変更できません';
        featureToast(message, result.reason === 'same' ? 'info' : 'warn');
        return;
      }
      applyAndReload(root, `${result.point.name}へ${result.tier === 'advanced' ? 'Advanced ' : ''}Drone Routeを変更`);
    });
  });

  panel.querySelectorAll('[data-recipe-apply]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = button.closest('[data-production-id]');
      const building = game.buildings.find((entry) => entry.id === row?.dataset.productionId);
      const recipeId = row?.querySelector('[data-recipe-select]')?.value;
      const result = assignProductionRecipe(game, building, recipeId);
      if (!result.changed) {
        if (result.reason === 'buffer-conflict') {
          const names = result.conflicts.map((id) => ITEMS[id]?.name || id).join(' / ');
          featureToast(`Input Bufferに不適合素材があります: ${names}`, 'warn');
        } else if (result.reason === 'research') featureToast('このRecipeには追加Researchが必要です', 'warn');
        else featureToast(result.reason === 'same' ? 'このRecipeはすでに選択中です' : 'Recipeを変更できません', result.reason === 'same' ? 'info' : 'warn');
        return;
      }
      applyAndReload(root, `${result.option.label} Recipeへ変更`);
    });
  });

  panel.querySelectorAll('[data-warehouse-upgrade]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = button.closest('[data-storage-id]');
      const building = game.buildings.find((entry) => entry.id === row?.dataset.storageId);
      if (!building || building.type !== 'industrial_storage') return;
      if (!isBuildingUnlocked(game, 'logistics_warehouse')) { featureToast('物流倉庫はRank 6で解放されます', 'warn'); return; }
      if (Number(game.money || 0) < WAREHOUSE_UPGRADE_COST) { featureToast(`Upgradeには $${WAREHOUSE_UPGRADE_COST} 必要です`, 'warn'); return; }
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
        <p>Utility Droneは従来の確保済み3地点、Advanced Droneは攻略済み地域の高密度回収点を含む5地点を利用できます。</p>
        ${renderRoutes(game)}
      </section>
      <section class="automation-console-section">
        <h3>Production Recipe Routing</h3>
        <p>同じAssembler / Fabricatorを撤去せずにRecipeを切替。Buffer互換性を確認してから変更します。</p>
        ${renderRecipes(game)}
      </section>
      <section class="automation-console-section">
        <h3>Storage Upgrade</h3>
        <p>産業倉庫を同じ位置・同じID・同じ中身のまま、1800容量の物流倉庫へUpgradeします。</p>
        <div>${renderUpgrades(game)}</div>
      </section>
      <section class="automation-console-section automation-console-section--wide">
        <h3>Final Automation Contract</h3>
        <p>原料回収からAutonomous Industrial CoreのStorage到達までを、現在のDirectional Route / Power状態から導出します。</p>
        ${renderFinalAutomation(game)}
      </section>
    </div>
    <p class="automation-note">Advanced Droneは新しいAreaやBlueprintを発見しません。既に攻略済みの地域Dataから通常資源の反復回収だけを自動化します。</p>`;
  bindPanelActions(root, game);
}

function openPanel() {
  if (!panel || !panel.hidden) return;
  if (!acquireOverlayCarrier()) { featureToast('他の画面を閉じてからAutomation Consoleを開いてください', 'info'); return; }
  renderPanel();
  panel.hidden = false;
}

function createUi() {
  if (document.querySelector('#automation-panel')) return;
  ensureStyles();
  const shell = document.querySelector('.game-shell');
  const hud = document.querySelector('#hud');
  if (!shell || !hud) return;
  const button = document.createElement('button');
  button.id = 'automation-hud';
  button.className = 'factory-management-hud automation-console-hud';
  button.type = 'button';
  button.innerHTML = '<span>AUTOMATION</span>';
  button.addEventListener('click', openPanel);
  hud.append(button);

  panel = document.createElement('section');
  panel.id = 'automation-panel';
  panel.className = 'factory-management-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'オートメーション管理');
  panel.innerHTML = `
    <div class="factory-management-card automation-console-card">
      <header class="factory-management-header">
        <div><p class="panel-kicker">FACTORY AUTOMATION</p><h2>Automation Console</h2><p>Drone Route、Production Recipe、Storage Upgrade、Final Automationを1か所で管理します。</p></div>
        <button class="icon-button" type="button" data-automation-close aria-label="Automation Consoleを閉じる">×</button>
      </header>
      <div data-automation-content></div>
    </div>`;
  shell.append(panel);
  panel.querySelector('[data-automation-close]').addEventListener('click', closePanel);
}

function boot() {
  createUi();
  if (!panel) window.setTimeout(boot, 250);
}

boot();
