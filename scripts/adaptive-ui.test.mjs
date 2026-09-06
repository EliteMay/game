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
assert.match(adaptive, /revenue\.hidden = true/, 'lifetime revenue should leave the normal gameplay HUD');
assert.match(adaptive, /ratio < 0\.75/, 'backpack capacity should become contextual in the factory');
assert.match(adaptive, /showShortcuts === false \|\| contextualMode/, 'command rail setting and mode-specific UI must be respected');
assert.match(adaptive, /data-hud-context-stack/, 'normal HUD must use one right-side contextual layout stack');
assert.match(adaptive, /data-hud-management/, 'secondary management actions must use progressive disclosure');
assert.match(adaptive, /#progression-hud[\s\S]*#factory-management-hud[\s\S]*#automation-hud/, 'rank, factory, and automation actions must share one management tray');
assert.match(adaptive, /#factory-challenge-pin[\s\S]*#final-phase-hud/, 'contextual status modules must join the same non-overlapping stack');
assert.match(adaptive, /data-management-alert/, 'factory warnings must remain discoverable on the collapsed management launcher');
assert.match(adaptive, /data-build-cost/, 'build mode must surface equipment cost');
assert.match(adaptive, /data-build-grid/, 'build mode must surface grid snap');
assert.match(adaptive, /data-build-flow/, 'build mode must surface flow context');
assert.match(adaptive, /data-build-status/, 'build mode must surface placement status');
assert.match(adaptive, /建築エリア外/, 'invalid build placement should explain the area boundary cause');
assert.match(adaptive, /グリッド使用済み/, 'invalid build placement should explain occupied cells');
assert.match(adaptive, /固定物と干渉/, 'invalid build placement should explain static collisions');
assert.match(adaptive, /プレイヤーに近すぎる/, 'invalid build placement should explain player collision risk');
assert.match(css, /\.shortcut-bar\s*\{[\s\S]*display:\s*none !important;/, 'duplicate shortcut bar must be visually suppressed');
assert.match(css, /\.hud-context-stack\s*\{[\s\S]*display:\s*grid;/, 'right HUD must use normal layout flow rather than manually stacked top offsets');
assert.match(css, /\.hud-context-stack \.objective-panel\s*\{[\s\S]*position:\s*relative;/, 'primary objective must participate in the contextual stack flow');
assert.match(css, /\.hud-management__tray \.progression-hud[\s\S]*position:\s*relative !important;/, 'management actions must override legacy absolute positioning');
assert.match(css, /\.adaptive-build-context/, 'adaptive build context must have explicit layout styling');
assert.match(css, /@media \(max-width: 620px\)/, 'adaptive HUD must include narrow viewport behavior');

console.log('Adaptive UI regression checks passed');
