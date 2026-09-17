import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const entry = await readFile(new URL('../games/scrap-factory/progression-ui.js', import.meta.url), 'utf8');
const visual = await readFile(new URL('../games/scrap-factory/visual-overhaul-v3.js', import.meta.url), 'utf8');

assert.match(entry, /import '\.\/visual-overhaul-v3\.js';/, 'progression entrypoint must load visual overhaul v3');
assert.doesNotMatch(entry, /visual-overhaul-v2\.js/, 'v2 visual overlay must not be loaded together with v3');

for (const required of [
  'buildConveyor',
  'buildHopper',
  'buildSeller',
  'buildCrusher',
  'buildSmelter',
  'buildStorage',
  'buildAssembler',
  'buildPower',
  'buildDronePort',
  'buildJunction',
]) {
  assert.match(visual, new RegExp(`function ${required}\\(`), `missing dedicated non-box visual builder: ${required}`);
}

assert.match(visual, /hideLegacyVisuals\(root\)/, 'v3 must replace legacy silhouettes rather than only decorating them');
assert.match(visual, /node\.visible = false/, 'legacy machine meshes must be visually retired');
assert.match(visual, /new THREE\.CylinderGeometry/, 'v3 must use curved machine geometry');
assert.match(visual, /new THREE\.SphereGeometry/, 'v3 must use rounded machine geometry');
assert.match(visual, /new THREE\.TorusGeometry/, 'v3 must use ring geometry for mechanical silhouettes');
assert.match(visual, /new THREE\.TubeGeometry/, 'v3 must use curved pipe geometry');
assert.match(visual, /new RoundedBoxGeometry/, 'v3 must keep controlled beveled hard-surface forms');

const curvedBuilderCalls = (visual.match(/\b(?:cylinder|sphere|torus|tube)\(group,/g) || []).length;
const roundedBuilderCalls = (visual.match(/\brounded\(group,/g) || []).length;
assert.ok(curvedBuilderCalls >= 45, `expected strong curved-geometry presence, got ${curvedBuilderCalls}`);
assert.ok(curvedBuilderCalls > roundedBuilderCalls, `curved geometry should dominate v3 machine silhouettes (${curvedBuilderCalls} <= ${roundedBuilderCalls})`);

console.log(`Scrap Factory visual v3 guard passed: curved=${curvedBuilderCalls}, rounded=${roundedBuilderCalls}`);
