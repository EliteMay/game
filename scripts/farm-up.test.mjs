import assert from 'node:assert/strict';
import { CROPS, LAND, SAVE_SCHEMA_VERSION, TUTORIAL_STEPS } from '../games/farm-up/config.js';
import {
  advanceSimulation,
  createInitialState,
  getActionTileIds,
  getCropProgress,
  getFarmLevel,
  getTutorial,
  harvestTile,
  isTileUnlocked,
  plantTile,
  purchaseLandExpansion,
  sellInventory,
  tillTile,
  tutorialEvent,
  upgradeTools,
  validateState,
  waterTile,
} from '../games/farm-up/core.js';
import { parseSaveText, serializeSave } from '../games/farm-up/storage.js';

function completeWheatCycle(state, id = '0:0') {
  assert.equal(tillTile(state, id).ok, true);
  assert.equal(plantTile(state, id, 'wheat').ok, true);
  assert.equal(waterTile(state, id).ok, true);
  advanceSimulation(state, 20_000, 20_000, () => 0);
  assert.equal(getCropProgress(state, id).ready, true);
  assert.equal(harvestTile(state, id).ok, true);
  return sellInventory(state);
}

{
  const state = createInitialState(0);
  assert.equal(state.schemaVersion, SAVE_SCHEMA_VERSION);
  assert.equal(state.money, 490);
  assert.equal(validateState(state), true);
  assert.equal(Object.keys(state.tiles).length, LAND.expandedWidth * LAND.expandedDepth);
  assert.equal(Object.keys(state.tiles).filter((id) => isTileUnlocked(state, id)).length, 16);
  assert.equal(getFarmLevel(state.xp), 1);
}

{
  const state = createInitialState(0);
  assert.equal(tutorialEvent(state, 'till'), false);
  assert.equal(tutorialEvent(state, 'move'), true);
  assert.equal(completeWheatCycle(state).ok, true);
  assert.equal(state.tutorialStep, 6);
  assert.equal(state.money, 506);
  assert.equal(purchaseLandExpansion(state).ok, true);
  assert.equal(state.landLevel, 2);
  assert.equal(getTutorial(state).completed, true);
  assert.equal(state.tutorialStep, TUTORIAL_STEPS.length);
  assert.equal(Object.keys(state.tiles).filter((id) => isTileUnlocked(state, id)).length, 28);
}

{
  const state = createInitialState(0);
  tutorialEvent(state, 'move');
  tillTile(state, '0:0');
  plantTile(state, '0:0', 'wheat');
  state.weatherId = 'sunny';
  advanceSimulation(state, 10_000, 10_000, () => 0);
  assert.equal(state.tiles['0:0'].growthMs, 0);
  state.weatherId = 'rain';
  advanceSimulation(state, 20_000, 30_000, () => 0);
  assert.equal(getCropProgress(state, '0:0').ready, true);
}

{
  const state = createInitialState(0);
  state.money = 1_000;
  assert.equal(upgradeTools(state).ok, true);
  assert.equal(state.toolLevels.hoe, 2);
  assert.equal(getActionTileIds(state, '1:1', 'hoe').length, 5);
}

{
  const original = createInitialState(1_000);
  original.money = 777;
  original.inventory.wheat = 3;
  original.tiles['0:0'].soil = 'tilled';
  const restored = parseSaveText(serializeSave(original, 2_000), 3_000);
  assert.equal(restored.money, 777);
  assert.equal(restored.inventory.wheat, 3);
  assert.equal(restored.tiles['0:0'].soil, 'tilled');
  assert.equal(validateState(restored), true);
  assert.throws(() => parseSaveText('{oops'), /JSON/);
  assert.throws(() => parseSaveText(JSON.stringify({ schemaVersion: SAVE_SCHEMA_VERSION + 1 })), /future-schema/);
}

assert.deepEqual(CROPS.map((crop) => crop.id), ['wheat', 'carrot', 'corn', 'strawberry']);
console.log('Farm Up core/storage tests passed');
