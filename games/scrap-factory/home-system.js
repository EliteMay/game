import { ITEMS, usedSlots } from './config.js';

export const HOME_VERSION = 1;
export const BASE_BACKPACK_SLOTS = 12;
export const HOME_POSITION = Object.freeze({ x: -10, z: 36 });
export const HOME_RESPAWN_POSITION = Object.freeze({ x: -12.2, y: 1.7, z: 36.8, yaw: Math.PI });

const BACKPACK_SLOT_BY_UPGRADE = Object.freeze({
  backpack_i: 16,
  backpack_ii: 20,
  backpack_iii: 24,
});

const HOME_STORAGE_SLOT_BY_UPGRADE = Object.freeze({
  home_storage_ii: 32,
  home_storage_iii: 48,
});

const SECURE_CASE_SLOT_BY_UPGRADE = Object.freeze({
  secure_case_i: 2,
  secure_case_ii: 4,
});

export const PLAYER_UPGRADES = Object.freeze({
  loot_scanner_i: {
    id: 'loot_scanner_i', rank: 1, name: 'Loot Scanner I', category: 'Scanner',
    cash: 80, items: { metal_scrap: 5, copper_wire: 2 },
    description: 'Qキーの短いPulseで近距離の通常Lootを数秒だけ強調する。',
  },
  backpack_i: {
    id: 'backpack_i', rank: 2, name: 'Backpack I', category: 'Backpack',
    cash: 180, items: { iron_ingot: 4, copper_wire: 4 },
    description: 'Backpackを16 Slotへ拡張する。重量制は追加しない。',
  },
  quick_deposit: {
    id: 'quick_deposit', rank: 2, name: 'Quick Deposit', category: 'Home',
    cash: 120, items: { iron_plate: 2, copper_wire: 2 },
    description: 'Workbenchから通常LootをHome Storageへ手動一括移動できる。',
  },
  loot_scanner_ii: {
    id: 'loot_scanner_ii', rank: 3, name: 'Loot Scanner II', category: 'Scanner',
    cash: 260, items: { e_waste: 3, copper_wire: 5 }, requires: ['loot_scanner_i'],
    description: 'Loot Scannerの探索半径と表示時間を強化する。',
  },
  material_tracking: {
    id: 'material_tracking', rank: 3, name: 'Material Tracking', category: 'Tracking',
    cash: 220, items: { e_waste: 4, iron_plate: 2 },
    description: 'PC / Guideから素材を1種類だけPinし、HUDとScannerで優先表示する。',
  },
  home_storage_ii: {
    id: 'home_storage_ii', rank: 3, name: 'Home Storage II', category: 'Home',
    cash: 180, items: { iron_plate: 4, copper_wire: 4 },
    description: 'Home Storageを32 Slotへ拡張する。中身はそのまま維持する。',
  },
  backpack_ii: {
    id: 'backpack_ii', rank: 4, name: 'Backpack II', category: 'Backpack',
    cash: 450, items: { iron_plate: 6, cable_bundle: 2 }, requires: ['backpack_i'],
    description: 'Backpackを20 Slotへ拡張する。',
  },
  auto_sort: {
    id: 'auto_sort', rank: 4, name: 'Auto Sort', category: 'Home',
    cash: 300, items: { circuit: 2, iron_plate: 3 },
    description: 'Workbench / Home Storageの表示を用途別に自動整理する。',
  },
  loadout_preset: {
    id: 'loadout_preset', rank: 4, name: 'Loadout Preset', category: 'Home',
    cash: 380, items: { tool_kit: 1, circuit: 2 },
    description: '現在のBackpack内容をPreset保存し、Home Storageから不足分だけ再準備する。',
  },
  sprint_efficiency: {
    id: 'sprint_efficiency', rank: 4, name: 'Sprint Efficiency', category: 'Movement',
    cash: 320, items: { motor: 1, iron_plate: 3 },
    description: '長距離移動向けの軽いSprint補助。Main Progressionの必須条件にはしない。',
  },
  resource_scanner: {
    id: 'resource_scanner', rank: 5, name: 'Resource Scanner', category: 'Scanner',
    cash: 600, items: { circuit: 3, motor: 1 }, requires: ['loot_scanner_ii'],
    description: '探索Lootに加え、確保済みResource情報をScanner/PCで確認しやすくする。',
  },
  advanced_scanner: {
    id: 'advanced_scanner', rank: 5, name: 'Advanced Scanner', category: 'Scanner',
    cash: 700, items: { control_unit: 1, circuit: 2 }, requires: ['loot_scanner_ii'],
    description: 'Pulse上限数と識別情報を拡張する。',
  },
  home_storage_iii: {
    id: 'home_storage_iii', rank: 5, name: 'Home Storage III', category: 'Home',
    cash: 500, items: { iron_plate: 8, tool_kit: 2 }, requires: ['home_storage_ii'],
    description: 'Home Storageを48 Slotへ拡張する。',
  },
  backpack_iii: {
    id: 'backpack_iii', rank: 6, name: 'Backpack III', category: 'Backpack',
    cash: 900, items: { control_unit: 1, iron_plate: 8 }, requires: ['backpack_ii'],
    description: 'Backpackを24 Slotへ拡張する。',
  },
  secure_case_i: {
    id: 'secure_case_i', rank: 6, name: 'Secure Case I', category: 'Secure Case',
    cash: 750, items: { rare_alloy: 1, control_unit: 1 },
    description: '許可された探索Lootを2 Slotまで保護できる。',
  },
  rare_loot_detection: {
    id: 'rare_loot_detection', rank: 6, name: 'Rare Loot Detection', category: 'Scanner',
    cash: 900, items: { rare_alloy: 2, circuit: 2 }, requires: ['advanced_scanner'],
    description: 'Rare/Advanced LootをScannerで区別して強調する。',
  },
  secure_case_ii: {
    id: 'secure_case_ii', rank: 6, name: 'Secure Case II', category: 'Secure Case',
    cash: 1100, items: { rare_alloy: 2, control_unit: 1 }, requires: ['secure_case_i'],
    description: 'Secure Caseを4 Slotへ拡張する。',
  },
  factory_network_link: {
    id: 'factory_network_link', rank: 7, name: 'Factory Network Link', category: 'Home',
    cash: 1800, items: { control_unit: 2, circuit: 4, iron_plate: 8 },
    description: '以後のPC Upgrade CostでFactory Storageも参照できる。自動搬送は行わない。',
  },
  scanner_mastery: {
    id: 'scanner_mastery', rank: 7, name: 'Scanner Mastery', category: 'Scanner',
    cash: 1500, items: { control_unit: 2, rare_alloy: 1 },
    requires: ['resource_scanner', 'rare_loot_detection'],
    description: 'Scannerの最終QoL強化。Main Clear条件には影響しない。',
  },
});

const BASIC_TUTORIAL_STEPS = Object.freeze([
  { id: 'bed', title: 'Home Bedを確認', body: 'ベッドを見て E。ここで手動SaveとHome Respawnを確認します。', hint: 'Home内のベッドへ近づき、中央の照準を合わせてE。' },
  { id: 'move', title: '移動を確認', body: 'WASDでHome内を少し移動します。', hint: 'W / A / S / Dのどれかで2m以上移動。' },
  { id: 'pc', title: 'PCを確認', body: 'PCを見て E。Player Upgrade / Tutorial Libraryの場所を確認します。', hint: '机のモニターへ照準を合わせてE。' },
  { id: 'door', title: 'Homeを出る', body: 'ドアを見て E で開き、Factory側へ出ます。', hint: '南側のドアへ照準を合わせてE。' },
  { id: 'scrapyard', title: 'Scrap Yardへ向かう', body: '黄色いゲートを抜け、Scrap Yardへ移動します。', hint: 'Factory東側の開口部からScrap Yardへ。' },
  { id: 'collect', title: 'Scrapを回収', body: 'Scrapを5個回収します。BackpackはSlot制です。', hint: '地面のScrapへ照準を合わせてE。重量制はありません。' },
  { id: 'inventory', title: 'Backpackを開く', body: 'TabでBackpackを開き、Slot使用量を確認します。', hint: 'Tabを押す。' },
  { id: 'return', title: 'Factoryへ戻る', body: 'Factory Baseへ戻ります。', hint: '黄色いゲートをFactory側へ戻る。' },
  { id: 'manual_sale', title: '手動販売を試す', body: '販売ターミナルを見て E。Backpack内の売却可能品を手動販売します。', hint: '販売ターミナルへ近づきE。' },
  { id: 'build_mode', title: 'Build Modeを開く', body: 'BでBuild Menuを開きます。', hint: 'Bを押す。' },
  { id: 'hopper', title: 'Hopperへ投入', body: '投入ホッパーへ素材を入れ、ラインの入口を作ります。', hint: '固定の投入ホッパーを見てE。' },
  { id: 'conveyor', title: 'Conveyorを設置', body: 'Conveyorを1台以上設置し、黄色い矢印の向きを確認します。', hint: 'B → Conveyor。Rで90°回転。' },
  { id: 'crusher', title: 'Crusherを設置', body: 'Crusherを設置します。', hint: 'B → 粉砕機。入力側と出力側をConveyorへ接続。' },
  { id: 'seller', title: 'Sellerまで接続', body: 'Hopper → Crusher → SellerをDirectional Logisticsで接続します。', hint: '各Conveyorの黄色い矢印が素材の進行方向を向いているか確認。' },
  { id: 'auto_sale', title: '最初の自動販売', body: 'Crusherで加工されたItemがSellerへ届き、自動販売されるまで確認します。', hint: 'Hopperに鉄くずを入れ、CrusherのOutputとSellerまでの経路を確認。' },
]);

export const TUTORIAL_LIBRARY = Object.freeze([
  { id: 'basics-controls', category: 'Basics', minRank: 1, title: '移動・操作・Pause', keys: 'WASD / E / Esc', why: 'まず移動と操作対象の読み方を覚える。', success: 'HomeからFactoryへ安全に出入りできる。', example: '対象へ照準 → E。', diagnosis: 'Eが出ない場合は距離と照準を確認。' },
  { id: 'inventory-slots', category: 'Inventory', minRank: 1, title: 'Backpack Slot制', keys: 'Tab', why: '重量ではなくStackごとのSlot数で持ち運び量が決まる。', success: 'PACK表示の使用/最大Slotを読める。', example: 'Backpack I/II/IIIで最大Slotが増える。', diagnosis: '満杯ならHome/Factoryへ預ける。重量ペナルティはない。' },
  { id: 'home-bed', category: 'Home', minRank: 1, title: 'Bed / Save / Respawn', keys: 'E', why: 'Homeを安全な準備拠点として使う。', success: 'Bedで手動Saveできる。', example: '既存SaveはBedを使った後にHome Respawnへ切り替わる。', diagnosis: 'Factory Auto SaveはBedと別に継続する。' },
  { id: 'home-pc', category: 'Home', minRank: 1, title: 'PC Player Management', keys: 'E / Esc', why: 'Player QoL UpgradeとTutorialをFactory Researchから分離して管理する。', success: 'UPGRADES / TRACKING / HOME / LIBRARY / PROGRESSを開ける。', example: 'Loot Scanner Iは任意Upgrade。', diagnosis: 'PC UpgradeはMain Progression必須ではない。' },
  { id: 'exploration-return', category: 'Exploration', minRank: 1, title: '探索と正常帰還', keys: 'T', why: '探索Lootは正常帰還まで確定しない。', success: '探索LootをDepotへ持ち帰る。', example: '失敗時は通常Session Lootを失う。', diagnosis: 'Secure Case対象だけは保護可能。' },
  { id: 'building-grid', category: 'Building', minRank: 1, title: '2.5m Grid建築', keys: 'B / R / F', why: '既存Factory Layoutを崩さず再配置しやすくする。', success: 'Previewが緑の位置へ設置できる。', example: 'Rで90°回転、Fで撤去。', diagnosis: '赤Previewは範囲外・占有・障害物を確認。' },
  { id: 'logistics-direction', category: 'Logistics', minRank: 1, title: 'Directional Logistics', keys: 'E / R', why: 'Conveyorは黄色い矢印方向へだけ搬送する。', success: 'Hopper → Machine → Seller/StorageへItemが流れる。', example: 'Splitter/Mergerも基準方向を持つ。', diagnosis: '止まったら向き、受取Item、Storage満杯を順に確認。' },
  { id: 'production-machine', category: 'Production', minRank: 1, title: 'Machine Input / Output', keys: 'E', why: 'Recipe、Input、Output、Power状態を分けて読む。', success: '必要素材が揃い進捗Gaugeが動く。', example: 'Crusher: metal_scrap → crushed_metal。', diagnosis: 'NO INPUT / POWER STOP / OUTPUT BLOCKEDを確認。' },
  { id: 'power-grid', category: 'Power', minRank: 4, title: 'Power Grid', keys: 'E / P', why: 'Rank 4以降のMachine稼働条件を理解する。', success: '供給>=需要かつ給電範囲内。', example: 'Generator → Pole → Machine。', diagnosis: 'Fuel / Generation / Coverageの順に確認。' },
  { id: 'drone-routes', category: 'Drone', minRank: 6, title: 'Drone Route', keys: 'P', why: '確保済みResource Pointから自動回収する。', success: 'Portに有効Routeが割り当てられOutputが増える。', example: 'UtilityとAdvancedで利用可能Routeが違う。', diagnosis: 'Research / Resource Point / Tier / Powerを確認。' },
  { id: 'advanced-automation', category: 'Advanced Automation', minRank: 6, title: 'Mk.3 / Priority / Overflow', keys: 'P / E', why: '大量ラインの詰まりを制御する。', success: '意図したBranchへ安定搬送できる。', example: 'Storage満杯時はBack PressureでItem消失を防ぐ。', diagnosis: 'Route方向、帯域、Storage残量を確認。' },
  { id: 'final-chapter', category: 'Final Chapter', minRank: 7, title: 'Final Automation / Mega Factory', keys: 'P', why: 'Rank 8を追加せずRank 7内でMain Clearへ進む。', success: '完全自動Line + Mega Factory 180秒安定稼働。', example: 'Main Clear後も同じSaveでOptimization継続。', diagnosis: 'Final DiagnosticsでTechnology / Source / Production / Power / Storage / Throughputを確認。' },
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function uniqueStrings(value) {
  return Array.isArray(value) ? [...new Set(value.map(String))] : [];
}

function cleanInventory(candidate) {
  const result = {};
  if (!isObject(candidate)) return result;
  for (const [itemId, amount] of Object.entries(candidate)) {
    if (!ITEMS[itemId]) continue;
    const count = Math.max(0, Math.floor(Number(amount) || 0));
    if (count > 0) result[itemId] = count;
  }
  return result;
}

function makeTutorialState() {
  return {
    version: 1,
    basicStatus: 'active',
    basicStep: 0,
    completedSteps: [],
    completedTutorials: [],
    skippedTutorials: [],
    readLibrary: [],
    rewardClaimed: false,
    events: {
      bedUsed: false, moved: false, pcOpened: false, doorOpened: false,
      inventoryOpened: false, manualSale: false, buildMenuOpened: false,
      hopperDeposit: false, autoSale: false,
    },
  };
}

export function makeDefaultHomeState({ existingSave = false } = {}) {
  const tutorial = makeTutorialState();
  if (existingSave) tutorial.basicStatus = 'skipped';
  return {
    version: HOME_VERSION,
    introducedFromLegacy: Boolean(existingSave),
    availabilityNotifiedAt: null,
    respawnEnabled: !existingSave,
    bedUsedAt: null,
    upgrades: [],
    storage: existingSave ? {} : { metal_scrap: 2, copper_wire: 1 },
    secureCase: {},
    loadoutPresets: [],
    materialTracking: null,
    pcBlueprints: [],
    cosmetics: { lamp: 'utility', wall: 'plain', shelf: 'tools' },
    tutorial,
    scanner: { lastPulseAt: 0 },
  };
}

function legacyBackpackUpgrades(legacyGame) {
  if (!legacyGame || typeof legacyGame !== 'object') return [];
  const values = [
    legacyGame.backpackSlots,
    legacyGame.maxBackpackSlots,
    legacyGame.player?.backpackSlots,
    legacyGame.player?.maxBackpackSlots,
  ].map(Number).filter(Number.isFinite);
  const capacity = values.length ? Math.max(...values) : BASE_BACKPACK_SLOTS;
  const unlocks = new Set([
    ...(Array.isArray(legacyGame.progression?.unlocks) ? legacyGame.progression.unlocks : []),
    ...(Array.isArray(legacyGame.upgrades) ? legacyGame.upgrades : []),
  ].map(String));
  const result = [];
  if (capacity >= 16 || unlocks.has('backpack_i') || unlocks.has('player:backpack_i')) result.push('backpack_i');
  if (capacity >= 20 || unlocks.has('backpack_ii') || unlocks.has('player:backpack_ii')) result.push('backpack_ii');
  if (capacity >= 24 || unlocks.has('backpack_iii') || unlocks.has('player:backpack_iii')) result.push('backpack_iii');
  return result;
}

function normalizeTutorial(candidate) {
  const base = makeTutorialState();
  const source = isObject(candidate) ? candidate : {};
  const validStatus = ['active', 'completed', 'skipped'].includes(source.basicStatus) ? source.basicStatus : base.basicStatus;
  return {
    ...base,
    ...source,
    version: 1,
    basicStatus: validStatus,
    basicStep: Math.max(0, Math.min(BASIC_TUTORIAL_STEPS.length, Math.floor(Number(source.basicStep) || 0))),
    completedSteps: uniqueStrings(source.completedSteps),
    completedTutorials: uniqueStrings(source.completedTutorials),
    skippedTutorials: uniqueStrings(source.skippedTutorials),
    readLibrary: uniqueStrings(source.readLibrary),
    rewardClaimed: Boolean(source.rewardClaimed),
    events: { ...base.events, ...(isObject(source.events) ? source.events : {}) },
  };
}

export function normalizeHomeState(candidate, { existingSave = false, legacyGame = null } = {}) {
  const base = makeDefaultHomeState({ existingSave });
  if (!isObject(candidate)) {
    base.upgrades = legacyBackpackUpgrades(legacyGame);
    return base;
  }
  const upgrades = uniqueStrings(candidate.upgrades).filter((id) => PLAYER_UPGRADES[id]);
  for (const id of legacyBackpackUpgrades(legacyGame)) if (!upgrades.includes(id)) upgrades.push(id);
  const presets = Array.isArray(candidate.loadoutPresets)
    ? candidate.loadoutPresets.slice(0, 5).map((preset, index) => ({
      id: String(preset?.id || `preset-${index + 1}`),
      name: String(preset?.name || `Preset ${index + 1}`).slice(0, 32),
      items: cleanInventory(preset?.items),
    }))
    : [];
  return {
    ...base,
    ...candidate,
    version: HOME_VERSION,
    introducedFromLegacy: Boolean(candidate.introducedFromLegacy),
    availabilityNotifiedAt: typeof candidate.availabilityNotifiedAt === 'string' ? candidate.availabilityNotifiedAt : null,
    respawnEnabled: Boolean(candidate.respawnEnabled),
    bedUsedAt: typeof candidate.bedUsedAt === 'string' ? candidate.bedUsedAt : null,
    upgrades,
    storage: cleanInventory(candidate.storage),
    secureCase: cleanInventory(candidate.secureCase),
    loadoutPresets: presets,
    materialTracking: ITEMS[candidate.materialTracking] ? candidate.materialTracking : null,
    pcBlueprints: uniqueStrings(candidate.pcBlueprints),
    cosmetics: {
      ...base.cosmetics,
      ...(isObject(candidate.cosmetics) ? candidate.cosmetics : {}),
    },
    tutorial: normalizeTutorial(candidate.tutorial),
    scanner: {
      lastPulseAt: Math.max(0, Number(candidate.scanner?.lastPulseAt || 0)),
    },
  };
}

export function ensureHomeState(game, options = {}) {
  if (!game) return makeDefaultHomeState(options);
  const hasHome = isObject(game.home);
  const runtimeReady = hasHome
    && Number(game.home.version) === HOME_VERSION
    && isObject(game.home.storage)
    && isObject(game.home.secureCase)
    && Array.isArray(game.home.upgrades)
    && isObject(game.home.tutorial)
    && isObject(game.home.tutorial.events);
  if (runtimeReady) return game.home;
  game.home = normalizeHomeState(game.home, {
    existingSave: options.existingSave ?? !hasHome,
    legacyGame: game,
  });
  return game.home;
}

export function hasPlayerUpgrade(game, id) {
  return ensureHomeState(game).upgrades.includes(id);
}

export function backpackSlotCapacity(game, fallback = BASE_BACKPACK_SLOTS) {
  const home = ensureHomeState(game);
  let slots = Math.max(BASE_BACKPACK_SLOTS, Number(fallback) || BASE_BACKPACK_SLOTS);
  for (const [id, value] of Object.entries(BACKPACK_SLOT_BY_UPGRADE)) {
    if (home.upgrades.includes(id)) slots = Math.max(slots, value);
  }
  return slots;
}

export function homeStorageSlotCapacity(game) {
  const home = ensureHomeState(game);
  let slots = 20;
  for (const [id, value] of Object.entries(HOME_STORAGE_SLOT_BY_UPGRADE)) {
    if (home.upgrades.includes(id)) slots = Math.max(slots, value);
  }
  return slots;
}

export function secureCaseSlotCapacity(game) {
  const home = ensureHomeState(game);
  let slots = 0;
  for (const [id, value] of Object.entries(SECURE_CASE_SLOT_BY_UPGRADE)) {
    if (home.upgrades.includes(id)) slots = Math.max(slots, value);
  }
  return slots;
}

function canAddToInventory(inventory, itemId, maxSlots) {
  const def = ITEMS[itemId];
  if (!def) return false;
  const current = Number(inventory[itemId] || 0);
  if (current > 0 && current % def.stack !== 0) return true;
  return usedSlots(inventory) < maxSlots;
}

function addUpTo(inventory, itemId, amount, maxSlots) {
  let added = 0;
  while (added < amount && canAddToInventory(inventory, itemId, maxSlots)) {
    inventory[itemId] = Number(inventory[itemId] || 0) + 1;
    added += 1;
  }
  return added;
}

function inventorySources(game, includeFactory) {
  const home = ensureHomeState(game);
  const sources = [
    { id: 'backpack', label: 'Backpack', inventory: game.inventory || {} },
    { id: 'home', label: 'Home Storage', inventory: home.storage },
  ];
  if (includeFactory) {
    for (const building of game.buildings || []) {
      if (!['storage', 'industrial_storage'].includes(building.type)) continue;
      building.output ??= {};
      sources.push({ id: `factory:${building.id}`, label: 'Factory Storage', inventory: building.output });
    }
  }
  return sources;
}

function itemAvailability(sources, itemId) {
  return sources.reduce((sum, source) => sum + Math.max(0, Number(source.inventory?.[itemId] || 0)), 0);
}

export function quotePlayerUpgrade(game, id) {
  const def = PLAYER_UPGRADES[id];
  const home = ensureHomeState(game);
  if (!def) return { ok: false, reason: 'unknown-upgrade', definition: null };
  if (home.upgrades.includes(id)) return { ok: false, reason: 'owned', definition: def };
  const rank = Math.max(1, Number(game.progression?.progressionRank || 1));
  if (rank < def.rank) return { ok: false, reason: 'rank', definition: def, requiredRank: def.rank };
  const missingPrerequisites = (def.requires || []).filter((required) => !home.upgrades.includes(required));
  if (missingPrerequisites.length) return { ok: false, reason: 'prerequisite', definition: def, missingPrerequisites };
  if (def.blueprint && !home.pcBlueprints.includes(def.blueprint)) return { ok: false, reason: 'blueprint', definition: def, blueprint: def.blueprint };
  const includeFactory = home.upgrades.includes('factory_network_link');
  const sources = inventorySources(game, includeFactory);
  const missingItems = {};
  for (const [itemId, amount] of Object.entries(def.items || {})) {
    const missing = Math.max(0, amount - itemAvailability(sources, itemId));
    if (missing > 0) missingItems[itemId] = missing;
  }
  const cashMissing = Math.max(0, def.cash - Math.max(0, Number(game.money || 0)));
  return {
    ok: cashMissing === 0 && Object.keys(missingItems).length === 0,
    reason: cashMissing > 0 ? 'cash' : Object.keys(missingItems).length ? 'items' : null,
    definition: def,
    missingItems,
    cashMissing,
    includeFactory,
  };
}

export function purchasePlayerUpgrade(game, id) {
  const quote = quotePlayerUpgrade(game, id);
  if (!quote.ok) return { changed: false, ...quote };
  const def = quote.definition;
  const home = ensureHomeState(game);
  const sources = inventorySources(game, quote.includeFactory);
  const plan = [];
  for (const [itemId, required] of Object.entries(def.items || {})) {
    let remaining = required;
    for (const source of sources) {
      const available = Math.max(0, Math.floor(Number(source.inventory[itemId] || 0)));
      const take = Math.min(available, remaining);
      if (take > 0) plan.push({ source, itemId, amount: take });
      remaining -= take;
      if (remaining <= 0) break;
    }
    if (remaining > 0) return { changed: false, reason: 'items-race', definition: def };
  }
  if (Number(game.money || 0) < def.cash) return { changed: false, reason: 'cash-race', definition: def };
  for (const step of plan) step.source.inventory[step.itemId] = Math.max(0, Number(step.source.inventory[step.itemId] || 0) - step.amount);
  game.money = Math.max(0, Number(game.money || 0) - def.cash);
  if (!home.upgrades.includes(id)) home.upgrades.push(id);
  return { changed: true, definition: def, consumed: plan.map(({ source, itemId, amount }) => ({ source: source.id, itemId, amount })) };
}

const SECURE_DISALLOWED = new Set([
  'ai_control_module', 'experimental_frame', 'experimental_power_module', 'autonomous_industrial_core',
]);

export function secureCaseAllows(itemId) {
  return Boolean(ITEMS[itemId]) && !SECURE_DISALLOWED.has(itemId);
}

export function protectExplorationLoot(game, itemId, amount = 1) {
  const home = ensureHomeState(game);
  const capacity = secureCaseSlotCapacity(game);
  const session = game.exploration?.activeSession;
  if (!session) return { changed: false, reason: 'no-session' };
  if (capacity <= 0) return { changed: false, reason: 'locked' };
  if (!secureCaseAllows(itemId)) return { changed: false, reason: 'not-allowed' };
  let remaining = Math.min(Math.max(0, Math.floor(Number(amount) || 0)), Math.max(0, Number(session.loot?.[itemId] || 0)));
  if (remaining <= 0) return { changed: false, reason: 'no-item' };
  let moved = 0;
  while (remaining > 0 && canAddToInventory(home.secureCase, itemId, capacity)) {
    session.loot[itemId] -= 1;
    home.secureCase[itemId] = Number(home.secureCase[itemId] || 0) + 1;
    remaining -= 1;
    moved += 1;
  }
  if (session.loot[itemId] <= 0) delete session.loot[itemId];
  return { changed: moved > 0, reason: moved > 0 ? null : 'full', moved, capacity };
}

export function releaseSecureCaseToHome(game) {
  const home = ensureHomeState(game);
  const capacity = homeStorageSlotCapacity(game);
  let moved = 0;
  for (const [itemId, amount] of Object.entries({ ...home.secureCase })) {
    const take = addUpTo(home.storage, itemId, Number(amount), capacity);
    if (take <= 0) continue;
    home.secureCase[itemId] -= take;
    if (home.secureCase[itemId] <= 0) delete home.secureCase[itemId];
    moved += take;
  }
  return { changed: moved > 0, moved };
}

export function moveBackpackToHome(game, itemId, amount = 1) {
  const home = ensureHomeState(game);
  if (!ITEMS[itemId]) return { changed: false, reason: 'unknown-item', moved: 0 };
  const available = Math.max(0, Math.floor(Number(game.inventory?.[itemId] || 0)));
  const requested = Math.min(available, Math.max(1, Math.floor(Number(amount) || 1)));
  if (requested <= 0) return { changed: false, reason: 'no-item', moved: 0 };
  const moved = addUpTo(home.storage, itemId, requested, homeStorageSlotCapacity(game));
  if (moved > 0) game.inventory[itemId] = available - moved;
  return { changed: moved > 0, reason: moved > 0 ? null : 'full', moved };
}

export function moveHomeToBackpack(game, itemId, amount = 1) {
  const home = ensureHomeState(game);
  if (!ITEMS[itemId]) return { changed: false, reason: 'unknown-item', moved: 0 };
  const available = Math.max(0, Math.floor(Number(home.storage[itemId] || 0)));
  const requested = Math.min(available, Math.max(1, Math.floor(Number(amount) || 1)));
  if (requested <= 0) return { changed: false, reason: 'no-item', moved: 0 };
  const moved = addUpTo(game.inventory, itemId, requested, backpackSlotCapacity(game));
  if (moved > 0) {
    home.storage[itemId] = available - moved;
    if (home.storage[itemId] <= 0) delete home.storage[itemId];
  }
  return { changed: moved > 0, reason: moved > 0 ? null : 'full', moved };
}

export function quickDepositToHome(game, { favorites = [] } = {}) {
  if (!hasPlayerUpgrade(game, 'quick_deposit')) return { changed: false, reason: 'locked', moved: 0 };
  const home = ensureHomeState(game);
  const capacity = homeStorageSlotCapacity(game);
  const favoriteSet = new Set(favorites.map(String));
  let moved = 0;
  for (const [itemId, amount] of Object.entries({ ...(game.inventory || {}) })) {
    if (!ITEMS[itemId] || Number(amount) <= 0 || favoriteSet.has(itemId) || SECURE_DISALLOWED.has(itemId)) continue;
    const take = addUpTo(home.storage, itemId, Number(amount), capacity);
    if (take <= 0) continue;
    game.inventory[itemId] -= take;
    moved += take;
  }
  return { changed: moved > 0, moved, remainingSlots: Math.max(0, capacity - usedSlots(home.storage)) };
}

export function saveLoadoutPreset(game, name = 'Preset') {
  if (!hasPlayerUpgrade(game, 'loadout_preset')) return { changed: false, reason: 'locked' };
  const home = ensureHomeState(game);
  const items = cleanInventory(game.inventory);
  const id = `preset-${Date.now().toString(36)}`;
  home.loadoutPresets = [...home.loadoutPresets.slice(-4), { id, name: String(name).slice(0, 32) || 'Preset', items }];
  return { changed: true, preset: home.loadoutPresets.at(-1) };
}

export function applyLoadoutPreset(game, presetId) {
  if (!hasPlayerUpgrade(game, 'loadout_preset')) return { changed: false, reason: 'locked' };
  const home = ensureHomeState(game);
  const preset = home.loadoutPresets.find((entry) => entry.id === presetId);
  if (!preset) return { changed: false, reason: 'not-found' };
  const capacity = backpackSlotCapacity(game);
  const shortages = {};
  let moved = 0;
  for (const [itemId, desired] of Object.entries(preset.items)) {
    const current = Math.max(0, Number(game.inventory?.[itemId] || 0));
    let need = Math.max(0, desired - current);
    const available = Math.max(0, Number(home.storage[itemId] || 0));
    if (available < need) shortages[itemId] = need - available;
    need = Math.min(need, available);
    while (need > 0 && canAddToInventory(game.inventory, itemId, capacity)) {
      game.inventory[itemId] = Number(game.inventory[itemId] || 0) + 1;
      home.storage[itemId] -= 1;
      need -= 1;
      moved += 1;
    }
  }
  return { changed: moved > 0, moved, shortages };
}

export function setMaterialTracking(game, itemId) {
  const home = ensureHomeState(game);
  if (!hasPlayerUpgrade(game, 'material_tracking')) return { changed: false, reason: 'locked' };
  if (itemId !== null && !ITEMS[itemId]) return { changed: false, reason: 'unknown-item' };
  home.materialTracking = itemId;
  return { changed: true, itemId };
}

export function scannerProfile(game) {
  const home = ensureHomeState(game);
  if (!home.upgrades.includes('loot_scanner_i')) return { unlocked: false, radius: 0, durationMs: 0, cooldownMs: 0, maxTargets: 0 };
  let radius = 12;
  let durationMs = 2600;
  let cooldownMs = 9000;
  let maxTargets = 8;
  if (home.upgrades.includes('loot_scanner_ii')) { radius = 18; durationMs = 3400; maxTargets = 12; }
  if (home.upgrades.includes('advanced_scanner')) { radius = 24; durationMs = 3900; cooldownMs = 7500; maxTargets = 18; }
  if (home.upgrades.includes('scanner_mastery')) { radius = 30; durationMs = 4600; cooldownMs = 6000; maxTargets = 24; }
  return {
    unlocked: true, radius, durationMs, cooldownMs, maxTargets,
    resourceScanner: home.upgrades.includes('resource_scanner'),
    rareDetection: home.upgrades.includes('rare_loot_detection'),
    trackedItemId: home.materialTracking,
  };
}

export function scannerReady(game, now = Date.now()) {
  const profile = scannerProfile(game);
  if (!profile.unlocked) return { ready: false, reason: 'locked', remainingMs: 0, profile };
  const home = ensureHomeState(game);
  const elapsed = Math.max(0, now - Number(home.scanner.lastPulseAt || 0));
  return { ready: elapsed >= profile.cooldownMs, reason: elapsed >= profile.cooldownMs ? null : 'cooldown', remainingMs: Math.max(0, profile.cooldownMs - elapsed), profile };
}

export function markScannerPulse(game, now = Date.now()) {
  const state = scannerReady(game, now);
  if (!state.ready) return { changed: false, ...state };
  ensureHomeState(game).scanner.lastPulseAt = now;
  return { changed: true, ...state };
}

export function recordTutorialEvent(game, eventName, value = true) {
  const tutorial = ensureHomeState(game).tutorial;
  if (!Object.prototype.hasOwnProperty.call(tutorial.events, eventName)) return false;
  tutorial.events[eventName] = value;
  return true;
}

function basicStepSatisfied(game, stepId) {
  const home = ensureHomeState(game);
  const events = home.tutorial.events;
  switch (stepId) {
    case 'bed': return Boolean(home.bedUsedAt || events.bedUsed);
    case 'move': return Boolean(events.moved);
    case 'pc': return Boolean(events.pcOpened);
    case 'door': return Boolean(events.doorOpened);
    case 'scrapyard': return Boolean(game.tutorialStats?.movedToScrapyard);
    case 'collect': return Number(game.tutorialStats?.collected || 0) >= 5;
    case 'inventory': return Boolean(events.inventoryOpened);
    case 'return': return Boolean(game.tutorialStats?.returned);
    case 'manual_sale': return Boolean(events.manualSale);
    case 'build_mode': return Boolean(events.buildMenuOpened);
    case 'hopper': return Boolean(events.hopperDeposit);
    case 'conveyor': return (game.buildings || []).some((building) => building.type.startsWith('conveyor'));
    case 'crusher': return (game.buildings || []).some((building) => building.type === 'crusher' && !building.permanent);
    case 'seller': return Boolean(game.tutorialStats?.automationComplete);
    case 'auto_sale': return Boolean(events.autoSale);
    default: return false;
  }
}

export function advanceHomeTutorial(game) {
  const home = ensureHomeState(game);
  const tutorial = home.tutorial;
  if (tutorial.basicStatus !== 'active') return { changed: false, completed: tutorial.basicStatus === 'completed' };
  let changed = false;
  while (tutorial.basicStep < BASIC_TUTORIAL_STEPS.length) {
    const step = BASIC_TUTORIAL_STEPS[tutorial.basicStep];
    if (!basicStepSatisfied(game, step.id)) break;
    if (!tutorial.completedSteps.includes(step.id)) tutorial.completedSteps.push(step.id);
    tutorial.basicStep += 1;
    changed = true;
  }
  if (tutorial.basicStep >= BASIC_TUTORIAL_STEPS.length) {
    tutorial.basicStatus = 'completed';
    if (!tutorial.completedTutorials.includes('basic')) tutorial.completedTutorials.push('basic');
    if (!tutorial.rewardClaimed) {
      game.money = Math.max(0, Number(game.money || 0)) + 50;
      tutorial.rewardClaimed = true;
    }
    changed = true;
  }
  return { changed, completed: tutorial.basicStatus === 'completed', step: tutorial.basicStep };
}

export function skipBasicTutorial(game) {
  const tutorial = ensureHomeState(game).tutorial;
  if (tutorial.basicStatus === 'completed') return { changed: false, reason: 'completed' };
  tutorial.basicStatus = 'skipped';
  if (!tutorial.skippedTutorials.includes('basic')) tutorial.skippedTutorials.push('basic');
  return { changed: true };
}

export function restartBasicTutorial(game) {
  const tutorial = ensureHomeState(game).tutorial;
  tutorial.basicStatus = 'active';
  tutorial.basicStep = 0;
  tutorial.completedSteps = [];
  return { changed: true };
}

export function homeTutorialObjective(game) {
  const result = advanceHomeTutorial(game);
  const tutorial = ensureHomeState(game).tutorial;
  if (tutorial.basicStatus === 'active') {
    const step = BASIC_TUTORIAL_STEPS[tutorial.basicStep] || BASIC_TUTORIAL_STEPS.at(-1);
    return {
      kind: 'MAIN',
      id: `basic:${step.id}`,
      title: step.title,
      body: step.body,
      hint: step.hint,
      progress: `${tutorial.basicStep + 1} / ${BASIC_TUTORIAL_STEPS.length}`,
      changed: result.changed,
    };
  }
  return nextGoal(game);
}

export function nextGoal(game) {
  const rank = Math.max(1, Number(game.progression?.progressionRank || 1));
  if (game.finalChapter?.mainClearedAt) {
    return { kind: 'OPTIONAL', id: 'optimization', title: 'Factory Optimization', body: 'MAIN CLEAR済み。同じSaveでThroughput・Power・Layoutを最適化できます。', hint: 'PのFactory Consoleで詰まりを確認。', progress: 'POST CLEAR' };
  }
  if (rank >= 7) return { kind: 'MAIN', id: 'final', title: 'Final Chapterを進める', body: 'Experimental Technology → Final Automation → Mega Factory 180秒安定稼働へ進みます。', hint: 'PのAutomation / Final Diagnosticsを確認。', progress: 'RANK 7' };
  return {
    kind: 'MAIN',
    id: `rank-${rank + 1}`,
    title: `Rank ${rank + 1} Main Objective`,
    body: `現在Rank ${rank}。Factory / Exploration / ResearchのMain条件を進めます。PC Upgradeは任意です。`,
    hint: rank < 3 ? 'まずFactoryの売上と自動化を伸ばす。' : 'TのExploration TerminalとPのFactory Consoleを確認。',
    progress: `RANK ${rank} / 7`,
  };
}

export function visibleTutorialLibrary(game) {
  const rank = Math.max(1, Number(game.progression?.progressionRank || 1));
  return TUTORIAL_LIBRARY.filter((entry) => entry.minRank <= rank);
}

export function markTutorialRead(game, id) {
  const tutorial = ensureHomeState(game).tutorial;
  if (!tutorial.readLibrary.includes(id)) tutorial.readLibrary.push(id);
  return true;
}

export function tutorialUnreadCount(game) {
  const tutorial = ensureHomeState(game).tutorial;
  return visibleTutorialLibrary(game).filter((entry) => !tutorial.readLibrary.includes(entry.id)).length;
}

export function factoryStorageInventory(game) {
  const total = {};
  for (const building of game.buildings || []) {
    if (!['storage', 'industrial_storage'].includes(building.type)) continue;
    for (const [itemId, amount] of Object.entries(building.output || {})) {
      if (!ITEMS[itemId] || Number(amount) <= 0) continue;
      total[itemId] = Number(total[itemId] || 0) + Number(amount);
    }
  }
  return total;
}

export function materialCounts(game) {
  const home = ensureHomeState(game);
  const sources = {
    backpack: cleanInventory(game.inventory),
    home: cleanInventory(home.storage),
    secureCase: cleanInventory(home.secureCase),
    factory: factoryStorageInventory(game),
  };
  const total = {};
  for (const inventory of Object.values(sources)) {
    for (const [itemId, amount] of Object.entries(inventory)) total[itemId] = Number(total[itemId] || 0) + Number(amount);
  }
  return { sources, total };
}
