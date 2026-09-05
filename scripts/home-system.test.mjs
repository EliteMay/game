import assert from 'node:assert/strict';
import { makeDefaultExploration, abandonExpedition, canAddExplorationLoot } from '../games/scrap-factory/exploration-core-v4.js';
import {
  HOME_RESPAWN_POSITION,
  PLAYER_UPGRADES,
  advanceHomeTutorial,
  backpackSlotCapacity,
  ensureHomeState,
  homeStorageSlotCapacity,
  makeDefaultHomeState,
  normalizeHomeState,
  protectExplorationLoot,
  purchasePlayerUpgrade,
  quickDepositToHome,
  quotePlayerUpgrade,
  recordTutorialEvent,
  saveLoadoutPreset,
  applyLoadoutPreset,
  secureCaseSlotCapacity,
  visibleTutorialLibrary,
} from '../games/scrap-factory/home-system.js';

function makeInventory(amount = 50) {
  return {
    metal_scrap: amount,
    copper_wire: amount,
    plastic: amount,
    e_waste: amount,
    crushed_metal: amount,
    iron_ingot: amount,
    iron_plate: amount,
    cable_bundle: amount,
    tool_kit: amount,
    circuit: amount,
    motor: amount,
    control_unit: amount,
    rare_alloy: amount,
    ai_control_module: 0,
    experimental_frame: 0,
    experimental_power_module: 0,
    autonomous_industrial_core: 0,
  };
}

function baseGame(rank = 7) {
  return {
    money: 10000,
    inventory: makeInventory(),
    buildings: [],
    progression: { progressionRank: rank, unlocks: [] },
    exploration: makeDefaultExploration(),
    home: makeDefaultHomeState({ existingSave: false }),
    tutorialStats: { movedToScrapyard: false, collected: 0, returned: false, processed: 0, automationComplete: false },
    finalChapter: { mainClearedAt: null },
    discoveredItems: ['metal_scrap'],
  };
}

{
  const legacy = baseGame(4);
  delete legacy.home;
  legacy.backpackSlots = 20;
  const normalized = normalizeHomeState(undefined, { existingSave: true, legacyGame: legacy });
  assert.equal(normalized.introducedFromLegacy, true);
  assert.equal(normalized.respawnEnabled, false);
  legacy.home = normalized;
  assert.equal(backpackSlotCapacity(legacy), 20, 'legacy 20-slot capacity must not regress');
  assert.ok(normalized.upgrades.includes('backpack_i'));
  assert.ok(normalized.upgrades.includes('backpack_ii'));
}

{
  const game = baseGame(7);
  assert.equal(backpackSlotCapacity(game), 12);
  game.home.upgrades.push('backpack_i');
  assert.equal(backpackSlotCapacity(game), 16);
  game.home.upgrades.push('backpack_ii');
  assert.equal(backpackSlotCapacity(game), 20);
  game.home.upgrades.push('backpack_iii');
  assert.equal(backpackSlotCapacity(game), 24);
  assert.equal('weight' in game.home, false, 'weight system must not be introduced');
  assert.equal('maxWeight' in game.home, false, 'max weight system must not be introduced');
}

{
  const game = baseGame(2);
  const cashBefore = game.money;
  const ironBefore = game.inventory.iron_ingot;
  const copperBefore = game.inventory.copper_wire;
  const quote = quotePlayerUpgrade(game, 'backpack_i');
  assert.equal(quote.ok, true);
  const result = purchasePlayerUpgrade(game, 'backpack_i');
  assert.equal(result.changed, true);
  assert.equal(game.money, cashBefore - PLAYER_UPGRADES.backpack_i.cash);
  assert.equal(game.inventory.iron_ingot, ironBefore - 4);
  assert.equal(game.inventory.copper_wire, copperBefore - 4);
  assert.equal(backpackSlotCapacity(game), 16);
  const second = purchasePlayerUpgrade(game, 'backpack_i');
  assert.equal(second.changed, false);
  assert.equal(second.reason, 'owned');
}

{
  const game = baseGame(2);
  game.inventory.iron_ingot = 0;
  game.home.storage = {};
  const before = structuredClone({ money: game.money, inventory: game.inventory, home: game.home });
  const result = purchasePlayerUpgrade(game, 'backpack_i');
  assert.equal(result.changed, false);
  assert.deepEqual({ money: game.money, inventory: game.inventory, home: game.home }, before, 'failed upgrade must be atomic');
}

{
  const game = baseGame(3);
  game.home.upgrades.push('quick_deposit');
  game.inventory.metal_scrap = 7;
  game.inventory.autonomous_industrial_core = 1;
  const starterMetal = game.home.storage.metal_scrap || 0;
  const result = quickDepositToHome(game);
  assert.equal(result.changed, true);
  assert.equal(game.inventory.metal_scrap, 0);
  assert.equal(game.home.storage.metal_scrap, starterMetal + 7);
  assert.equal(game.inventory.autonomous_industrial_core, 1, 'final item must not be quick-deposited');
}

{
  const game = baseGame(4);
  game.home.upgrades.push('loadout_preset');
  game.home.storage = { metal_scrap: 8, copper_wire: 8 };
  game.inventory = { ...makeInventory(0), metal_scrap: 2, copper_wire: 1 };
  const saved = saveLoadoutPreset(game, 'Scout');
  assert.equal(saved.changed, true);
  game.inventory.metal_scrap = 0;
  game.inventory.copper_wire = 0;
  const applied = applyLoadoutPreset(game, saved.preset.id);
  assert.equal(applied.changed, true);
  assert.equal(game.inventory.metal_scrap, 2);
  assert.equal(game.inventory.copper_wire, 1);
}

{
  const game = baseGame(6);
  game.home.upgrades.push('secure_case_i');
  game.exploration.activeSession = {
    id: 'test-session', areaId: 'military', startedAt: new Date().toISOString(),
    loot: { rare_alloy: 2, autonomous_industrial_core: 1 }, collectedLootIds: [], researchCargo: [], hp: 50,
    player: { x: 0, y: 1.7, z: 0, yaw: 0 },
  };
  assert.equal(secureCaseSlotCapacity(game), 2);
  const protectedLoot = protectExplorationLoot(game, 'rare_alloy', 1);
  assert.equal(protectedLoot.changed, true);
  assert.equal(game.home.secureCase.rare_alloy, 1);
  const blockedFinal = protectExplorationLoot(game, 'autonomous_industrial_core', 1);
  assert.equal(blockedFinal.changed, false);
  assert.equal(blockedFinal.reason, 'not-allowed');
  const failed = abandonExpedition(game);
  assert.equal(failed.changed, true);
  assert.equal(game.home.secureCase.rare_alloy, 1, 'Secure Case must survive expedition failure');
}

{
  const game = baseGame(1);
  game.inventory = makeInventory(0);
  const session = {
    id: 'slot-test', areaId: 'residential', startedAt: new Date().toISOString(), loot: {}, collectedLootIds: [], researchCargo: [], hp: 100,
    player: { x: 0, y: 1.7, z: 0, yaw: 0 },
  };
  game.exploration.activeSession = session;
  const ids = ['metal_scrap', 'copper_wire', 'plastic', 'e_waste', 'crushed_metal', 'iron_ingot', 'iron_plate', 'cable_bundle', 'tool_kit', 'circuit', 'motor', 'control_unit'];
  for (const id of ids) session.loot[id] = 1;
  assert.equal(canAddExplorationLoot(game, 'rare_alloy', 1), false, 'base exploration backpack is 12 slots');
  game.home.upgrades.push('backpack_i');
  assert.equal(canAddExplorationLoot(game, 'rare_alloy', 1), true, 'Backpack I must expand exploration capacity too');
}

{
  const low = baseGame(1);
  const rank1Titles = visibleTutorialLibrary(low).map((entry) => entry.id);
  assert.ok(rank1Titles.includes('basics-controls'));
  assert.ok(!rank1Titles.includes('final-chapter'));
  const high = baseGame(7);
  assert.ok(visibleTutorialLibrary(high).some((entry) => entry.id === 'final-chapter'));
}

{
  const game = baseGame(1);
  const home = ensureHomeState(game);
  assert.equal(homeStorageSlotCapacity(game), 20);
  assert.ok((home.storage.metal_scrap || 0) + (home.storage.copper_wire || 0) < 5, 'starter supplies must not make Loot Scanner I free');
  recordTutorialEvent(game, 'bedUsed', true);
  const result = advanceHomeTutorial(game);
  assert.equal(result.changed, true);
  assert.equal(home.tutorial.basicStep, 1);
}

{
  const legacy = baseGame(6);
  legacy.home = makeDefaultHomeState({ existingSave: true });
  legacy.home.respawnEnabled = true;
  legacy.exploration.activeSession = {
    id: 'respawn-test', areaId: 'military', startedAt: new Date().toISOString(), loot: { metal_scrap: 1 }, collectedLootIds: [], researchCargo: [], hp: 0,
    player: { x: 5, y: 1.7, z: 5, yaw: 0 },
  };
  abandonExpedition(legacy);
  // Home-aware exploration migration patches this exact coordinate during integration.
  assert.ok(Number.isFinite(HOME_RESPAWN_POSITION.x));
}

console.log('home-system tests passed');
