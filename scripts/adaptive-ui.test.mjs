import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [entry, adaptive, css] = await Promise.all([
  readFile(new URL('../games/scrap-factory/progression-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/adaptive-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/adaptive-ui.css', import.meta.url), 'utf8'),
]);

assert.match(entry, /import '\.\/adaptive-ui\.js';/, 'production progression entrypoint must load adaptive HUD');
assert.doesNotMatch(adaptive, /MutationObserver/, 'adaptive HUD must not use broad MutationObserver patches');
assert.match(adaptive, /AREA_BANNER_MS = 2200/, 'zone label should be transient rather than permanent');
assert.match(adaptive, /OBJECTIVE_EXPAND_MS = 2600/, 'main goal detail should only expand briefly after an update');
assert.match(adaptive, /cash\.hidden = true/, 'cash should leave the normal gameplay HUD');
assert.match(adaptive, /revenue\.hidden = true/, 'lifetime revenue should leave the normal gameplay HUD');
assert.match(adaptive, /CAPACITY_WARN_RATIO/, 'backpack capacity should be contextual rather than permanently visible');
assert.match(adaptive, /rail\.hidden = true/, 'normal gameplay command rail must stay hidden');
assert.match(adaptive, /状況別操作ヒント/, 'legacy shortcut setting must be repurposed for contextual mode hints');
assert.match(adaptive, /data-hud-context-stack/, 'main goal and contextual progress must share one non-overlapping stack');
assert.match(adaptive, /data-hud-management/, 'secondary management actions must use progressive disclosure');
assert.match(adaptive, /#progression-hud[\s\S]*#factory-management-hud[\s\S]*#automation-hud/, 'rank, factory, and automation actions must share one management tray');
assert.match(adaptive, /#factory-challenge-pin[\s\S]*#final-phase-hud/, 'optional progress modules must join the main-goal stack without absolute-position collisions');
assert.match(adaptive, /data-management-alert/, 'factory warnings must remain discoverable on the collapsed management launcher');
assert.match(adaptive, /homeTutorialObjective/, 'normal HUD must derive the main goal from the canonical tutorial/goal source');
assert.match(adaptive, /interaction-prompt__target/, 'interaction prompt must separate target identity');
assert.match(adaptive, /interaction-prompt__action/, 'interaction prompt must separate the primary action');
assert.match(adaptive, /BACKPACK FULL \/ 空きSlotが必要/, 'interaction prompt must explain a blocked pickup');
assert.match(adaptive, /data-adaptive-inventory-summary/, 'inventory must expose contextual backpack and cash summary');
assert.match(adaptive, /inventory-slot/, 'inventory must render the slot-based backpack visually');
assert.match(adaptive, /data-adaptive-inventory-detail/, 'inventory must expose selected item detail');
assert.match(adaptive, /adaptive-craft-state/, 'hand craft must explain craftable or blocked state');
assert.match(adaptive, /data-adaptive-build-category/, 'build selector must expose categories without reordering quick-build buttons');
assert.match(adaptive, /data-adaptive-build-quick/, 'build mode must expose quick-build keys contextually');
assert.match(adaptive, /data-build-cost/, 'build mode must surface equipment cost');
assert.match(adaptive, /data-build-grid/, 'build mode must surface grid snap');
assert.match(adaptive, /data-build-flow/, 'build mode must surface flow context');
assert.match(adaptive, /data-build-status/, 'build mode must surface placement status');
assert.match(adaptive, /建築エリア外/, 'invalid build placement should explain the area boundary cause');
assert.match(adaptive, /グリッド使用済み/, 'invalid build placement should explain occupied cells');
assert.match(adaptive, /固定物と干渉/, 'invalid build placement should explain static collisions');
assert.match(adaptive, /プレイヤーに近すぎる/, 'invalid build placement should explain player collision risk');
assert.match(css, /\.hud__bottom-left,[\s\S]*\.shortcut-bar\s*\{[\s\S]*display:\s*none !important;/, 'persistent duplicate command surfaces must be visually suppressed');
assert.match(css, /\.hud-context-stack\s*\{[\s\S]*left:\s*18px;/, 'main goal stack should live on the upper-left');
assert.match(css, /\.hud-management\s*\{[\s\S]*position:\s*fixed;[\s\S]*right:\s*18px;/, 'management disclosure should stay separate from the main goal');
assert.match(css, /\.objective-panel\.is-updated[\s\S]*\.objective-panel\.is-updated p/, 'objective detail should appear only in its updated state');
assert.match(css, /\.interaction-prompt__target/, 'structured interaction prompt must have explicit visual hierarchy');
assert.match(css, /\.inventory-grid\s*\{[\s\S]*grid-template-columns:/, 'backpack slots must use a real visual grid');
assert.match(css, /\.build-category-heading/, 'build categories must have explicit hierarchy styling');
assert.match(css, /\.adaptive-build-context/, 'adaptive build context must have explicit layout styling');
assert.match(css, /@media \(max-width: 620px\)/, 'adaptive HUD must include narrow viewport behavior');

console.log('Adaptive UI regression checks passed');