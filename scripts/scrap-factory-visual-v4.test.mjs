import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const entry = await readFile(new URL('../games/scrap-factory/progression-ui.js', import.meta.url), 'utf8');
const refinement = await readFile(new URL('../games/scrap-factory/visual-refinement-v4.js', import.meta.url), 'utf8');

assert.match(entry, /import '\.\/visual-overhaul-v3\.js';/);
assert.match(entry, /import '\.\/visual-refinement-v4\.js';/);
assert.ok(entry.indexOf("visual-overhaul-v3.js") < entry.indexOf("visual-refinement-v4.js"), 'v4 refinement must load after v3 replacement visuals');

assert.match(refinement, /function enforceOwnership\(root\)/, 'v4 must enforce one visible visual owner');
assert.match(refinement, /child\.visible = false/, 'legacy late-added visuals must be hidden');
assert.match(refinement, /bumpMap = finish/, 'v4 must add micro-surface relief');
assert.match(refinement, /roughnessMap = finish/, 'v4 must add material roughness variation');
assert.match(refinement, /function addTypeDetails\(group, type\)/, 'v4 must add type-specific hard-surface details');
assert.match(refinement, /function addDecal\(group, type/, 'v4 must add machine identity decals');
assert.match(refinement, /function addBaseFasteners\(group, material\)/, 'v4 must add fastener detail');
assert.match(refinement, /function addContactShadow\(group/, 'v4 must improve machine grounding');
assert.match(refinement, /setInterval\(refineAll, 700\)/, 'v4 must guard against late legacy visual patches');

console.log('Scrap Factory visual v4 guard passed.');
