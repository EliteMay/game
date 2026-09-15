import assert from 'node:assert/strict';
import { makeDefaultProgression } from '../games/scrap-factory/progression.js';
import {
  makeDefaultHomeState,
  purchasePlayerUpgrade,
  quotePlayerUpgrade,
  scannerProfile,
} from '../games/scrap-factory/home-system.js';
import {
  FRESH_LOOT_SCANNER_POLICY,
  RANK2_UPGRADE_NOTICE_UNLOCK,
  applyEarlyGameRuntime,
} from '../games/scrap-factory/early-game-runtime.js';

function gameFixture({ rank = 1, existingSave = false, money = 0, inventory = {} } = {}) {
  return {
    money,
    sessionCount: 1,
    inventory: { ...inventory },
    buildings: [],
    discoveredItems: ['metal_scrap'],
    tutorialStats: {},
    progression: { ...makeDefaultProgression(), progressionRank: rank },
    exploration: { areas: {}, activeSession: null },
    home: makeDefaultHomeState({ existingSave }),
  };
}

{
  const game = gameFixture({ rank: 1, money: 100, inventory: { metal_scrap: 5 } });
  const runtime = applyEarlyGameRuntime(game);
  assert.equal(runtime.upgradePolicyChanged, true, 'Fresh V2 enrollment should activate the scanner policy');

  const quote = quotePlayerUpgrade(game, 'loot_scanner_i');
  assert.equal(quote.ok, false);
  assert.equal(quote.reason, 'rank');
  assert.equal(quote.requiredRank, FRESH_LOOT_SCANNER_POLICY.rank);
  assert.equal(quote.definition.cash, 100);
  assert.deepEqual(quote.definition.items, { metal_scrap: 5 });
  assert.equal(Object.hasOwn(quote.definition.items, 'copper_wire'), false, 'Fresh V2 scanner must not require Copper Wire');
}

{
  const game = gameFixture({ rank: 2, money: 100, inventory: { metal_scrap: 5, copper_wire: 7 } });
  const first = applyEarlyGameRuntime(game);
  assert.equal(first.rank2Notice.notified, true, 'Fresh Rank 2 should surface the Home PC scanner upgrade once');
  assert.equal(game.progression.unlocks.includes(RANK2_UPGRADE_NOTICE_UNLOCK), true);

  const quote = quotePlayerUpgrade(game, 'loot_scanner_i');
  assert.equal(quote.ok, true);
  assert.equal(quote.definition.cash, 100);
  assert.deepEqual(quote.definition.items, { metal_scrap: 5 });

  const purchase = purchasePlayerUpgrade(game, 'loot_scanner_i');
  assert.equal(purchase.changed, true);
  assert.equal(game.money, 0);
  assert.equal(game.inventory.metal_scrap, 0);
  assert.equal(game.inventory.copper_wire, 7, 'Fresh V2 purchase must not consume Copper Wire');
  assert.equal(scannerProfile(game).unlocked, true);

  const second = applyEarlyGameRuntime(game);
  assert.equal(second.rank2Notice.notified, false, 'Rank 2 scanner notice must be idempotent');
}

{
  const legacy = gameFixture({
    rank: 1,
    existingSave: true,
    money: 80,
    inventory: { metal_scrap: 5, copper_wire: 2 },
  });
  applyEarlyGameRuntime(legacy);
  const quote = quotePlayerUpgrade(legacy, 'loot_scanner_i');
  assert.equal(quote.ok, true, 'Legacy Rank 1 saves keep the original scanner purchase contract');
  assert.equal(quote.definition.rank, 1);
  assert.equal(quote.definition.cash, 80);
  assert.deepEqual(quote.definition.items, { metal_scrap: 5, copper_wire: 2 });
  assert.equal(legacy.progression.unlocks.includes(RANK2_UPGRADE_NOTICE_UNLOCK), false);
}

console.log('Early-game player upgrade policy regression tests passed.');
