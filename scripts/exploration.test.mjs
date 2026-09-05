import assert from 'node:assert/strict';
import {
  RESIDENTIAL_BLUEPRINT_ID,
  abandonExpedition,
  advanceResidentialObjective,
  claimExplorationDepot,
  collectExplorationLoot,
  discoverExplorationZone,
  explorationAreaState,
  makeDefaultExploration,
  normalizeExploration,
  residentialProgressSummary,
  returnFromExpedition,
  startExpedition,
} from '../games/scrap-factory/exploration.js';
import {
  claimRankUp,
  isBuildingUnlocked,
  makeDefaultProgression,
  rankProgress,
} from '../games/scrap-factory/progression.js';

function gameAt(rank = 3) {
  return {
    money: 0,
    lifetimeRevenue: 0,
    inventory: {
      metal_scrap: 0,
      copper_wire: 0,
      plastic: 0,
      e_waste: 0,
      crushed_metal: 0,
      iron_ingot: 0,
      iron_plate: 0,
      cable_bundle: 0,
      tool_kit: 0,
    },
    discoveredItems: ['metal_scrap', 'crushed_metal', 'iron_ingot'],
    tutorialStats: { collected: 0, processed: 0, automationComplete: false },
    buildings: [],
    progression: { ...makeDefaultProgression(), progressionRank: rank, researchData: 2 },
    exploration: makeDefaultExploration(),
  };
}

{
  const game = gameAt(2);
  assert.equal(explorationAreaState(game).unlocked, false, 'residential area must stay locked before Rank 3');
  game.progression.progressionRank = 3;
  assert.equal(explorationAreaState(game).unlocked, true, 'residential area should unlock at Rank 3');
}

{
  const normalized = normalizeExploration({
    version: 999,
    depot: { copper_wire: 3, unknown_item: 99 },
    areas: { residential: { discoveredZones: ['entrance', 'bad-zone', 'entrance'] } },
  });
  assert.equal(normalized.version, 1);
  assert.deepEqual(normalized.areas.residential.discoveredZones, ['entrance']);
  assert.deepEqual(normalized.depot, { copper_wire: 3 });
  assert.equal(normalized.activeSession, null);
}

{
  const game = gameAt(3);
  const started = startExpedition(game);
  assert.equal(started.changed, true);
  assert.equal(game.exploration.activeSession.areaId, 'residential');
  const duplicateStart = startExpedition(game);
  assert.equal(duplicateStart.changed, false);
  assert.equal(duplicateStart.reason, 'already-active');

  for (const zone of ['entrance', 'row_houses', 'garage']) {
    assert.equal(discoverExplorationZone(game, zone).changed, true);
  }
  assert.equal(discoverExplorationZone(game, 'garage').changed, false, 'zone discovery must be idempotent');

  for (let index = 0; index < 5; index += 1) {
    const result = collectExplorationLoot(game, `loot-${index}`, index % 2 ? 'plastic' : 'copper_wire', 2);
    assert.equal(result.changed, true);
  }
  assert.equal(collectExplorationLoot(game, 'loot-0', 'copper_wire', 2).reason, 'collected');

  assert.equal(advanceResidentialObjective(game, 'power').reason, 'needs-fuse');
  assert.equal(advanceResidentialObjective(game, 'fuse').changed, true);
  assert.equal(advanceResidentialObjective(game, 'power').changed, true);
  const beforeReward = game.progression.researchData;
  const survey = advanceResidentialObjective(game, 'survey');
  assert.equal(survey.changed, true);
  assert.equal(survey.completed, true);
  assert.ok(game.progression.blueprints.includes(RESIDENTIAL_BLUEPRINT_ID), 'main objective should guarantee the exploration blueprint');
  assert.equal(game.progression.researchData, beforeReward + 1, 'main objective should grant Research Data once');
  assert.equal(advanceResidentialObjective(game, 'survey').changed, false);
  assert.equal(game.progression.researchData, beforeReward + 1, 'repeating survey interaction must not duplicate Research Data');

  const returned = returnFromExpedition(game);
  assert.equal(returned.changed, true);
  assert.equal(returned.moved, 10);
  assert.equal(game.exploration.activeSession, null);
  assert.equal(residentialProgressSummary(game).returnedLootTotal, 10);
  assert.equal(residentialProgressSummary(game).successfulReturns, 1);
  assert.equal(residentialProgressSummary(game).depotItems, 10);

  const progress = rankProgress(game);
  assert.equal(progress.rank, 3);
  assert.equal(progress.mandatory.done, true);
  assert.ok(progress.optionalDone >= 2, 'three discovered zones + ten returned loot should satisfy two Rank 3 optionals');
  assert.equal(progress.eligible, true, 'completed residential objective + two optionals should enable Rank 4');

  const rankUp = claimRankUp(game);
  assert.equal(rankUp.changed, true);
  assert.equal(game.progression.progressionRank, 4);
  assert.equal(isBuildingUnlocked(game, 'splitter'), true);
  assert.equal(isBuildingUnlocked(game, 'merger'), true);
  assert.equal(isBuildingUnlocked(game, 'conveyor_mk2'), true);
  assert.equal(isBuildingUnlocked(game, 'generator'), true);
  assert.equal(isBuildingUnlocked(game, 'power_pole'), true);

  const claimed = claimExplorationDepot(game);
  assert.equal(claimed.changed, true);
  assert.equal(claimed.moved, 10);
  assert.equal(residentialProgressSummary(game).depotItems, 0);
  assert.equal(game.inventory.copper_wire + game.inventory.plastic, 10);
}

{
  const game = gameAt(3);
  startExpedition(game);
  discoverExplorationZone(game, 'entrance');
  advanceResidentialObjective(game, 'fuse');
  collectExplorationLoot(game, 'temp-loot', 'e_waste', 4);
  const lost = abandonExpedition(game);
  assert.equal(lost.changed, true);
  assert.equal(lost.lost, 4);
  assert.equal(game.exploration.activeSession, null);
  assert.deepEqual(game.exploration.depot, {}, 'abandoned session loot must not enter the depot');
  assert.equal(game.exploration.areas.residential.discoveredZones.includes('entrance'), true, 'discovered zones persist after abandon');
  assert.equal(game.exploration.areas.residential.objective.fuseRecovered, true, 'main objective progress persists after abandon');
}

console.log('Exploration regression tests passed.');
