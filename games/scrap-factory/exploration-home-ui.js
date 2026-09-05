import * as THREE from 'three';
import { ITEMS, usedSlots } from './config.js';
import {
  ensureHomeState,
  markScannerPulse,
  protectExplorationLoot,
  secureCaseSlotCapacity,
} from './home-system.js';

const state = {
  runtime: null,
  panel: null,
  button: null,
  toastTimer: null,
};

function game() {
  return state.runtime?.getGame?.() || null;
}

function persist(reason = 'Exploration Home UI') {
  try { state.runtime?.persist?.(reason); }
  catch (error) { console.error('Exploration Home persist failed', error); }
}

function ensureStyle() {
  if (document.querySelector('link[data-exploration-home]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '../home-system.css';
  link.dataset.explorationHome = 'true';
  document.head.append(link);
}

function toast(message) {
  const node = document.querySelector('#exploration-toast');
  if (!node) return;
  node.textContent = message;
  node.hidden = false;
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => { node.hidden = true; }, 2600);
}

function itemName(itemId) {
  return ITEMS[itemId]?.name || itemId;
}

function createUi() {
  const hud = document.querySelector('#exploration-hud');
  const shell = document.querySelector('main') || document.body;
  if (!hud || !shell || document.querySelector('#exploration-secure-panel')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'exploration-secure-button';
  button.className = 'exploration-secure-button';
  button.innerHTML = '<kbd>V</kbd><span>CASE</span><strong id="exploration-secure-count">0 / 0</strong>';
  button.addEventListener('click', openPanel);
  hud.append(button);
  state.button = button;

  const panel = document.createElement('section');
  panel.id = 'exploration-secure-panel';
  panel.className = 'exploration-secure-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Secure Case / Scanner');
  panel.innerHTML = `
    <div class="exploration-secure-card">
      <header>
        <div><span>EXPLORATION WORKBENCH LINK</span><h2>Secure Case / Scanner</h2><p>保護する通常Lootだけを手動で選択します。Main Objective CargoやFinal部品は保護対象外です。</p></div>
        <button id="close-exploration-secure" type="button" aria-label="Secure Caseを閉じる">×</button>
      </header>
      <div id="exploration-secure-content"></div>
    </div>`;
  shell.append(panel);
  state.panel = panel;
  panel.querySelector('#close-exploration-secure')?.addEventListener('click', closePanel);
}

function openPanel() {
  if (!state.panel) return;
  document.exitPointerLock?.();
  state.panel.hidden = false;
  renderPanel();
}

function closePanel() {
  if (!state.panel || state.panel.hidden) return;
  state.panel.hidden = true;
  document.querySelector('#exploration-canvas')?.requestPointerLock?.();
}

function renderPanel() {
  const g = game();
  const content = state.panel?.querySelector('#exploration-secure-content');
  if (!g || !content) return;
  const home = ensureHomeState(g);
  const session = g.exploration?.activeSession;
  const capacity = secureCaseSlotCapacity(g);
  const sessionRows = Object.entries(session?.loot || {}).filter(([, amount]) => Number(amount) > 0);
  const caseRows = Object.entries(home.secureCase || {}).filter(([, amount]) => Number(amount) > 0);
  const scannerUnlocked = home.upgrades.includes('loot_scanner_i');
  const scannerKey = String(g.settings?.scannerKey || 'KeyQ').replace('Key', '');

  content.innerHTML = `
    <section class="exploration-case-summary">
      <article><span>SECURE CASE</span><strong>${usedSlots(home.secureCase)} / ${capacity} SLOTS</strong><small>${capacity ? '失敗しても保持' : 'Rank 6で解放'}</small></article>
      <article><span>SESSION PACK</span><strong>${sessionRows.reduce((sum, [, amount]) => sum + Number(amount), 0)} ITEMS</strong><small>正常帰還前は未確定</small></article>
      <article><span>SCANNER</span><strong>${scannerUnlocked ? `${scannerKey} PULSE` : 'LOCKED'}</strong><small>短時間Highlight / cooldown</small></article>
    </section>
    <section class="exploration-case-section">
      <h3>今回の探索Loot</h3>
      ${sessionRows.length ? `<div class="exploration-case-list">${sessionRows.map(([itemId, amount]) => `
        <article><div><strong>${itemName(itemId)}</strong><small>Session ×${amount}</small></div><button type="button" data-protect-loot="${itemId}" ${capacity ? '' : 'disabled'}>1個保護</button></article>`).join('')}</div>` : '<p>保護できる通常Lootはありません。</p>'}
    </section>
    <section class="exploration-case-section">
      <h3>Secure Case内</h3>
      <p>${caseRows.length ? caseRows.map(([itemId, amount]) => `${itemName(itemId)} ×${amount}`).join(' / ') : '空'}</p>
      <small>Factoryへ戻った後、Home WorkbenchからHome Storageへ移動できます。</small>
    </section>`;

  content.querySelectorAll('[data-protect-loot]').forEach((button) => {
    button.addEventListener('click', () => {
      const result = protectExplorationLoot(g, button.dataset.protectLoot, 1);
      if (result.changed) {
        persist('Secure Case Protect');
        toast(`${itemName(button.dataset.protectLoot)}をSecure Caseへ保護`);
      } else {
        const reason = result.reason === 'full' ? 'Secure Caseが満杯です' : result.reason === 'not-allowed' ? 'このItemは保護対象外です' : '保護できません';
        toast(reason);
      }
      renderPanel();
      updateButton();
    });
  });
}

function pulseScanner() {
  const g = game();
  if (!g || !state.runtime?.camera) return;
  const result = markScannerPulse(g);
  if (!result.changed) {
    if (result.reason === 'locked') toast('Loot Scanner IはHome PC Upgradeで解放します');
    else toast(`Scanner cooldown ${Math.ceil(Number(result.remainingMs || 0) / 1000)}s`);
    return;
  }

  const origin = state.runtime.camera.position;
  const candidates = [];
  for (const mesh of state.runtime.lootMeshes?.values?.() || []) {
    if (!mesh?.visible) continue;
    const distance = mesh.position.distanceTo(origin);
    if (distance <= result.profile.radius) candidates.push({ mesh, distance });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const selected = candidates.slice(0, result.profile.maxTargets);
  for (const entry of selected) {
    const helper = new THREE.BoxHelper(entry.mesh, 0xe5c65a);
    state.runtime.scene?.add(helper);
    window.setTimeout(() => {
      state.runtime.scene?.remove(helper);
      helper.geometry?.dispose?.();
      helper.material?.dispose?.();
    }, result.profile.durationMs);
  }
  persist('Exploration Scanner Pulse');
  toast(selected.length ? `SCANNER: ${selected.length} target` : 'SCANNER: targetなし');
}

function bindKeys() {
  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
    const g = game();
    if (!g) return;
    const scannerKey = g.settings?.scannerKey || 'KeyQ';
    if (event.code === scannerKey && state.panel?.hidden) {
      event.preventDefault();
      pulseScanner();
      return;
    }
    if (event.code === 'KeyV') {
      event.preventDefault();
      if (state.panel?.hidden) openPanel();
      else closePanel();
    }
  }, true);
}

function updateButton() {
  const g = game();
  const count = document.querySelector('#exploration-secure-count');
  if (!g || !count) return;
  const home = ensureHomeState(g);
  const capacity = secureCaseSlotCapacity(g);
  count.textContent = `${usedSlots(home.secureCase)} / ${capacity}`;
  if (state.button) state.button.classList.toggle('is-locked', capacity <= 0);
}

function boot() {
  if (!window.__scrapExplorationRuntime) {
    window.setTimeout(boot, 100);
    return;
  }
  state.runtime = window.__scrapExplorationRuntime;
  const g = game();
  if (!g) return;
  ensureHomeState(g);
  ensureStyle();
  createUi();
  bindKeys();
  updateButton();
  window.setInterval(() => {
    updateButton();
    if (!state.panel?.hidden) renderPanel();
  }, 750);
}

boot();
