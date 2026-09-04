import assert from 'node:assert/strict';
import {
  completeRankUp,
  completeResearch,
  evaluateRank,
  inferLegacyProgression,
  makeDefaultProgression,
  researchState,
  withNormalizedProgression,
} from '../games/scrap-factory/progression.js';
import { progressionRouteContext } from '../games/scrap-factory/progression-ui.js';

function baseGame(overrides = {}) {
  return {
    money: 40,
    lifetimeRevenue: 0,
    inventory: {},
    buildings: [],
    tutorialStep: 0,
    tutorialStats: { collected: 0, processed: 0, automationComplete: false },
    discoveredItems: ['metal_scrap'],
    progressionRank: 1,
    progression: makeDefaultProgression(),
    ...overrides,
  };
}

const legacy = inferLegacyProgression({
  tutorialStep: 8,
  lifetimeRevenue: 250,
  buildings: [{ id: 'old-smelter', type: 'smelter', x: 0, z: 0 }],
  discoveredItems: ['metal_scrap', 'iron_ingot'],
});
assert.equal(legacy.progressionRank, 2, 'legacy MVP progress must not be rolled back to Rank 1');
assert.ok(legacy.progression.researched.includes('basic_smelting'));
assert.ok(legacy.progression.researched.includes('buffer_logistics'));
assert.ok(legacy.progression.unlocks.includes('building:smelter'));
assert.ok(legacy.progression.unlocks.includes('building:storage'));

const revenueOnly = evaluateRank(baseGame({ lifetimeRevenue: 5000 }), { firstAutomation: false });
assert.equal(revenueOnly.eligible, false, 'revenue alone must never rank up the factory');

const rankOneReady = baseGame({
  lifetimeRevenue: 550,
  tutorialStats: { collected: 21, processed: 3, automationComplete: true },
  discoveredItems: ['metal_scrap', 'copper_wire'],
});
const rankOneState = evaluateRank(rankOneReady, { firstAutomation: true });
assert.equal(rankOneState.required.done, true);
assert.ok(rankOneState.optionalDone >= 2);
assert.equal(rankOneState.eligible, true);
const rankUpTwo = completeRankUp(rankOneReady, { firstAutomation: true });
assert.equal(rankUpTwo.ok, true);
assert.equal(rankUpTwo.game.progressionRank, 2);

let rankTwo = rankUpTwo.game;
assert.equal(researchState(rankTwo, 'basic_smelting').available, true);
const smeltingResearch = completeResearch(rankTwo, 'basic_smelting');
assert.equal(smeltingResearch.ok, true);
rankTwo = smeltingResearch.game;
assert.ok(rankTwo.progression.unlocks.includes('building:smelter'));
const storageResearch = completeResearch(rankTwo, 'buffer_logistics');
assert.equal(storageResearch.ok, true);
rankTwo = storageResearch.game;
assert.ok(rankTwo.progression.unlocks.includes('building:storage'));

const specialBase = withNormalizedProgression({
  ...rankTwo,
  progressionRank: 3,
  progression: { ...rankTwo.progression, blueprints: [], researchData: [] },
}, { inferLegacy: false });
assert.equal(researchState(specialBase, 'residential_recon').status, 'blueprint-locked');
const withBlueprint = withNormalizedProgression({
  ...specialBase,
  progression: { ...specialBase.progression, blueprints: ['residential_recon_blueprint'] },
}, { inferLegacy: false });
assert.equal(researchState(withBlueprint, 'residential_recon').status, 'data-locked');
const withSpecialData = withNormalizedProgression({
  ...withBlueprint,
  progression: { ...withBlueprint.progression, researchData: ['residential_survey_data'] },
}, { inferLegacy: false });
assert.equal(researchState(withSpecialData, 'residential_recon').available, true);

const east = 0;
const firstLine = {
  buildings: [
    { id: 'hopper', type: 'hopper', x: 0, z: 0, rotation: east },
    { id: 'c1', type: 'conveyor', x: 2.5, z: 0, rotation: east },
    { id: 'crusher', type: 'crusher', x: 5, z: 0, rotation: east },
    { id: 'c2', type: 'conveyor', x: 7.5, z: 0, rotation: east },
    { id: 'seller', type: 'seller', x: 10, z: 0, rotation: east },
  ],
  tutorialStats: { automationComplete: false },
};
assert.equal(progressionRouteContext(firstLine).firstAutomation, true, 'Rank 1 required line should use actual conveyor direction');
firstLine.buildings[3].rotation = Math.PI;
assert.equal(progressionRouteContext(firstLine).firstAutomation, false, 'reversed output conveyor must not satisfy Rank 1');

const ironLine = {
  buildings: [
    { id: 'hopper', type: 'hopper', x: 0, z: 0, rotation: east },
    { id: 'c1', type: 'conveyor', x: 2.5, z: 0, rotation: east },
    { id: 'crusher', type: 'crusher', x: 5, z: 0, rotation: east },
    { id: 'c2', type: 'conveyor', x: 7.5, z: 0, rotation: east },
    { id: 'smelter', type: 'smelter', x: 10, z: 0, rotation: east },
    { id: 'c3', type: 'conveyor', x: 12.5, z: 0, rotation: east },
    { id: 'storage', type: 'storage', x: 15, z: 0, rotation: east },
  ],
  tutorialStats: { automationComplete: false },
};
assert.equal(progressionRouteContext(ironLine).ironAutomation, true, 'Rank 2 required line should reach iron ingot destination');

const rankTwoReady = baseGame({
  progressionRank: 2,
  progression: storageResearch.game.progression,
  lifetimeRevenue: 1300,
  tutorialStats: { collected: 25, processed: 26, automationComplete: true },
  discoveredItems: ['metal_scrap', 'iron_ingot'],
  buildings: ironLine.buildings,
});
const rankTwoState = evaluateRank(rankTwoReady, progressionRouteContext(rankTwoReady));
assert.equal(rankTwoState.eligible, true);
const rankUpThree = completeRankUp(rankTwoReady, progressionRouteContext(rankTwoReady));
assert.equal(rankUpThree.ok, true);
assert.equal(rankUpThree.game.progressionRank, 3);
assert.equal(evaluateRank(rankUpThree.game).phase1Implemented, false);

const memory = new Map();
globalThis.localStorage = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(String(key), String(value)); },
  removeItem(key) { memory.delete(String(key)); },
};
const storage = await import('../games/scrap-factory/storage.js');
const { SAVE_KEY } = await import('../games/scrap-factory/config.js');
const legacyRoot = {
  schemaVersion: 1,
  revision: 7,
  updatedAt: new Date(0).toISOString(),
  profile: { totalPlayTimeSeconds: 10 },
  games: {
    'scrap-factory': {
      schemaVersion: 1,
      money: 300,
      lifetimeRevenue: 400,
      inventory: {},
      buildings: [{ id: 'legacy-storage', type: 'storage', x: 0, z: 0, rotation: 0, input: {}, output: {} }],
      tutorialStep: 8,
      tutorialStats: { collected: 10, processed: 4, automationComplete: true },
      discoveredItems: ['metal_scrap'],
    },
  },
};
localStorage.setItem(SAVE_KEY, JSON.stringify(legacyRoot));
const migratedRoot = storage.loadRootSave();
const normalizedLegacy = withNormalizedProgression(migratedRoot.games['scrap-factory']);
assert.equal(normalizedLegacy.progressionRank, 2, 'progression migration must infer legacy Rank 2');
assert.ok(normalizedLegacy.progression.migratedFromLegacy);

const persistedRoot = storage.saveRootSave({
  ...migratedRoot,
  games: {
    ...migratedRoot.games,
    'scrap-factory': {
      ...migratedRoot.games['scrap-factory'],
      progressionRank: normalizedLegacy.progressionRank,
      progression: normalizedLegacy.progression,
    },
  },
});
const reloaded = storage.loadRootSave();
assert.equal(reloaded.games['scrap-factory'].progressionRank, 2, 'existing storage normalizer must preserve additive progression fields');
assert.ok(reloaded.games['scrap-factory'].progression.researched.includes('basic_smelting'));

storage.saveGameSave(
  { ...persistedRoot, profile: { ...persistedRoot.profile, totalPlayTimeSeconds: 42 } },
  reloaded.games['scrap-factory'],
);
const afterAutosave = storage.loadRootSave();
assert.equal(afterAutosave.games['scrap-factory'].progressionRank, 2, 'autosave after reload must preserve progression fields');
assert.equal(afterAutosave.profile.totalPlayTimeSeconds, 42);

console.log('Progression tests passed.');
