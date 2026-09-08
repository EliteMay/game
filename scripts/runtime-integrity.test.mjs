import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [storage, progression, entry, adaptive, keyboard, polish, worldRuntime, visualCss, highPollingInput] = await Promise.all([
  readFile(new URL('../games/scrap-factory/storage.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/progression-ui-v4.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/progression-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/adaptive-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/pause-notification-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/phase7-world-polish.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/phase7-world-runtime.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/visual-language-ui.css', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/high-polling-input.js', import.meta.url), 'utf8'),
]);

assert.match(storage, /loadRootSave\(\{ preferRuntime = true \} = \{\}\)/, 'root snapshots must prefer current runtime state during play');
assert.match(storage, /'scrap-factory': runtimeGameRef/, 'live game must replace stale persisted game in feature snapshots');
assert.match(storage, /loadRootSave\(\{ preferRuntime: false \}\)/, 'initial load must still read canonical persisted state');

assert.match(progression, /persistRuntimeGame/, 'progression changes must persist through the live runtime authority');
assert.doesNotMatch(progression, /localStorage\.setItem/, 'progression UI must not write stale save snapshots directly');
assert.doesNotMatch(progression, /SAVE_KEY/, 'progression UI must not own the storage key');

assert.doesNotMatch(entry, /bilingual-ui\.js/, 'live UI must not run the broad bilingual MutationObserver rewrite layer');
assert.match(adaptive, /\^\(\.\+\?\)を使う\$/, 'Home interactions must parse use actions without duplicated target/action text');
assert.match(adaptive, /\^\(\.\+\?\)を閉じる\$/, 'Home door close interaction must parse cleanly');
assert.match(adaptive, /<span>管理<\/span>/, 'management launcher should use one concise action language');

for (const code of ['Escape', 'KeyB', 'Tab', 'KeyO', 'KeyP']) {
  assert.match(keyboard, new RegExp(code), `panel keyboard handling must include ${code}`);
}
assert.match(keyboard, /#settings-panel[\s\S]*#guide-panel[\s\S]*#machine-panel[\s\S]*#inventory-panel[\s\S]*#build-panel/, 'Escape handling must cover core overlay panels');
assert.match(keyboard, /#home-pc-dashboard[\s\S]*#home-system-panel[\s\S]*#factory-management-panel[\s\S]*#progression-panel/, 'Escape handling must cover extended game panels');
assert.match(keyboard, /stopImmediatePropagation/, 'handled toggle keys must not fall through and reopen the same panel');

assert.match(polish, /detailDistance: 32/, 'High quality must retain detailed factory meshes into mid distance');
assert.match(polish, /detailDistance: 22/, 'Medium quality must not collapse machines to boxes immediately');
assert.match(polish, /cullDistance: 104/, 'High quality world visibility must extend beyond the previous short cull budget');

assert.match(worldRuntime, /SOLID_YARD_PROPS/, 'solid yard decorations must have explicit collision coverage');
assert.match(worldRuntime, /phase7PropColliderId/, 'added prop colliders must be idempotent');
assert.match(worldRuntime, /gantry-post-north/, 'large structural props must be included in collision coverage');

assert.match(entry, /import '\.\/phase7-world-runtime\.js';[\s\S]*import '\.\/high-polling-input\.js';/, 'high polling mouse input must load with the production runtime');
assert.match(highPollingInput, /pendingX \+= movementX[\s\S]*pendingY \+= movementY/, 'high-rate mouse events must accumulate movement instead of mutating camera state immediately');
assert.match(highPollingInput, /if \(!animationFrame\) animationFrame = requestAnimationFrame\(flush\)/, 'mouse look must schedule at most one frame flush at a time');
assert.match(highPollingInput, /document\.removeEventListener\('mousemove', world\.onMouseMove\)/, 'frame-batched mouse look must replace the base per-event look handler');
assert.match(highPollingInput, /world\.player\.yaw -= movementX \* safeSensitivity/, 'accumulated horizontal movement must preserve the configured sensitivity');
assert.match(highPollingInput, /world\.player\.pitch = Math\.max\(-1\.48, Math\.min\(1\.48,/, 'frame-batched pitch must preserve the existing pitch clamp');
assert.match(highPollingInput, /pointerlockchange[\s\S]*clearPending/, 'pending high-rate input must be discarded after pointer lock is lost');

assert.match(visualCss, /\.hud-context-stack \.hud-management\s*\{[\s\S]*position:\s*relative;/, 'compact Management control must join HUD flow instead of overlapping the goal');
assert.match(visualCss, /\.hud-management__toggle span\s*\{\s*display:\s*inline;/, 'compact Management launcher must remain visibly labeled');

console.log('Runtime integrity regression checks passed.');
