import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

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
  const sale = completeWheatCycle(state);
  assert.equal(sale.ok, true);
  assert.equal(sale.total, 32);
  assert.equal(state.tutorialStep, 6);
  assert.equal(state.money, 514);
  assert.equal(purchaseLandExpansion(state).ok, true);
  assert.equal(state.landLevel, 2);
  assert.equal(getTutorial(state).completed, true);
  assert.equal(state.tutorialStep, TUTORIAL_STEPS.length);
  assert.equal(Object.keys(state.tiles).filter((id) => isTileUnlocked(state, id)).length, 28);
  assert.equal(state.money, 14);
  assert.equal(getFarmLevel(state.xp), 2);
  assert.ok(state.money >= CROPS.find((crop) => crop.id === 'carrot').seedCost);
  assert.equal(tillTile(state, '0:1').ok, true);
  assert.equal(plantTile(state, '0:1', 'carrot').ok, true);
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

{
  const farmHtmlPath = path.join(root, 'games/farm-up/index.html');
  const farmHtml = fs.readFileSync(farmHtmlPath, 'utf8');
  const gameSource = read('games/farm-up/game.js');
  const worldSource = read('games/farm-up/world.js');
  const htmlIds = [...farmHtml.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  assert.equal(new Set(htmlIds).size, htmlIds.length, 'Farm Up HTML must not contain duplicate IDs');

  const controllerIds = [...gameSource.matchAll(/\$\(["']#([^"']+)["']\)/g)].map((match) => match[1]);
  for (const id of new Set(controllerIds)) {
    assert.ok(htmlIds.includes(id), `Farm Up controller references missing HTML id: ${id}`);
  }

  const farmDir = path.dirname(farmHtmlPath);
  const localRefs = [...farmHtml.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)].map((match) => match[1]);
  for (const ref of localRefs) {
    if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(ref)) continue;
    const target = path.resolve(farmDir, ref.split('?')[0]);
    assert.equal(fs.existsSync(target), true, `Farm Up broken local ref: ${ref}`);
  }

  assert.ok(farmHtml.includes('右ドラッグで視点移動'), 'Farm Up must explain right-drag camera controls');
  assert.ok(farmHtml.includes('ホイールでズーム'), 'Farm Up must explain wheel zoom');
  assert.ok(worldSource.includes("event.button !== 2"), 'Farm Up camera must use right-button drag');
  assert.ok(worldSource.includes("addEventListener('wheel'"), 'Farm Up camera must support wheel zoom');
  assert.ok(worldSource.includes('resetCamera()'), 'Farm Up camera must support camera reset');
  assert.equal(worldSource.includes('requestPointerLock'), false, 'Farm Up camera must not require pointer lock');
  for (const marker of ['buildGroundDetails', 'buildYardProps', 'furrowGroups', 'ACESFilmicToneMapping', 'updatePlayerAnimation']) {
    assert.ok(worldSource.includes(marker), `Farm Up visual pass missing marker: ${marker}`);
  }

  const hubHtml = read('index.html');
  const hubSource = read('js/hub-orbloom.js');
  const hubIds = [...hubHtml.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const farmHubIds = [...hubSource.matchAll(/\$\(["']#(farm-[^"']+)["']\)/g)].map((match) => match[1]);
  for (const id of new Set(farmHubIds)) {
    assert.ok(hubIds.includes(id), `Game Hub Farm Up summary references missing HTML id: ${id}`);
  }
  assert.ok(hubHtml.includes('./games/farm-up/index.html'), 'Game Hub must link to Farm Up');
  assert.ok(hubHtml.includes('./css/hub-farm-up.css'), 'Game Hub must load Farm Up card styles');
  assert.ok(hubSource.includes("../games/farm-up/storage.js"), 'Game Hub must load Farm Up save summary');
}

assert.deepEqual(CROPS.map((crop) => crop.id), ['wheat', 'carrot', 'corn', 'strawberry']);
console.log('Farm Up core/storage/integration tests passed');