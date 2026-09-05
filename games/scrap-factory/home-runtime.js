import { ITEMS, usedSlots } from './config.js';
import { persistRuntimeGame } from './storage.js';
import {
  PLAYER_UPGRADES,
  HOME_POSITION,
  advanceHomeTutorial,
  applyLoadoutPreset,
  backpackSlotCapacity,
  ensureHomeState,
  hasPlayerUpgrade,
  homeStorageSlotCapacity,
  homeTutorialObjective,
  materialCounts,
  markScannerPulse,
  markTutorialRead,
  purchasePlayerUpgrade,
  quickDepositToHome,
  quotePlayerUpgrade,
  recordTutorialEvent,
  releaseSecureCaseToHome,
  restartBasicTutorial,
  saveLoadoutPreset,
  scannerReady,
  secureCaseSlotCapacity,
  setMaterialTracking,
  skipBasicTutorial,
  tutorialUnreadCount,
  visibleTutorialLibrary,
} from './home-system.js';
import { diagnoseMachine, diagnoseSystems } from './system-diagnostics.js';
import { installHomeWorld, pulseWorldScanner } from './home-world.js';

const state = {
  ctx: null,
  homeController: null,
  panel: null,
  activeTab: 'upgrades',
  lastObjectiveId: null,
  objectiveSince: Date.now(),
  movementOrigin: null,
  scannerChip: null,
  homeChip: null,
};

function game() { return state.ctx?.getGame?.() || null; }
function home() { return game() ? ensureHomeState(game()) : null; }

function persist(reason = 'Home System') {
  try {
    if (state.ctx?.persist) state.ctx.persist(reason);
    else persistRuntimeGame();
  } catch (error) {
    console.error('Home persist failed', error);
  }
}

function toast(message, tone = 'info') {
  if (state.ctx?.toast) return state.ctx.toast(message, tone);
  const stack = document.querySelector('#toast-stack');
  if (!stack) return;
  const node = document.createElement('div');
  node.className = `toast toast--${tone}`;
  node.textContent = message;
  stack.append(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  window.setTimeout(() => node.remove(), 2600);
}

function itemName(id) { return ITEMS[id]?.name || id; }

function inventoryText(inventory) {
  const rows = Object.entries(inventory || {}).filter(([, n]) => Number(n) > 0);
  if (!rows.length) return '空';
  return rows.map(([id, n]) => `${itemName(id)} ×${n}`).join(' / ');
}

function ensureSettings(g) {
  g.settings ??= {};
  const defaults = {
    tutorialObjectives: true,
    contextualHints: true,
    stuckHelp: true,
    nextGoal: true,
    homeMarker: true,
    scannerKey: 'KeyQ',
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (g.settings[key] === undefined) g.settings[key] = value;
  }
}

function ensureStyles() {
  if (document.querySelector('link[data-home-system]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './home-system.css';
  link.dataset.homeSystem = 'true';
  document.head.append(link);
}

function createPanel() {
  const shell = document.querySelector('.game-shell');
  if (!shell || document.querySelector('#home-system-panel')) return;
  const panel = document.createElement('section');
  panel.id = 'home-system-panel';
  panel.className = 'home-system-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Home / Player Management');
  panel.innerHTML = `
    <div class="home-system-card">
      <header class="home-system-header">
        <div><p class="panel-kicker">HOME TERMINAL / PLAYER MANAGEMENT</p><h2 id="home-system-title">Player Management PC</h2><p id="home-system-subtitle">Factory Researchとは別のPlayer QoL管理端末です。</p></div>
        <button id="close-home-system" class="icon-button" type="button" aria-label="Home画面を閉じる">×</button>
      </header>
      <nav id="home-system-tabs" class="home-system-tabs">
        <button type="button" data-home-tab="upgrades">UPGRADES</button>
        <button type="button" data-home-tab="tracking">MATERIAL TRACKING</button>
        <button type="button" data-home-tab="home">HOME</button>
        <button type="button" data-home-tab="tutorial">TUTORIAL LIBRARY</button>
        <button type="button" data-home-tab="progress">PLAYER PROGRESS</button>
        <button type="button" data-home-tab="workbench">WORKBENCH</button>
      </nav>
      <div id="home-system-content" class="home-system-content"></div>
    </div>`;
  shell.append(panel);
  state.panel = panel;
  panel.querySelector('#close-home-system')?.addEventListener('click', closePanel);
  panel.querySelectorAll('[data-home-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.homeTab;
      renderPanel();
    });
  });
}

function otherOverlayOpen() {
  return [...document.querySelectorAll('.overlay-panel, .factory-management-panel, .progression-panel, .transport-terminal-panel, .home-system-panel')]
    .some((panel) => panel !== state.panel && !panel.hidden);
}

function gameplayReady() {
  return Boolean(document.querySelector('#hud') && !document.querySelector('#hud').hidden && document.querySelector('#boot-screen')?.hidden);
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

function openPanel(tab = 'upgrades', title = 'Player Management PC') {
  if (!state.panel) return;
  if (state.panel.hidden && !acquireCarrier()) return;
  state.panel.hidden = false;
  state.activeTab = tab;
  const titleNode = state.panel.querySelector('#home-system-title');
  if (titleNode) titleNode.textContent = title;
  renderPanel();
}

function closePanel() {
  if (!state.panel || state.panel.hidden) return;
  state.panel.hidden = true;
  document.querySelector('#close-guide')?.click();
}

function costHtml(def, quote) {
  const items = Object.entries(def.items || {})
    .map(([id, amount]) => {
      const missing = Number(quote?.missingItems?.[id] || 0);
      return `<span class="${missing ? 'is-missing' : ''}">${itemName(id)} ×${amount}${missing ? `（不足${missing}）` : ''}</span>`;
    }).join('');
  const cashClass = Number(quote?.cashMissing || 0) > 0 ? 'is-missing' : '';
  return `<div class="upgrade-cost"><span class="${cashClass}">$${def.cash}</span>${items}</div>`;
}

function reasonText(quote) {
  if (!quote || quote.ok) return '購入可能';
  if (quote.reason === 'owned') return '取得済み';
  if (quote.reason === 'rank') return `Rank ${quote.requiredRank} が必要`;
  if (quote.reason === 'prerequisite') return `前提: ${quote.missingPrerequisites.map((id) => PLAYER_UPGRADES[id]?.name || id).join(' / ')}`;
  if (quote.reason === 'blueprint') return 'Optional PC Blueprintが必要';
  if (quote.reason === 'cash') return `Cash不足 $${quote.cashMissing}`;
  if (quote.reason === 'items') return '素材不足';
  return quote.reason || '条件未達成';
}

function renderUpgrades(g) {
  const rank = Number(g.progression?.progressionRank || 1);
  return `
    <section class="home-summary-row">
      <article><span>PLAYER RANK</span><strong>${rank} / 7</strong></article>
      <article><span>BACKPACK</span><strong>${backpackSlotCapacity(g)} SLOTS</strong><small>Slot制 / 重量制なし</small></article>
      <article><span>HOME STORAGE</span><strong>${homeStorageSlotCapacity(g)} SLOTS</strong></article>
      <article><span>SECURE CASE</span><strong>${secureCaseSlotCapacity(g)} SLOTS</strong></article>
    </section>
    <div class="upgrade-grid">
      ${Object.values(PLAYER_UPGRADES).map((def) => {
        const quote = quotePlayerUpgrade(g, def.id);
        const owned = hasPlayerUpgrade(g, def.id);
        return `<article class="upgrade-card${owned ? ' is-owned' : ''}">
          <div class="upgrade-card__top"><span>RANK ${def.rank} / ${def.category}</span><strong>${owned ? 'OWNED' : reasonText(quote)}</strong></div>
          <h3>${def.name}</h3><p>${def.description}</p>
          ${costHtml(def, quote)}
          <button type="button" data-buy-upgrade="${def.id}" ${owned || !quote.ok ? 'disabled' : ''}>${owned ? '取得済み' : 'UPGRADE'}</button>
        </article>`;
      }).join('')}
    </div>`;
}

function renderTracking(g) {
  const h = ensureHomeState(g);
  const unlocked = hasPlayerUpgrade(g, 'material_tracking');
  const counts = materialCounts(g);
  return `
    <section class="home-section">
      <div class="home-section__head"><div><span>MATERIAL TRACKING</span><h3>素材を1種類Pin</h3></div><strong>${unlocked ? (h.materialTracking ? itemName(h.materialTracking) : 'NONE') : 'LOCKED'}</strong></div>
      <p>MAIN GOALとは別枠です。Pinできるのは常に1種類だけで、場所そのものを自動攻略しません。</p>
      <div class="tracking-grid">
        ${Object.values(ITEMS).map((item) => {
          const total = Number(counts.total[item.id] || 0);
          const active = h.materialTracking === item.id;
          return `<button type="button" data-track-item="${item.id}" class="${active ? 'is-active' : ''}" ${unlocked ? '' : 'disabled'}>
            <strong>${item.name}</strong><span>合計 ${total}</span><small>PACK ${counts.sources.backpack[item.id] || 0} / HOME ${counts.sources.home[item.id] || 0} / FACTORY ${counts.sources.factory[item.id] || 0}</small>
          </button>`;
        }).join('')}
      </div>
      ${unlocked ? '<button type="button" class="secondary-action" data-clear-tracking>Pinを解除</button>' : '<p class="home-lock-note">Rank 3「Material Tracking」をPCで取得すると使用できます。</p>'}
    </section>`;
}

function renderHome(g) {
  const h = ensureHomeState(g);
  return `
    <section class="home-summary-row">
      <article><span>HOME STORAGE</span><strong>${usedSlots(h.storage)} / ${homeStorageSlotCapacity(g)}</strong><small>${inventoryText(h.storage)}</small></article>
      <article><span>SECURE CASE</span><strong>${usedSlots(h.secureCase)} / ${secureCaseSlotCapacity(g)}</strong><small>${inventoryText(h.secureCase)}</small></article>
      <article><span>RESPAWN</span><strong>${h.respawnEnabled ? 'HOME BED' : 'LEGACY RETURN'}</strong><small>${h.bedUsedAt ? 'Bed登録済み' : 'Bed未使用'}</small></article>
    </section>
    <section class="home-section">
      <div class="home-section__head"><div><span>HOME EQUIPMENT</span><h3>固定設備</h3></div></div>
      <div class="home-equipment-list">
        <div><strong>Bed</strong><span>Manual Save / Home Respawn / Recovery</span></div>
        <div><strong>PC</strong><span>Player Upgrade / Tracking / Tutorial / Progress</span></div>
        <div><strong>Home Storage</strong><span>個人・探索準備用。Factory Conveyorとは非接続。</span></div>
        <div><strong>Exploration Workbench</strong><span>Quick Deposit / Preset / Secure Case</span></div>
      </div>
    </section>
    <section class="home-section">
      <div class="home-section__head"><div><span>COSMETIC</span><h3>Home表示</h3></div><strong>性能影響なし</strong></div>
      <label>ランプ <select data-home-cosmetic="lamp"><option value="utility">Utility</option><option value="warm">Warm</option><option value="cool">Cool</option></select></label>
      <label>壁面 <select data-home-cosmetic="wall"><option value="plain">Plain</option><option value="factory">Factory</option><option value="salvage">Salvage</option></select></label>
    </section>`;
}

function tutorialEntryHtml(entry, read) {
  return `<article class="tutorial-entry${read ? '' : ' is-unread'}" data-tutorial-entry="${entry.id}">
    <div class="tutorial-entry__head"><span>${entry.category} / RANK ${entry.minRank}</span><strong>${read ? 'READ' : 'NEW'}</strong></div>
    <h3>${entry.title}</h3>
    <dl><div><dt>操作</dt><dd>${entry.keys}</dd></div><div><dt>なぜ必要?</dt><dd>${entry.why}</dd></div><div><dt>成功条件</dt><dd>${entry.success}</dd></div><div><dt>例</dt><dd>${entry.example}</dd></div><div><dt>詰まったら</dt><dd>${entry.diagnosis}</dd></div></dl>
  </article>`;
}

function renderTutorial(g) {
  const h = ensureHomeState(g);
  const objective = homeTutorialObjective(g);
  const entries = visibleTutorialLibrary(g);
  const categories = [...new Set(entries.map((entry) => entry.category))];
  return `
    <section class="home-section">
      <div class="home-section__head"><div><span>CURRENT / NEXT GOAL</span><h3>${objective.kind}: ${objective.title}</h3></div><strong>${objective.progress}</strong></div>
      <p>${objective.body}</p><p class="home-hint"><strong>HINT</strong> ${objective.hint}</p>
      <div class="home-inline-actions">
        <button type="button" data-restart-basic class="secondary-action">Basic TutorialをReplay</button>
        <button type="button" data-skip-basic class="secondary-action">Basic TutorialをSkip</button>
      </div>
    </section>
    <section class="home-section">
      <div class="home-section__head"><div><span>TUTORIAL LIBRARY</span><h3>解放済みGuide</h3></div><strong>未読 ${tutorialUnreadCount(g)}</strong></div>
      ${categories.map((category) => `<h4 class="tutorial-category">${category}</h4>${entries.filter((entry) => entry.category === category).map((entry) => tutorialEntryHtml(entry, h.tutorial.readLibrary.includes(entry.id))).join('')}`).join('')}
    </section>`;
}

function renderProgress(g) {
  const h = ensureHomeState(g);
  const systems = diagnoseSystems(g);
  const objective = homeTutorialObjective(g);
  return `
    <section class="home-summary-row">
      <article><span>RANK</span><strong>${g.progression?.progressionRank || 1} / 7</strong></article>
      <article><span>MAIN CLEAR</span><strong>${g.finalChapter?.mainClearedAt ? 'CLEARED' : 'IN PROGRESS'}</strong></article>
      <article><span>UPGRADES</span><strong>${h.upgrades.length} / ${Object.keys(PLAYER_UPGRADES).length}</strong></article>
      <article><span>NEXT GOAL</span><strong>${objective.kind}</strong><small>${objective.title}</small></article>
    </section>
    <section class="home-section">
      <div class="home-section__head"><div><span>SYSTEM DIAGNOSTICS</span><h3>現在の主要状態</h3></div></div>
      <div class="diagnostic-list">${systems.map((entry) => `<article class="diagnostic diagnostic--${entry.status.toLowerCase()}"><strong>${entry.name} / ${entry.status}</strong><span>${entry.summary}</span><small>${entry.action}</small></article>`).join('')}</div>
      <p class="home-hint">診断は原因候補と確認先を示すだけで、自動修正・自動建築は行いません。</p>
    </section>`;
}

function renderWorkbench(g) {
  const h = ensureHomeState(g);
  const quick = hasPlayerUpgrade(g, 'quick_deposit');
  const presets = hasPlayerUpgrade(g, 'loadout_preset');
  return `
    <section class="home-summary-row">
      <article><span>BACKPACK</span><strong>${usedSlots(g.inventory)} / ${backpackSlotCapacity(g)}</strong><small>${inventoryText(g.inventory)}</small></article>
      <article><span>HOME STORAGE</span><strong>${usedSlots(h.storage)} / ${homeStorageSlotCapacity(g)}</strong><small>${inventoryText(h.storage)}</small></article>
      <article><span>SECURE CASE</span><strong>${usedSlots(h.secureCase)} / ${secureCaseSlotCapacity(g)}</strong><small>${inventoryText(h.secureCase)}</small></article>
    </section>
    <section class="home-section">
      <div class="home-section__head"><div><span>TRANSFER</span><h3>探索準備</h3></div></div>
      <div class="home-inline-actions">
        <button type="button" data-quick-deposit class="primary-action" ${quick ? '' : 'disabled'}>Quick Deposit</button>
        <button type="button" data-release-secure class="secondary-action" ${Object.keys(h.secureCase).length ? '' : 'disabled'}>Secure Case → Home Storage</button>
      </div>
      <p>${quick ? '通常Lootを手動一括移動します。Secure Case / Final系Itemは自動移動しません。' : 'Quick DepositはRank 2 Upgradeで解放。手動移動は常に可能です。'}</p>
    </section>
    <section class="home-section">
      <div class="home-section__head"><div><span>LOADOUT PRESET</span><h3>Preset</h3></div><strong>${presets ? `${h.loadoutPresets.length} / 5` : 'LOCKED'}</strong></div>
      <div class="home-inline-actions"><button type="button" data-save-preset class="secondary-action" ${presets ? '' : 'disabled'}>現在BackpackをPreset保存</button></div>
      <div class="preset-list">${h.loadoutPresets.map((preset) => `<article><div><strong>${preset.name}</strong><small>${inventoryText(preset.items)}</small></div><button type="button" data-apply-preset="${preset.id}">適用</button></article>`).join('') || '<p>Presetなし</p>'}</div>
    </section>`;
}

function renderPanel() {
  const g = game();
  if (!g || !state.panel || state.panel.hidden) return;
  ensureHomeState(g);
  const content = state.panel.querySelector('#home-system-content');
  if (!content) return;
  state.panel.querySelectorAll('[data-home-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.homeTab === state.activeTab));
  if (state.activeTab === 'tracking') content.innerHTML = renderTracking(g);
  else if (state.activeTab === 'home') content.innerHTML = renderHome(g);
  else if (state.activeTab === 'tutorial') content.innerHTML = renderTutorial(g);
  else if (state.activeTab === 'progress') content.innerHTML = renderProgress(g);
  else if (state.activeTab === 'workbench') content.innerHTML = renderWorkbench(g);
  else content.innerHTML = renderUpgrades(g);
  bindPanelActions(content, g);
}

function bindPanelActions(content, g) {
  content.querySelectorAll('[data-buy-upgrade]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.buyUpgrade;
    const def = PLAYER_UPGRADES[id];
    if (!def || !window.confirm(`${def.name} を購入しますか？\nCash $${def.cash} と表示素材を消費します。`)) return;
    const result = purchasePlayerUpgrade(g, id);
    if (!result.changed) { toast(`Upgrade不可: ${result.reason}`, 'warn'); renderPanel(); return; }
    persist(`PC Upgrade: ${id}`);
    toast(`${def.name} を取得`, 'success');
    state.ctx?.renderAll?.();
    renderPanel();
  }));
  content.querySelectorAll('[data-track-item]').forEach((button) => button.addEventListener('click', () => {
    const result = setMaterialTracking(g, button.dataset.trackItem);
    if (result.changed) { persist('Material Tracking'); renderPanel(); }
  }));
  content.querySelector('[data-clear-tracking]')?.addEventListener('click', () => {
    if (setMaterialTracking(g, null).changed) { persist('Material Tracking Clear'); renderPanel(); }
  });
  content.querySelector('[data-quick-deposit]')?.addEventListener('click', () => {
    const result = quickDepositToHome(g);
    if (result.changed) { persist('Quick Deposit'); toast(`${result.moved}個をHome Storageへ移動`, 'success'); state.ctx?.renderAll?.(); }
    else toast(result.reason === 'locked' ? 'Quick Depositは未解放です' : '移動できるItemがありません', 'info');
    renderPanel();
  });
  content.querySelector('[data-release-secure]')?.addEventListener('click', () => {
    const result = releaseSecureCaseToHome(g);
    if (result.changed) { persist('Secure Case Release'); toast(`${result.moved}個をHome Storageへ移動`, 'success'); }
    else toast('Home Storageに空きがありません', 'warn');
    renderPanel();
  });
  content.querySelector('[data-save-preset]')?.addEventListener('click', () => {
    const name = window.prompt('Preset名', `Preset ${ensureHomeState(g).loadoutPresets.length + 1}`) || '';
    if (!name) return;
    const result = saveLoadoutPreset(g, name);
    if (result.changed) { persist('Loadout Preset Save'); toast('Presetを保存しました', 'success'); renderPanel(); }
  });
  content.querySelectorAll('[data-apply-preset]').forEach((button) => button.addEventListener('click', () => {
    const result = applyLoadoutPreset(g, button.dataset.applyPreset);
    if (result.changed) { persist('Loadout Preset Apply'); state.ctx?.renderAll?.(); }
    const shortageCount = Object.values(result.shortages || {}).reduce((sum, n) => sum + n, 0);
    toast(shortageCount ? `Preset適用: ${result.moved || 0}個 / 不足${shortageCount}個` : `Preset適用: ${result.moved || 0}個`, shortageCount ? 'warn' : 'success');
    renderPanel();
  }));
  content.querySelectorAll('[data-tutorial-entry]').forEach((entry) => entry.addEventListener('click', () => {
    markTutorialRead(g, entry.dataset.tutorialEntry);
    persist('Tutorial Library Read');
    entry.classList.remove('is-unread');
  }));
  content.querySelector('[data-restart-basic]')?.addEventListener('click', () => {
    restartBasicTutorial(g); persist('Tutorial Replay'); renderPanel(); state.ctx?.renderAll?.();
  });
  content.querySelector('[data-skip-basic]')?.addEventListener('click', () => {
    if (!window.confirm('Basic TutorialをSkipしますか？ Main Progressionはロックされません。')) return;
    skipBasicTutorial(g); persist('Tutorial Skip'); renderPanel(); state.ctx?.renderAll?.();
  });
  content.querySelectorAll('[data-home-cosmetic]').forEach((select) => {
    select.value = ensureHomeState(g).cosmetics[select.dataset.homeCosmetic] || select.value;
    select.addEventListener('change', () => {
      ensureHomeState(g).cosmetics[select.dataset.homeCosmetic] = select.value;
      persist('Home Cosmetic');
    });
  });
}

function fadeBedSave() {
  let node = document.querySelector('#home-bed-fade');
  if (!node) {
    node = document.createElement('div');
    node.id = 'home-bed-fade';
    node.className = 'home-bed-fade';
    document.body.append(node);
  }
  node.classList.add('is-active');
  window.setTimeout(() => node.classList.remove('is-active'), 360);
}

function handleHomeInteraction(entity) {
  const g = game();
  if (!g || entity?.kind !== 'home') return false;
  const h = ensureHomeState(g);
  if (entity.action === 'door') {
    const open = state.homeController?.toggleDoor();
    recordTutorialEvent(g, 'doorOpened', Boolean(open));
    persist('Home Door');
    toast(open ? 'Home Doorを開きました' : 'Home Doorを閉じました', 'info');
    state.ctx?.renderAll?.();
    return true;
  }
  if (entity.action === 'bed') {
    h.bedUsedAt ||= new Date().toISOString();
    h.respawnEnabled = true;
    recordTutorialEvent(g, 'bedUsed', true);
    if (g.exploration?.activeSession) g.exploration.activeSession.hp = 100;
    fadeBedSave();
    persist('Home Bed Manual Save');
    toast('HOME SAVED / Respawn Point: Bed', 'success');
    state.movementOrigin = { x: state.ctx.world.player.x, z: state.ctx.world.player.z };
    state.ctx?.renderAll?.();
    return true;
  }
  if (entity.action === 'pc') {
    recordTutorialEvent(g, 'pcOpened', true);
    persist('PC Open');
    openPanel('upgrades', 'Player Management PC');
    state.ctx?.renderAll?.();
    return true;
  }
  if (entity.action === 'storage') {
    openPanel('home', 'Home Storage');
    return true;
  }
  if (entity.action === 'workbench') {
    openPanel('workbench', 'Exploration Workbench');
    return true;
  }
  return false;
}

function wrapWorldCallbacks() {
  const world = state.ctx.world;
  const originalTarget = world.callbacks.onTargetChange;
  const originalInteract = world.callbacks.onInteract;
  const originalFrame = world.callbacks.onFrame;
  world.callbacks.onTargetChange = (entity) => {
    originalTarget?.(entity);
    if (entity?.kind === 'home') {
      const prompt = document.querySelector('#interaction-prompt');
      if (prompt) {
        prompt.textContent = `[E] ${entity.label || 'Home'}${entity.action === 'door' ? (state.homeController?.doorOpen ? 'を閉じる' : 'を開く') : 'を使う'}`;
        prompt.hidden = false;
      }
    }
  };
  world.callbacks.onInteract = (entity) => {
    if (!handleHomeInteraction(entity)) originalInteract?.(entity);
  };
  world.callbacks.onFrame = (delta) => {
    state.homeController?.update(delta);
    originalFrame?.(delta);
  };
}

function pulseScanner() {
  const g = game();
  if (!g || !gameplayReady() || otherOverlayOpen()) return;
  const result = markScannerPulse(g);
  if (!result.changed) {
    if (result.reason === 'locked') toast('Loot Scanner IはPC Upgradeで解放します', 'info');
    else toast(`Scanner cooldown ${Math.ceil(result.remainingMs / 1000)}s`, 'info');
    return;
  }
  const hits = pulseWorldScanner(state.ctx.world, result.profile);
  persist('Scanner Pulse');
  toast(hits.length ? `SCANNER: ${hits.length} target` : 'SCANNER: targetなし', hits.length ? 'success' : 'info');
  updateHudExtras();
}

function bindKeys() {
  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
    const g = game();
    if (!g) return;
    ensureSettings(g);
    if (event.code === g.settings.scannerKey) {
      event.preventDefault();
      pulseScanner();
    }
  }, true);
}

function ensureHudExtras() {
  const hud = document.querySelector('#hud');
  if (!hud || state.scannerChip) return;
  const homeChip = document.createElement('div');
  homeChip.className = 'home-marker-chip';
  homeChip.id = 'home-marker-chip';
  hud.append(homeChip);
  state.homeChip = homeChip;
  const scannerChip = document.createElement('div');
  scannerChip.className = 'scanner-chip';
  scannerChip.id = 'scanner-chip';
  hud.append(scannerChip);
  state.scannerChip = scannerChip;
}

function updateHudExtras() {
  const g = game();
  if (!g) return;
  ensureSettings(g);
  ensureHudExtras();
  const h = ensureHomeState(g);
  const player = state.ctx.world.player;
  const distance = Math.hypot(player.x - HOME_POSITION.x, player.z - HOME_POSITION.z);
  if (state.homeChip) {
    state.homeChip.hidden = !g.settings.homeMarker;
    state.homeChip.textContent = `HOME ${Math.round(distance)}m`;
  }
  const scanner = scannerReady(g);
  if (state.scannerChip) {
    state.scannerChip.hidden = !scanner.profile.unlocked;
    state.scannerChip.textContent = scanner.profile.unlocked
      ? `${g.settings.scannerKey.replace('Key', '')} SCANNER ${scanner.ready ? 'READY' : `${Math.ceil(scanner.remainingMs / 1000)}s`}${h.materialTracking ? ` / ${itemName(h.materialTracking)}` : ''}`
      : '';
  }
  const objectivePanel = document.querySelector('.objective-panel');
  if (objectivePanel) {
    const current = homeTutorialObjective(g);
    const showByMode = h.tutorial.basicStatus === 'active' ? g.settings.tutorialObjectives : g.settings.nextGoal;
    objectivePanel.hidden = !showByMode;
    if (current.id !== state.lastObjectiveId) {
      state.lastObjectiveId = current.id;
      state.objectiveSince = Date.now();
    }
    if (showByMode && g.settings.stuckHelp && Date.now() - state.objectiveSince > 20000) {
      const body = document.querySelector('#tutorial-body');
      if (body && !body.dataset.stuckHelpFor?.includes(current.id)) {
        body.textContent = `${current.body}　ヒント: ${current.hint}`;
        body.dataset.stuckHelpFor = current.id;
      }
    }
  }
  const inventoryKicker = document.querySelector('#inventory-panel .panel-kicker');
  if (inventoryKicker) inventoryKicker.textContent = `BACKPACK / ${backpackSlotCapacity(g)} SLOTS`;
}

function updateMovementTutorial() {
  const g = game();
  if (!g || !state.movementOrigin || ensureHomeState(g).tutorial.events.moved) return;
  const p = state.ctx.world.player;
  if (Math.hypot(p.x - state.movementOrigin.x, p.z - state.movementOrigin.z) >= 2) {
    recordTutorialEvent(g, 'moved', true);
    persist('Tutorial Move');
    state.ctx?.renderAll?.();
  }
}

function updateTutorialProgress() {
  const g = game();
  if (!g) return;
  const result = advanceHomeTutorial(g);
  if (result.changed) {
    persist('Home Tutorial Progress');
    state.ctx?.renderAll?.();
    if (result.completed) toast('BASIC TUTORIAL COMPLETE / +$50', 'success');
  }
}

function renderGuideLibrary() {
  const g = game();
  const panel = document.querySelector('#guide-panel');
  if (!g || !panel || panel.hidden) return;
  const layout = panel.querySelector('.guide-layout');
  if (!layout || layout.dataset.homeLibrary === 'true') return;
  const objective = homeTutorialObjective(g);
  const h = ensureHomeState(g);
  const entries = visibleTutorialLibrary(g);
  layout.dataset.homeLibrary = 'true';
  layout.innerHTML = `
    <section class="guide-section guide-section--wide"><span class="guide-number">GOAL</span><div><h3>${objective.kind}: ${objective.title}</h3><p>${objective.body}</p><p><strong>詰まったら:</strong> ${objective.hint}</p></div></section>
    ${entries.map((entry, index) => `<section class="guide-section${index % 4 === 0 ? ' guide-section--wide' : ''}" data-guide-entry="${entry.id}">
      <span class="guide-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${entry.category} / ${entry.title}${h.tutorial.readLibrary.includes(entry.id) ? '' : ' · NEW'}</h3>
      <p>${entry.why}</p><p><strong>操作:</strong> ${entry.keys}<br><strong>成功:</strong> ${entry.success}<br><strong>例:</strong> ${entry.example}<br><strong>診断:</strong> ${entry.diagnosis}</p></div>
    </section>`).join('')}`;
  layout.querySelectorAll('[data-guide-entry]').forEach((node) => {
    markTutorialRead(g, node.dataset.guideEntry);
  });
  persist('Guide Library Read');
}

function appendSettings() {
  const g = game();
  const list = document.querySelector('#settings-panel .settings-list');
  if (!g || !list || list.querySelector('[data-home-setting]')) return;
  ensureSettings(g);
  const defs = [
    ['tutorialObjectives', 'Tutorial Objectives', 'Basic Tutorial中の現在目標をHUD表示'],
    ['contextualHints', 'Contextual Hints', '短い状況Hintを表示'],
    ['stuckHelp', 'Stuck Help', '一定時間進まない場合にHintを追加'],
    ['nextGoal', 'Next Goal', 'Tutorial後のMain/Recommended GoalをHUD表示'],
    ['homeMarker', 'HOME Marker', 'Homeまでの距離だけ表示。Fast Travelはしない'],
  ];
  for (const [key, label, note] of defs) {
    const row = document.createElement('label');
    row.className = 'setting-row setting-row--check';
    row.dataset.homeSetting = key;
    row.innerHTML = `<span><strong>${label}</strong><small>${note}</small></span><input type="checkbox">`;
    const input = row.querySelector('input');
    input.checked = g.settings[key] !== false;
    input.addEventListener('change', () => {
      g.settings[key] = input.checked;
      persist(`Setting ${key}`);
      updateHudExtras();
    });
    list.append(row);
  }
  const keyRow = document.createElement('label');
  keyRow.className = 'setting-row';
  keyRow.dataset.homeSetting = 'scannerKey';
  keyRow.innerHTML = '<span><strong>Scanner Key</strong><small>Loot Scanner Pulse</small></span><select><option value="KeyQ">Q</option><option value="KeyC">C</option><option value="KeyX">X</option></select>';
  const select = keyRow.querySelector('select');
  select.value = g.settings.scannerKey;
  select.addEventListener('change', () => { g.settings.scannerKey = select.value; persist('Scanner Key'); updateHudExtras(); });
  list.append(keyRow);
}

function updateMachineDiagnostic() {
  const g = game();
  const panel = document.querySelector('#machine-panel');
  if (!g || !panel || panel.hidden) return;
  let node = panel.querySelector('#machine-diagnostic');
  if (!node) {
    node = document.createElement('div');
    node.id = 'machine-diagnostic';
    node.className = 'machine-diagnostic';
    panel.querySelector('.machine-actions')?.before(node);
  }
  const target = state.ctx.world.currentTarget;
  const building = target?.kind === 'building' ? (g.buildings || []).find((entry) => entry.id === target.id) : null;
  const d = diagnoseMachine(g, building);
  node.innerHTML = `<span>SYSTEM DIAGNOSTICS / ${d.code}</span><strong>${d.title}</strong><p>${d.detail}</p>${d.actions.length ? `<small>${d.actions.join(' / ')}</small>` : ''}`;
}

function legacyHomeNotice() {
  const g = game();
  const h = home();
  if (!g || !h || !h.introducedFromLegacy || h.availabilityNotifiedAt) return;
  h.availabilityNotifiedAt = new Date().toISOString();
  persist('Home Availability Notice');
  toast('HOME AVAILABLE — Factory北側の固定Home区画が利用可能です。既存位置は変更していません。', 'objective');
}

function boot() {
  if (!window.__scrapFactoryBooted || !window.__scrapFactoryRuntime) {
    window.setTimeout(boot, 100);
    return;
  }
  state.ctx = window.__scrapFactoryRuntime;
  const g = game();
  ensureHomeState(g);
  ensureSettings(g);
  ensureStyles();
  createPanel();
  state.homeController = installHomeWorld(state.ctx.world);
  wrapWorldCallbacks();
  bindKeys();
  ensureHudExtras();
  legacyHomeNotice();
  if (!ensureHomeState(g).introducedFromLegacy) state.movementOrigin = { x: state.ctx.world.player.x, z: state.ctx.world.player.z };

  window.setInterval(() => {
    updateMovementTutorial();
    updateTutorialProgress();
    updateHudExtras();
    renderGuideLibrary();
    appendSettings();
    updateMachineDiagnostic();
    if (!state.panel?.hidden) renderPanel();
  }, 500);
}

boot();
