import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [entry, surface, css] = await Promise.all([
  readFile(new URL('../games/scrap-factory/progression-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/home-surface-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/home-surface-ui.css', import.meta.url), 'utf8'),
]);

assert.match(entry, /import '\.\/home-surface-ui\.js';/, 'stable progression entrypoint must load the Home surface hierarchy');
assert.match(surface, /HOME PC \/ PLAYER HUB/, 'PC must open through a Home/player dashboard rather than dropping directly into upgrades');
assert.match(surface, /data-pc-target="tutorial"/, 'PC dashboard must expose the detailed Tutorial Library');
assert.match(surface, /dashboardAction\('workbench'/, 'PC dashboard must expose exploration preparation/workbench');
assert.match(surface, /Factoryの診断と管理は <kbd>V<\/kbd> \/ <kbd>P<\/kbd>/, 'PC must keep Factory diagnostics/management as separate world tools');
assert.match(surface, /layout\.dataset\.homeLibrary = 'true'/, 'O guide must block the legacy full-library renderer');
assert.match(surface, /FIELD QUICK GUIDE/, 'O guide must identify itself as a quick in-play guide');
assert.match(surface, /Home PC → <strong>TUTORIAL LIBRARY<\/strong>/, 'Quick Guide must route detailed learning to the Home PC library');
assert.doesNotMatch(surface, /markTutorialRead/, 'opening the Quick Guide must not mark the detailed Tutorial Library as read');
assert.match(surface, /moveBackpackToHome\(g, itemId, available\)/, 'Workbench must support moving all available backpack items');
assert.match(surface, /moveHomeToBackpack\(g, itemId, available\)/, 'Workbench must support moving all available Home Storage items');
assert.match(surface, /data-home-transfer-all/, 'fast transfer must be an explicit secondary action, not replace one-item precision');
assert.match(css, /\.home-pc-action-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3/, 'PC dashboard must use a scannable action grid on desktop');
assert.match(css, /\[data-quick-guide="true"\]/, 'Quick Guide must have an explicit compact visual contract');
assert.match(css, /button\[data-home-transfer-all\]/, 'ALL transfer must have explicit styling distinct from precise one-item transfer');
assert.match(css, /@media \(max-width: 620px\)/, 'Home surfaces must define narrow viewport behavior');

console.log('Home surface UI regression checks passed');
