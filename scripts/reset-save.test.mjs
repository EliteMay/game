import assert from 'node:assert/strict';
import { SAVE_KEY } from '../games/scrap-factory/config.js';

class MemoryStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.has(String(key)) ? this.data.get(String(key)) : null; }
  setItem(key, value) { this.data.set(String(key), String(value)); }
  removeItem(key) { this.data.delete(String(key)); }
  clear() { this.data.clear(); }
}

globalThis.localStorage = new MemoryStorage();

const storage = await import('../games/scrap-factory/storage.js?reset-save-regression=1');
const { root, game } = storage.loadGameSave();

game.money = 9999;
game.lifetimeRevenue = 12345;
game.finalChapter.mainClearedAt = '2026-09-06T00:00:00.000Z';
game.inventory.metal_scrap = 77;
const staleRoot = storage.saveGameSave(root, game);
localStorage.setItem('scrap-factory-management-v1', JSON.stringify({ unlockedChallenges: ['legacy'] }));

storage.resetGameSave();

const resetRoot = JSON.parse(localStorage.getItem(SAVE_KEY));
const resetGame = resetRoot.games['scrap-factory'];
assert.equal(resetGame.money, 40, 'reset must restore starting cash');
assert.equal(resetGame.lifetimeRevenue, 0, 'reset must clear revenue');
assert.equal(resetGame.inventory.metal_scrap, 0, 'reset must clear inventory');
assert.equal(resetGame.finalChapter.mainClearedAt, null, 'reset must clear Main Clear history');
assert.equal(localStorage.getItem('scrap-factory-management-v1'), null, 'reset must clear Factory Management auxiliary state');

// Simulate the stale beforeunload/visibilitychange save that previously ran after reset.
game.money = 7777;
game.inventory.metal_scrap = 88;
storage.saveGameSave(staleRoot, game);

const afterLateSave = JSON.parse(localStorage.getItem(SAVE_KEY)).games['scrap-factory'];
assert.equal(afterLateSave.money, 40, 'late page-exit save must not resurrect pre-reset cash');
assert.equal(afterLateSave.inventory.metal_scrap, 0, 'late page-exit save must not resurrect pre-reset inventory');
assert.equal(afterLateSave.finalChapter.mainClearedAt, null, 'late page-exit save must not resurrect clear history');

console.log('Reset-save resurrection regression checks passed.');
