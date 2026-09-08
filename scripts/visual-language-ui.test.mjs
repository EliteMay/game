import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [entry, surface, css] = await Promise.all([
  readFile(new URL('../games/scrap-factory/progression-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/visual-language-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/visual-language-ui.css', import.meta.url), 'utf8'),
]);

assert.match(entry, /import '\.\/visual-language-ui\.js';/, 'stable progression entrypoint must load the final visual language');
assert.ok(entry.indexOf("import './visual-language-ui.js';") > entry.indexOf("import './phase7-world-runtime.js';"), 'visual language must load after feature-specific UI layers');
assert.match(surface, /data-visual-language-ui/, 'visual language stylesheet must use a stable marker');
assert.match(surface, /dataset\.industrialSurface = 'true'/, 'major panels must opt into one shared industrial surface contract');
assert.match(surface, /dataset\.industrialHeader = 'true'/, 'major panel headers must share one hierarchy contract');
assert.match(css, /--sf-surface-deep:/, 'visual language must define shared surface tokens');
assert.match(css, /--sf-accent:/, 'visual language must define a restrained shared accent token');
assert.match(css, /\[data-industrial-surface="true"\][\s\S]*border-top:\s*3px solid var\(--sf-accent\)/, 'major panels must share one industrial frame');
assert.match(css, /\.primary-action[\s\S]*background:\s*var\(--sf-accent\)/, 'yellow accent must remain the primary-action signal');
assert.match(css, /\.problem-row--warn,[\s\S]*var\(--sf-danger\)/, 'danger state must retain a dedicated semantic signal');
assert.match(css, /\.upgrade-card\.is-owned,[\s\S]*rgb\(121 185 130/, 'healthy/complete state must retain a dedicated semantic signal');
assert.match(css, /\.hud-context-stack \.objective-panel[\s\S]*background:/, 'normal HUD must retain a lower-density world-first treatment');
assert.match(css, /button:focus-visible,[\s\S]*outline:\s*2px solid/, 'keyboard focus must remain clearly visible');
assert.match(css, /scrollbar-color:/, 'long management surfaces must keep visible restrained scrollbars');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'visual polish must preserve reduced-motion behavior');

console.log('Visual language UI regression checks passed');
