import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RESEARCH_AREA_ID,
  RESEARCH_COMPONENTS,
  abandonExpedition,
  advanceResearchObjective,
  collectExplorationLoot,
  collectResearchCargo,
  discoverExplorationZone,
  explorationAreaState,
  makeDefaultExploration,
  normalizeExploration,
  researchComponentState,
  researchProgressSummary,
  returnFromExpedition,
  startExpedition,
} from '../games/scrap-factory/exploration.js';
import { makeDefaultProgression } from '../games/scrap-factory/progression.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function gameAt(rank = 7) {
  return {
    money: 12000,
    lifetimeRevenue: 12000,
    inventory: {},
    discoveredItems: ['metal_scrap', 'rare_alloy'],
    tutorialStats: { collected: 100, processed: 100, automationComplete: true },
    buildings: [],
    progression: { ...makeDefaultProgression(), progressionRank: rank, researchData: 8 },
    exploration: makeDefaultExploration(),
  };
}

{
  const game = gameAt(6);
  assert.equal(explorationAreaState(game, RESEARCH_AREA_ID).unlocked, false, 'research facility must stay locked before Rank 7');
  game.progression.progressionRank = 7;
  assert.equal(explorationAreaState(game, RESEARCH_AREA_ID).unlocked, true, 'research facility should unlock at Rank 7');
}

{
  const normalized = normalizeExploration({
    version: 1,
    areas: {
      residential: { discoveredZones: ['entrance'] },
      industrial: { discoveredZones: ['arrival'] },
      military: { discoveredZones: ['checkpoint'] },
    },
  });
  assert.equal(normalized.version, 1, 'Phase 6-A remains additive under Exploration Schema v1');
  assert.ok(normalized.areas.research, 'legacy saves must gain a normalized research area');
  assert.equal(normalized.areas.research.objective.labsCompleted, false);
  assert.deepEqual(normalized.areas.research.securedComponents, []);
  assert.deepEqual(normalized.areas.residential.discoveredZones, ['entrance']);
}

{
  const game = gameAt(7);
  assert.equal(startExpedition(game, RESEARCH_AREA_ID).changed, true);
  for (const zone of ['atrium', 'robotics_lab', 'materials_lab', 'energy_lab']) {
    assert.equal(discoverExplorationZone(game, zone).changed, true);
  }

  assert.equal(advanceResearchObjective(game, 'robotics').reason, 'needs-access');
  assert.equal(advanceResearchObjective(game, 'access').changed, true);
  assert.equal(advanceResearchObjective(game, 'robotics').changed, true);
  assert.equal(advanceResearchObjective(game, 'materials').changed, true);
  assert.equal(advanceResearchObjective(game, 'energy').changed, true);
  assert.equal(game.exploration.areas.research.objective.labsCompleted, true, 'all three Lab recovery flags should complete the Phase 6-A lab objective');
  assert.equal(game.exploration.areas.research.objective.completed, false, 'Phase 6-A must not mark the whole research facility or Main Clear complete');
  assert.equal(advanceResearchObjective(game, 'central').reason, 'phase-locked', 'Central Core remains a later Phase');

  for (const component of Object.values(RESEARCH_COMPONENTS)) {
    const collected = collectResearchCargo(game, component.id);
    assert.equal(collected.changed, true, `${component.id} should enter Special Cargo after its Lab is recovered`);
    assert.equal(researchComponentState(game, component.labId).carried, true);
  }
  assert.equal(game.exploration.activeSession.researchCargo.length, 3);

  const abandoned = abandonExpedition(game);
  assert.equal(abandoned.lost, 3, 'abandon must lose unreturned Special Cargo');
  assert.equal(game.exploration.areas.research.objective.labsCompleted, true, 'Lab recovery persists after abandon');
  assert.deepEqual(game.exploration.areas.research.securedComponents, [], 'abandoned Special Cargo must not become Factory-secured');
}

{
  const game = gameAt(7);
  startExpedition(game, RESEARCH_AREA_ID);
  advanceResearchObjective(game, 'access');
  advanceResearchObjective(game, 'robotics');
  advanceResearchObjective(game, 'materials');
  advanceResearchObjective(game, 'energy');

  for (const component of Object.values(RESEARCH_COMPONENTS)) collectResearchCargo(game, component.id);
  assert.equal(collectExplorationLoot(game, 'research-test-loot', 'rare_alloy', 1).changed, true);

  const returned = returnFromExpedition(game);
  assert.equal(returned.changed, true);
  assert.equal(returned.secured, 3, 'normal return should secure all three Special Cargo components');
  assert.equal(returned.moved, 4, 'return count includes three special components plus one normal loot item');
  assert.equal(game.exploration.activeSession, null);
  assert.equal(game.exploration.areas.research.securedComponents.length, 3);
  assert.equal(game.exploration.depot.rare_alloy, 1, 'normal loot should continue using the existing Transport Depot contract');

  const summary = researchProgressSummary(game);
  assert.equal(summary.labsCompleted, true);
  assert.equal(summary.securedComponents, 3);
  assert.equal(summary.completed, false, 'Central Core / Main Clear are intentionally outside Phase 6-A');

  startExpedition(game, RESEARCH_AREA_ID);
  for (const component of Object.values(RESEARCH_COMPONENTS)) {
    const state = researchComponentState(game, component.labId);
    assert.equal(state.secured, true);
    assert.equal(collectResearchCargo(game, component.id).reason, 'secured', 'secured component must not duplicate on later visits');
  }
}

{
  const game = gameAt(7);
  startExpedition(game, RESEARCH_AREA_ID);
  advanceResearchObjective(game, 'access');
  advanceResearchObjective(game, 'robotics');
  const robotics = RESEARCH_COMPONENTS.robotics;
  collectResearchCargo(game, robotics.id);
  abandonExpedition(game);

  assert.equal(startExpedition(game, RESEARCH_AREA_ID).changed, true);
  const state = researchComponentState(game, 'robotics');
  assert.equal(state.recovered, true, 'Lab recovery persists across failed expedition');
  assert.equal(state.needsCollection, true, 'lost Special Cargo should be recollectable from the recovered Lab');
  assert.equal(collectResearchCargo(game, robotics.id).changed, true, 'recovered Lab must allow guaranteed recollection after loss');
}

{
  const researchHtml = fs.readFileSync(path.join(root, 'games/scrap-factory/exploration/research.html'), 'utf8');
  const researchJs = fs.readFileSync(path.join(root, 'games/scrap-factory/exploration/research.js'), 'utf8');
  const explorationEntrypoint = fs.readFileSync(path.join(root, 'games/scrap-factory/exploration.js'), 'utf8');
  assert.match(researchHtml, /src="\.\/research\.js"/, 'research scene must load its runtime');
  assert.match(researchHtml, /href="\.\/research\.css"/, 'research scene must load its dedicated visual layer');
  for (const marker of ['RESEARCH_AREA_ID', 'advanceResearchObjective', 'collectResearchCargo', 'returnFromExpedition', 'abandonExpedition']) {
    assert.ok(researchJs.includes(marker), `research runtime missing core integration marker: ${marker}`);
  }
  assert.ok(explorationEntrypoint.includes('exploration-core-v4.js'), 'exploration compatibility entrypoint must use the Phase 6-A core');
}

console.log('Phase 6-A research facility tests passed.');
