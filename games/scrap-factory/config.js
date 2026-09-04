export const GAME_ID = 'scrap-factory';
export const SAVE_KEY = 'elitemay-game-hub-v1';
export const SAVE_SCHEMA_VERSION = 1;
export const GRID_SIZE = 2.5;
export const BASE_LIMIT = 20;
export const INTERACT_DISTANCE = 4.2;

export const ITEMS = {
  metal_scrap: { id: 'metal_scrap', name: '鉄くず', short: '鉄くず', value: 8, stack: 20, color: 0x75808a, category: 'raw' },
  copper_wire: { id: 'copper_wire', name: '銅線', short: '銅線', value: 11, stack: 20, color: 0xb9754d, category: 'raw' },
  plastic: { id: 'plastic', name: '廃プラスチック', short: 'プラ', value: 6, stack: 20, color: 0x497e8a, category: 'raw' },
  e_waste: { id: 'e_waste', name: '電子ジャンク', short: '電子', value: 16, stack: 12, color: 0x596b55, category: 'raw' },
  crushed_metal: { id: 'crushed_metal', name: '破砕金属', short: '破砕', value: 13, stack: 20, color: 0x8b9499, category: 'processed' },
  iron_ingot: { id: 'iron_ingot', name: '鉄インゴット', short: '鉄塊', value: 24, stack: 20, color: 0xb4bcc0, category: 'processed' },
  iron_plate: { id: 'iron_plate', name: '鉄板', short: '鉄板', value: 38, stack: 20, color: 0x9fa8ac, category: 'product' },
  cable_bundle: { id: 'cable_bundle', name: 'ケーブル束', short: 'ケーブル', value: 48, stack: 16, color: 0x8f684d, category: 'product' },
  tool_kit: { id: 'tool_kit', name: '工具セット', short: '工具', value: 115, stack: 10, color: 0x9a7f44, category: 'product' },
};

export const RECIPES = {
  crusher_metal: {
    id: 'crusher_metal',
    machine: 'crusher',
    input: { metal_scrap: 1 },
    output: { crushed_metal: 1 },
    seconds: 2.2,
  },
  smelter_iron: {
    id: 'smelter_iron',
    machine: 'smelter',
    input: { crushed_metal: 1 },
    output: { iron_ingot: 1 },
    seconds: 3.0,
  },
};

export const BUILDINGS = {
  hopper: {
    id: 'hopper', name: '投入ホッパー', cost: 0, category: 'logistics', buildable: false,
    description: '探索で集めた素材をここへ投入すると、自動ラインへ流せる。',
    color: 0x6f7a63, accepts: ['raw', 'processed', 'product'],
  },
  seller: {
    id: 'seller', name: '販売ターミナル', cost: 90, category: 'sales', buildable: true,
    description: '届いたアイテムを自動で売却する。直接持ち込んで売ることもできる。',
    color: 0xb98a3d, accepts: ['raw', 'processed', 'product'],
  },
  crusher: {
    id: 'crusher', name: '粉砕機', cost: 80, category: 'production', buildable: true,
    description: '鉄くずを破砕金属へ加工する。',
    color: 0x8a6b4d, accepts: ['metal_scrap'], recipe: 'crusher_metal',
  },
  smelter: {
    id: 'smelter', name: '簡易精錬炉', cost: 140, category: 'production', buildable: true,
    description: '破砕金属を鉄インゴットへ精錬する。',
    color: 0x7c4f3d, accepts: ['crushed_metal'], recipe: 'smelter_iron',
  },
  conveyor: {
    id: 'conveyor', name: 'コンベア', cost: 12, category: 'logistics', buildable: true,
    description: '機械同士をつなぐ。方向はRで回転。',
    color: 0x4a555a, accepts: [],
  },
  storage: {
    id: 'storage', name: '小型倉庫', cost: 60, category: 'logistics', buildable: true,
    description: '自動ラインの中間バッファ。',
    color: 0x52616c, accepts: ['raw', 'processed', 'product'],
  },
};

export const HAND_CRAFTS = {
  iron_plate: { id: 'iron_plate', name: '鉄板', input: { iron_ingot: 2 }, output: { iron_plate: 1 } },
  cable_bundle: { id: 'cable_bundle', name: 'ケーブル束', input: { copper_wire: 2, plastic: 1 }, output: { cable_bundle: 1 } },
  tool_kit: { id: 'tool_kit', name: '工具セット', input: { iron_plate: 2, copper_wire: 1 }, output: { tool_kit: 1 } },
};

export const BUILD_MENU_ORDER = ['crusher', 'smelter', 'conveyor', 'storage', 'seller'];

export const SCRAP_SPAWNS = [
  { item: 'metal_scrap', weight: 48 },
  { item: 'copper_wire', weight: 24 },
  { item: 'plastic', weight: 18 },
  { item: 'e_waste', weight: 10 },
];

export const TUTORIAL = [
  { id: 'move', title: '廃材置き場へ向かう', body: 'WASDで移動。黄色いゲートの先が探索エリア。', target: 1 },
  { id: 'collect', title: 'スクラップを5個回収', body: '中央の照準をアイテムに合わせて E。', target: 5 },
  { id: 'return', title: '拠点へ戻る', body: '工場区画の投入ホッパーまで戻る。', target: 1 },
  { id: 'sell', title: 'まず $80 稼ぐ', body: '販売ターミナルを見て E。持ち物を直接売却できる。', target: 80 },
  { id: 'crusher', title: '粉砕機を建てる', body: 'Bで建築モード。粉砕機を選んで拠点内に設置。', target: 1 },
  { id: 'process', title: '破砕金属を作る', body: '粉砕機を見て E。鉄くずを直接加工できる。', target: 1 },
  { id: 'automation', title: '最初の自動ラインを作る', body: 'ホッパー → コンベア → 粉砕機 → コンベア → 販売ターミナルをつなぐ。', target: 1 },
  { id: 'revenue', title: '累計売上 $250', body: '探索と自動化を組み合わせて工場を成長させよう。', target: 250 },
];

export function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function positionKey(x, z) {
  return `${Math.round(x / GRID_SIZE)},${Math.round(z / GRID_SIZE)}`;
}

export function itemCount(inventory) {
  return Object.values(inventory).reduce((sum, amount) => sum + Number(amount || 0), 0);
}

export function usedSlots(inventory) {
  return Object.entries(inventory).reduce((sum, [id, amount]) => {
    const def = ITEMS[id];
    if (!def || amount <= 0) return sum;
    return sum + Math.ceil(amount / def.stack);
  }, 0);
}
