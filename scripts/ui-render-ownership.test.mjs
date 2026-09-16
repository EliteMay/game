import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [phase4b, objectiveOwnership, homeSurface, rankRuntime] = await Promise.all([
  readFile(new URL('../games/scrap-factory/phase4b-management-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/early-game-hud-ownership.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/home-surface-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/early-game-rank-runtime.js', import.meta.url), 'utf8'),
]);

assert.match(phase4b, /PHASE4B_MANAGEMENT_UI_RETIRED/, 'legacy Phase 4-B management renderer must stay retired');
assert.doesNotMatch(phase4b, /setInterval|#factory-management-content|renderAdvancedOps/, 'retired management adapter must not poll or mutate the canonical panel');

assert.match(objectiveOwnership, /data-rank-goal-panel/, 'rank goals must have a dedicated owned HUD surface');
assert.match(objectiveOwnership, /data-objective-owner/, 'objective stack must expose explicit ownership state');
assert.doesNotMatch(objectiveOwnership, /MutationObserver/, 'primary objective ownership must not be maintained by a broad DOM observer');
assert.match(objectiveOwnership, /条件を満たすと自動でRank Upします/, 'rank goal copy must explain automatic promotion');

assert.match(homeSurface, /workbenchObserver/, 'Workbench compatibility enhancement must react to the canonical render boundary');
assert.match(homeSurface, /observe\(content, \{ childList: true, subtree: false \}\)/, 'Workbench observer must be scoped to direct canonical content replacement');
assert.doesNotMatch(homeSurface, /setInterval\(updateOpenSurfaces|ENHANCE_MS/, 'Workbench enhancement must not race the Home renderer on a high-frequency polling loop');
assert.match(homeSurface, /dashboardSignature/, 'Home dashboard must avoid replacing unchanged content every poll');

assert.match(rankRuntime, /advanceAutomaticRank/, 'one automatic rank controller must own promotions');
assert.match(rankRuntime, /const MAX_RANK = 7/, 'automatic promotion must stop at Rank 7');
assert.match(rankRuntime, /rank-up-celebration/, 'automatic promotion must provide an explicit celebration surface');
assert.doesNotMatch(rankRuntime, /AUTO_RANK_MAX = 3/, 'the old Rank 3 automatic-promotion cap must not return');

console.log('Scrap Factory UI render ownership checks passed.');
