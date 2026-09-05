import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function file(rel) { return path.join(root, rel); }
function read(rel) { return fs.readFileSync(file(rel), 'utf8'); }
function write(rel, content) { fs.writeFileSync(file(rel), content); }

function replaceOnce(rel, before, after) {
  let content = read(rel);
  if (content.includes(after)) return false;
  if (!content.includes(before)) throw new Error(`Patch anchor not found: ${rel}\n${before.slice(0, 160)}`);
  content = content.replace(before, after);
  write(rel, content);
  return true;
}

function replaceRegex(rel, regex, replacement, marker) {
  let content = read(rel);
  if (marker && content.includes(marker)) return false;
  if (!regex.test(content)) throw new Error(`Regex patch anchor not found: ${rel} / ${regex}`);
  regex.lastIndex = 0;
  content = content.replace(regex, replacement);
  write(rel, content);
  return true;
}

function appendOnce(rel, marker, block) {
  let content = read(rel);
  if (content.includes(marker)) return false;
  content = `${content.trimEnd()}\n\n${block.trim()}\n`;
  write(rel, content);
  return true;
}

// Existing saves receive the Home feature additively, but Basic Tutorial must not be forced on them.
replaceOnce(
  'games/scrap-factory/home-system.js',
  "export function makeDefaultHomeState({ existingSave = false } = {}) {\n  return {",
  "export function makeDefaultHomeState({ existingSave = false } = {}) {\n  const tutorial = makeTutorialState();\n  if (existingSave) tutorial.basicStatus = 'skipped';\n  return {",
);
replaceOnce(
  'games/scrap-factory/home-system.js',
  "    tutorial: makeTutorialState(),\n    scanner: { lastPulseAt: 0 },",
  "    tutorial,\n    scanner: { lastPulseAt: 0 },",
);

// Manual Home Storage transfers are available from the start. QoL upgrades only automate/streamline them.
replaceOnce(
  'games/scrap-factory/home-system.js',
  "export function quickDepositToHome(game, { favorites = [] } = {}) {",
  `export function moveBackpackToHome(game, itemId, amount = 1) {
  const home = ensureHomeState(game);
  if (!ITEMS[itemId]) return { changed: false, reason: 'unknown-item', moved: 0 };
  const available = Math.max(0, Math.floor(Number(game.inventory?.[itemId] || 0)));
  const requested = Math.min(available, Math.max(1, Math.floor(Number(amount) || 1)));
  if (requested <= 0) return { changed: false, reason: 'no-item', moved: 0 };
  const moved = addUpTo(home.storage, itemId, requested, homeStorageSlotCapacity(game));
  if (moved > 0) game.inventory[itemId] = available - moved;
  return { changed: moved > 0, reason: moved > 0 ? null : 'full', moved };
}

export function moveHomeToBackpack(game, itemId, amount = 1) {
  const home = ensureHomeState(game);
  if (!ITEMS[itemId]) return { changed: false, reason: 'unknown-item', moved: 0 };
  const available = Math.max(0, Math.floor(Number(home.storage[itemId] || 0)));
  const requested = Math.min(available, Math.max(1, Math.floor(Number(amount) || 1)));
  if (requested <= 0) return { changed: false, reason: 'no-item', moved: 0 };
  const moved = addUpTo(game.inventory, itemId, requested, backpackSlotCapacity(game));
  if (moved > 0) {
    home.storage[itemId] = available - moved;
    if (home.storage[itemId] <= 0) delete home.storage[itemId];
  }
  return { changed: moved > 0, reason: moved > 0 ? null : 'full', moved };
}

export function quickDepositToHome(game, { favorites = [] } = {}) {`,
);

// Home runtime consumes the manual transfer API and Auto Sort has a visible behavior.
replaceOnce(
  'games/scrap-factory/home-runtime.js',
  "  markTutorialRead,\n  purchasePlayerUpgrade,",
  "  markTutorialRead,\n  moveBackpackToHome,\n  moveHomeToBackpack,\n  purchasePlayerUpgrade,",
);
replaceOnce(
  'games/scrap-factory/home-runtime.js',
  `function inventoryText(inventory) {
  const rows = Object.entries(inventory || {}).filter(([, n]) => Number(n) > 0);
  if (!rows.length) return '空';
  return rows.map(([id, n]) => \`${'${itemName(id)} ×${n}'}\`).join(' / ');
}`,
  `function inventoryText(inventory) {
  const rows = Object.entries(inventory || {}).filter(([, n]) => Number(n) > 0);
  if (!rows.length) return '空';
  const current = game();
  if (current && hasPlayerUpgrade(current, 'auto_sort')) {
    rows.sort(([a], [b]) => String(ITEMS[a]?.category || '').localeCompare(String(ITEMS[b]?.category || '')) || itemName(a).localeCompare(itemName(b), 'ja'));
  }
  return rows.map(([id, n]) => \`${'${itemName(id)} ×${n}'}\`).join(' / ');
}`,
);
replaceOnce(
  'games/scrap-factory/home-runtime.js',
  `    <section class="home-section">
      <div class="home-section__head"><div><span>TRANSFER</span><h3>探索準備</h3></div></div>
      <div class="home-inline-actions">
        <button type="button" data-quick-deposit class="primary-action" ${'${quick ? \'\' : \'disabled\'}'}>Quick Deposit</button>
        <button type="button" data-release-secure class="secondary-action" ${'${Object.keys(h.secureCase).length ? \'\' : \'disabled\'}'}>Secure Case → Home Storage</button>
      </div>
      <p>${'${quick ? \'通常Lootを手動一括移動します。Secure Case / Final系Itemは自動移動しません。\' : \'Quick DepositはRank 2 Upgradeで解放。手動移動は常に可能です。\'}'}</p>
    </section>`,
  `    <section class="home-section">
      <div class="home-section__head"><div><span>MANUAL TRANSFER</span><h3>Backpack ↔ Home Storage</h3></div><strong>最初から利用可能</strong></div>
      <div class="home-transfer-grid">
        <div><h4>Backpack</h4>${'${Object.entries(g.inventory || {}).filter(([, n]) => Number(n) > 0).map(([id, n]) => `<article><span>${itemName(id)} ×${n}</span><button type="button" data-home-deposit="${id}">1個預ける</button></article>`).join(\'\') || \'<p>空</p>\'}'}</div>
        <div><h4>Home Storage</h4>${'${Object.entries(h.storage || {}).filter(([, n]) => Number(n) > 0).map(([id, n]) => `<article><span>${itemName(id)} ×${n}</span><button type="button" data-home-withdraw="${id}">1個取り出す</button></article>`).join(\'\') || \'<p>空</p>\'}'}</div>
      </div>
      <div class="home-inline-actions">
        <button type="button" data-quick-deposit class="primary-action" ${'${quick ? \'\' : \'disabled\'}'}>Quick Deposit</button>
        <button type="button" data-release-secure class="secondary-action" ${'${Object.keys(h.secureCase).length ? \'\' : \'disabled\'}'}>Secure Case → Home Storage</button>
      </div>
      <p>${'${quick ? \'通常Lootを手動一括移動します。Secure Case / Final系Itemは自動移動しません。\' : \'Quick DepositはRank 2 Upgradeで解放。1個ずつの手動移動は常に可能です。\'}'}</p>
    </section>`,
);
replaceOnce(
  'games/scrap-factory/home-runtime.js',
  "function bindPanelActions(content, g) {\n  content.querySelectorAll('[data-buy-upgrade]').forEach((button) => button.addEventListener('click', () => {",
  `function bindPanelActions(content, g) {
  content.querySelectorAll('[data-home-deposit]').forEach((button) => button.addEventListener('click', () => {
    const result = moveBackpackToHome(g, button.dataset.homeDeposit, 1);
    if (result.changed) { persist('Home Storage Deposit'); state.ctx?.renderAll?.(); renderPanel(); }
    else toast(result.reason === 'full' ? 'Home Storageが満杯です' : '移動できません', 'warn');
  }));
  content.querySelectorAll('[data-home-withdraw]').forEach((button) => button.addEventListener('click', () => {
    const result = moveHomeToBackpack(g, button.dataset.homeWithdraw, 1);
    if (result.changed) { persist('Home Storage Withdraw'); state.ctx?.renderAll?.(); renderPanel(); }
    else toast(result.reason === 'full' ? 'Backpackが満杯です' : '移動できません', 'warn');
  }));
  content.querySelectorAll('[data-buy-upgrade]').forEach((button) => button.addEventListener('click', () => {`,
);
replaceOnce(
  'games/scrap-factory/home-runtime.js',
  "    const result = quickDepositToHome(g);",
  "    const result = quickDepositToHome(g, { favorites: [ensureHomeState(g).materialTracking].filter(Boolean) });",
);
replaceOnce(
  'games/scrap-factory/home-runtime.js',
  "  const hits = pulseWorldScanner(state.ctx.world, result.profile);\n  persist('Scanner Pulse');\n  toast(hits.length ? `SCANNER: ${hits.length} target` : 'SCANNER: targetなし', hits.length ? 'success' : 'info');",
  `  const hits = pulseWorldScanner(state.ctx.world, result.profile);
  const resourcePoints = result.profile.resourceScanner
    ? Object.values(g.exploration?.areas || {}).reduce((sum, area) => sum + (area.resourcePoints?.length || 0), 0)
    : 0;
  persist('Scanner Pulse');
  const resourceText = resourcePoints ? \` / Resource Point ${'${resourcePoints}'}\` : '';
  toast(hits.length || resourcePoints ? \`SCANNER: ${'${hits.length}'} loot${'${resourceText}'}\` : 'SCANNER: targetなし', hits.length || resourcePoints ? 'success' : 'info');`,
);
replaceOnce(
  'games/scrap-factory/home-runtime.js',
  "  if (!g || !panel || panel.hidden) return;\n  let node = panel.querySelector('#machine-diagnostic');",
  "  if (!g || !panel || panel.hidden) return;\n  let node = panel.querySelector('#machine-diagnostic');",
);
// Contextual Hints toggle hides automatic in-machine diagnostics, while PC diagnostics remain always available.
replaceOnce(
  'games/scrap-factory/home-runtime.js',
  "  if (!node) {\n    node = document.createElement('div');\n    node.id = 'machine-diagnostic';\n    node.className = 'machine-diagnostic';\n    panel.querySelector('.machine-actions')?.before(node);\n  }\n  const target = state.ctx.world.currentTarget;",
  "  if (!node) {\n    node = document.createElement('div');\n    node.id = 'machine-diagnostic';\n    node.className = 'machine-diagnostic';\n    panel.querySelector('.machine-actions')?.before(node);\n  }\n  node.hidden = g.settings.contextualHints === false;\n  if (node.hidden) return;\n  const target = state.ctx.world.currentTarget;",
);

// Shared diagnostics reuse the existing factory analyzer for logistics, then add Home/Player state.
replaceOnce(
  'games/scrap-factory/system-diagnostics.js',
  "import { BUILDINGS, ITEMS, RECIPES } from './config.js';",
  "import { BUILDINGS, ITEMS, RECIPES } from './config.js';\nimport { analyzeFactory } from './factory-management.js';\nimport { backpackSlotCapacity, ensureHomeState, homeStorageSlotCapacity, secureCaseSlotCapacity } from './home-system.js';",
);
replaceOnce(
  'games/scrap-factory/system-diagnostics.js',
  "  const finalMissing = mega.missing?.map((entry) => entry.label) || [];\n\n  return [",
  `  const finalMissing = mega.missing?.map((entry) => entry.label) || [];
  const factory = analyzeFactory(game || {});
  const logisticsAlerts = (factory.alerts || []).filter((entry) => /物流|搬送|コンベア|conveyor|route|行き止まり|storage/i.test(\`${'${entry.title || \'\'} ${entry.detail || \'\'}'}\`));
  const home = ensureHomeState(game);

  return [
    {
      id: 'home', name: 'Home / Player', status: 'OK',
      summary: \`Backpack ${'${backpackSlotCapacity(game)}'} / Home ${'${homeStorageSlotCapacity(game)}'} / Case ${'${secureCaseSlotCapacity(game)}'} Slot\`,
      action: home.respawnEnabled ? 'Respawn: Home Bed' : 'Bed未登録: 既存Return位置を維持',
    },
    {
      id: 'logistics', name: 'Logistics', status: logisticsAlerts.length ? 'WARN' : 'OK',
      summary: logisticsAlerts.length ? logisticsAlerts[0].title : '重大な物流Alertなし',
      action: logisticsAlerts.length ? (logisticsAlerts[0].detail || '向き・受取Item・Storage残量を確認') : 'Directional Route正常',
    },`,
);

// Exploration Scanner exposes Sprint Efficiency and richer scanner feedback.
replaceOnce(
  'games/scrap-factory/exploration-home-ui.js',
  "  ensureHomeState,\n  markScannerPulse,",
  "  ensureHomeState,\n  hasPlayerUpgrade,\n  markScannerPulse,",
);
replaceOnce(
  'games/scrap-factory/exploration-home-ui.js',
  "function game() {\n  return state.runtime?.getGame?.() || null;\n}\n",
  `function game() {
  return state.runtime?.getGame?.() || null;
}

window.__scrapPlayerConvenience = {
  sprintMultiplier: () => {
    const current = game();
    return current && hasPlayerUpgrade(current, 'sprint_efficiency') ? 1.08 : 1;
  },
};
`,
);
replaceOnce(
  'games/scrap-factory/exploration-home-ui.js',
  "  persist('Exploration Scanner Pulse');\n  toast(selected.length ? `SCANNER: ${selected.length} target` : 'SCANNER: targetなし');",
  `  const resourcePoints = result.profile.resourceScanner
    ? Object.values(g.exploration?.areas || {}).reduce((sum, area) => sum + (area.resourcePoints?.length || 0), 0)
    : 0;
  persist('Exploration Scanner Pulse');
  toast(selected.length || resourcePoints ? \`SCANNER: ${'${selected.length}'} loot${'${resourcePoints ? ` / Resource Point ${resourcePoints}` : \'\'}'}\` : 'SCANNER: targetなし');`,
);

// Save/Migration: additive schema-v1 Home state, new-game Home spawn, old player coordinates preserved by candidate spread.
replaceOnce(
  'games/scrap-factory/storage.js',
  "import { makeDefaultProgression, normalizeProgression } from './progression.js';",
  "import { makeDefaultProgression, normalizeProgression } from './progression.js';\nimport { HOME_RESPAWN_POSITION, makeDefaultHomeState, normalizeHomeState } from './home-system.js';",
);
replaceOnce(
  'games/scrap-factory/storage.js',
  "    finalChapter: makeDefaultFinalChapter(),\n    player: { x: 0, y: 1.7, z: 8, yaw: 0 },",
  "    finalChapter: makeDefaultFinalChapter(),\n    home: makeDefaultHomeState({ existingSave: false }),\n    player: { ...HOME_RESPAWN_POSITION },",
);
replaceOnce(
  'games/scrap-factory/storage.js',
  "      showFps: false,\n    },",
  "      showFps: false,\n      tutorialObjectives: true,\n      contextualHints: true,\n      stuckHelp: true,\n      nextGoal: true,\n      homeMarker: true,\n      scannerKey: 'KeyQ',\n    },",
);
replaceOnce(
  'games/scrap-factory/storage.js',
  "    finalChapter: normalizeFinalChapter(candidate.finalChapter),\n    player: { ...base.player, ...(isObject(candidate.player) ? candidate.player : {}) },",
  "    finalChapter: normalizeFinalChapter(candidate.finalChapter),\n    home: normalizeHomeState(candidate.home, { existingSave: !isObject(candidate.home), legacyGame: candidate }),\n    player: { ...base.player, ...(isObject(candidate.player) ? candidate.player : {}) },",
);

// Factory runtime uses dynamic Slot capacity and actual tutorial events.
replaceOnce(
  'games/scrap-factory/game.js',
  "import { ScrapWorld } from './world.js';\n\nconst MAX_SLOTS = 12;",
  `import { ScrapWorld } from './world.js';
import {
  advanceHomeTutorial,
  backpackSlotCapacity,
  hasPlayerUpgrade,
  homeTutorialObjective,
  recordTutorialEvent,
} from './home-system.js';

const BASE_MAX_SLOTS = 12;
function maxSlots() { return backpackSlotCapacity(game, BASE_MAX_SLOTS); }`,
);
replaceOnce(
  'games/scrap-factory/game.js',
  "  getSensitivity: () => Number(game.settings.mouseSensitivity || 0.0022),\n  isOverlayOpen: () => Boolean(currentPanel),",
  "  getSensitivity: () => Number(game.settings.mouseSensitivity || 0.0022),\n  getSprintMultiplier: () => hasPlayerUpgrade(game, 'sprint_efficiency') ? 1.08 : 1,\n  isOverlayOpen: () => Boolean(currentPanel),",
);
replaceOnce(
  'games/scrap-factory/game.js',
  "world.setQuality(game.settings.quality);\nworld.run();\n\ninitializeUi();",
  "world.setQuality(game.settings.quality);\nworld.run();\n\nwindow.__scrapFactoryRuntime = { world, getGame: () => game, persist, renderAll, toast, getPowerSnapshot: () => powerSnapshot };\n\ninitializeUi();",
);
replaceOnce(
  'games/scrap-factory/game.js',
  "  ui.openBuild.addEventListener('click', () => openPanel('build'));",
  "  ui.openBuild.addEventListener('click', () => { recordTutorialEvent(game, 'buildMenuOpened', true); advanceTutorial(); openPanel('build'); });",
);
replaceOnce(
  'games/scrap-factory/game.js',
  "  if (code === 'KeyB' && !currentPanel && !dismantleMode) openPanel('build');\n  if (code === 'Tab' && !currentPanel && !dismantleMode) openPanel('inventory');",
  "  if (code === 'KeyB' && !currentPanel && !dismantleMode) { recordTutorialEvent(game, 'buildMenuOpened', true); advanceTutorial(); openPanel('build'); }\n  if (code === 'Tab' && !currentPanel && !dismantleMode) { recordTutorialEvent(game, 'inventoryOpened', true); advanceTutorial(); openPanel('inventory'); }",
);
replaceOnce(
  'games/scrap-factory/game.js',
  "    if (moved > 0) {\n      toast(`${moved}個を投入ホッパーへ移動`, 'success');",
  "    if (moved > 0) {\n      recordTutorialEvent(game, 'hopperDeposit', true);\n      toast(`${moved}個を投入ホッパーへ移動`, 'success');",
);
replaceOnce(
  'games/scrap-factory/game.js',
  "    if (value > 0) {\n      toast(`売却 +$${value}`, 'success');",
  "    if (value > 0) {\n      recordTutorialEvent(game, 'manualSale', true);\n      toast(`売却 +$${value}`, 'success');",
);
replaceOnce(
  'games/scrap-factory/game.js',
  "  return usedSlots(inventory) < MAX_SLOTS;",
  "  return usedSlots(inventory) < maxSlots();",
);
replaceOnce(
  'games/scrap-factory/game.js',
  "  if (target.type === 'seller') {\n    addRevenue(ITEMS[itemId]?.value || 0);\n    sound('sell');",
  "  if (target.type === 'seller') {\n    addRevenue(ITEMS[itemId]?.value || 0);\n    if (itemId === 'crushed_metal') recordTutorialEvent(game, 'autoSale', true);\n    sound('sell');",
);
replaceRegex(
  'games/scrap-factory/game.js',
  /function advanceTutorial\(\) \{[\s\S]*?\n\}\n\nfunction tutorialProgressValue/,
  `function advanceTutorial() {
  const result = advanceHomeTutorial(game);
  if (result.changed) {
    persist('Tutorial Progress');
    if (result.completed) toast('BASIC TUTORIAL COMPLETE / +$50', 'success');
  }
  renderTutorial();
}

function tutorialProgressValue`,
  "persist('Tutorial Progress')",
);
replaceRegex(
  'games/scrap-factory/game.js',
  /function renderTutorial\(\) \{[\s\S]*?\n\}\n\nfunction renderHud/,
  `function renderTutorial() {
  const goal = homeTutorialObjective(game);
  ui.tutorialTitle.textContent = \`${'${goal.kind}: ${goal.title}'}\`;
  ui.tutorialBody.textContent = goal.body;
  ui.tutorialProgress.textContent = goal.progress;
}

function renderHud`,
  'homeTutorialObjective(game)',
);
replaceOnce(
  'games/scrap-factory/game.js',
  "  ui.inventorySlots.textContent = `${usedSlots(game.inventory)} / ${MAX_SLOTS}`;",
  "  ui.inventorySlots.textContent = `${usedSlots(game.inventory)} / ${maxSlots()}`;",
);

// Fixed Home extends only the traversal boundary; Factory build grid remains BASE_LIMIT / 2.5m unchanged.
replaceOnce(
  'games/scrap-factory/world.js',
  "const WORLD_BOUNDS = { minX: -21.4, maxX: 92, minZ: -30.5, maxZ: 30.5 };",
  "const WORLD_BOUNDS = { minX: -21.4, maxX: 92, minZ: -30.5, maxZ: 44.5 };",
);
replaceOnce(
  'games/scrap-factory/world.js',
  "    const speed = sprint ? 8.0 : 5.2;",
  "    const speed = (sprint ? 8.0 : 5.2) * (this.callbacks.getSprintMultiplier?.() ?? 1);",
);
replaceOnce(
  'games/scrap-factory/industrial-art.js',
  "  addFence(scene, staticColliders, [-22, 22], [20.5, 22]);",
  "  addFence(scene, staticColliders, [-22, 22], [-13, 22]);\n  addFence(scene, staticColliders, [-7, 22], [20.5, 22]);",
);

// Exploration uses the same dynamic Backpack Slot contract and Home respawn after Bed activation.
replaceOnce(
  'games/scrap-factory/exploration-core-v4.js',
  "import { ITEMS, usedSlots } from './config.js';",
  "import { ITEMS, usedSlots } from './config.js';\nimport { HOME_RESPAWN_POSITION, backpackSlotCapacity, ensureHomeState } from './home-system.js';",
);
replaceOnce(
  'games/scrap-factory/exploration-core-v4.js',
  "function canAddSessionLoot(session, itemId, amount = 1) {",
  "function canAddSessionLoot(game, session, itemId, amount = 1) {",
);
replaceOnce(
  'games/scrap-factory/exploration-core-v4.js',
  "    if (!(current > 0 && current % def.stack !== 0) && usedSlots(simulated) >= EXPLORATION_MAX_SLOTS) return false;",
  "    if (!(current > 0 && current % def.stack !== 0) && usedSlots(simulated) >= backpackSlotCapacity(game, EXPLORATION_MAX_SLOTS)) return false;",
);
replaceOnce(
  'games/scrap-factory/exploration-core-v4.js',
  "  return canAddSessionLoot(ensureExplorationState(game).activeSession, itemId, amount);",
  "  return canAddSessionLoot(game, ensureExplorationState(game).activeSession, itemId, amount);",
);
replaceOnce(
  'games/scrap-factory/exploration-core-v4.js',
  "  if (!canAddSessionLoot(session, itemId, count)) return { changed: false, reason: 'full' };",
  "  if (!canAddSessionLoot(game, session, itemId, count)) return { changed: false, reason: 'full' };",
);
replaceOnce(
  'games/scrap-factory/exploration-core-v4.js',
  "  const lost = lootCount(session.loot) + (session.researchCargo?.length || 0);\n  exploration.activeSession = null;\n  return { changed: true, lost };",
  "  const lost = lootCount(session.loot) + (session.researchCargo?.length || 0);\n  exploration.activeSession = null;\n  const home = ensureHomeState(game);\n  if (home.respawnEnabled) game.player = { ...HOME_RESPAWN_POSITION };\n  return { changed: true, lost };",
);
replaceOnce(
  'games/scrap-factory/exploration-core-v4.js',
  "function canAddFactoryInventory(inventory, itemId) {",
  "function canAddFactoryInventory(game, inventory, itemId) {",
);
replaceOnce(
  'games/scrap-factory/exploration-core-v4.js',
  "  return usedSlots(inventory) < EXPLORATION_MAX_SLOTS;",
  "  return usedSlots(inventory) < backpackSlotCapacity(game, EXPLORATION_MAX_SLOTS);",
);
replaceOnce(
  'games/scrap-factory/exploration-core-v4.js',
  "    while (remaining > 0 && canAddFactoryInventory(game.inventory, itemId)) {",
  "    while (remaining > 0 && canAddFactoryInventory(game, game.inventory, itemId)) {",
);

// Stable progression entrypoint loads the Home runtime beside existing Phase 6-C/Final layers.
replaceOnce(
  'games/scrap-factory/progression-ui.js',
  "import './final-phase-ui.js';\nexport * from './progression-ui-v4.js';",
  "import './final-phase-ui.js';\nimport './home-runtime.js';\nexport * from './progression-ui-v4.js';",
);

const explorationFiles = [
  'games/scrap-factory/exploration/residential.js',
  'games/scrap-factory/exploration/industrial.js',
  'games/scrap-factory/exploration/military.js',
  'games/scrap-factory/exploration/research.js',
];
for (const rel of explorationFiles) {
  replaceOnce(rel, "import * as THREE from 'three';", "import * as THREE from 'three';\nimport '../exploration-home-ui.js';");
  let content = read(rel);
  if (!content.includes('__scrapPlayerConvenience')) {
    const speedRegex = /(\s*)const speed = (keys\.has\('ShiftLeft'\)[^;\n]+);/;
    if (!speedRegex.test(content)) throw new Error(`Sprint speed anchor not found: ${rel}`);
    content = content.replace(speedRegex, (_, indent, expr) => `${indent}const baseSpeed = ${expr};${indent}const speed = baseSpeed * (window.__scrapPlayerConvenience?.sprintMultiplier?.() ?? 1);`);
    write(rel, content);
  }
  appendOnce(rel, '__scrapExplorationRuntime', `window.__scrapExplorationRuntime = {
  getGame: () => game,
  persist,
  scene,
  camera,
  lootMeshes: typeof lootMeshes !== 'undefined' ? lootMeshes : new Map(),
};`);
}

// Test the real Home respawn mutation after the exploration patch is applied.
replaceOnce(
  'scripts/home-system.test.mjs',
  "  abandonExpedition(legacy);\n  // Home-aware exploration migration patches this exact coordinate during integration.\n  assert.ok(Number.isFinite(HOME_RESPAWN_POSITION.x));",
  "  abandonExpedition(legacy);\n  assert.deepEqual(legacy.player, HOME_RESPAWN_POSITION, 'Bed-enabled expedition failure must return to Home');",
);

// Home Storage manual transfer styling.
appendOnce('games/scrap-factory/home-system.css', '.home-transfer-grid', `.home-transfer-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 12px 0 16px;
}
.home-transfer-grid > div { padding: 12px; border: 1px solid rgba(255,255,255,.08); background: #181e1f; }
.home-transfer-grid h4 { margin: 0 0 9px; color: #d5c46d; }
.home-transfer-grid article { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 0; border-top: 1px solid rgba(255,255,255,.06); }
.home-transfer-grid article:first-of-type { border-top: 0; }
.home-transfer-grid button { padding: 6px 8px; border: 1px solid rgba(212,181,74,.28); background: #302d20; color: #e4d47d; cursor: pointer; }
@media (max-width: 700px) { .home-transfer-grid { grid-template-columns: 1fr; } }`);

// Normal validation now includes the Home/Migration regression suite.
replaceOnce(
  'package.json',
  '"validate": "node scripts/validate.mjs && node scripts/phase6b.test.mjs && node scripts/phase6c.test.mjs && node scripts/final-phase.test.mjs",',
  '"validate": "node scripts/validate.mjs && node scripts/phase6b.test.mjs && node scripts/phase6c.test.mjs && node scripts/final-phase.test.mjs && node scripts/home-system.test.mjs",',
);
replaceOnce(
  'package.json',
  '"test:final": "node scripts/final-phase.test.mjs"',
  '"test:final": "node scripts/final-phase.test.mjs",\n    "test:home": "node scripts/home-system.test.mjs"',
);

console.log('Home feature integration patches applied.');
