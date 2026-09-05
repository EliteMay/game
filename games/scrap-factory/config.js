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
  circuit: { id: 'circuit', name: '制御回路', short: '回路', value: 145, stack: 12, color: 0x4f846d, category: 'advanced' },
  motor: { id: 'motor', name: '産業モーター', short: 'モーター', value: 185, stack: 10, color: 0x7b6b5c, category: 'advanced' },
  control_unit: { id: 'control_unit', name: '制御ユニット', short: '制御', value: 520, stack: 8, color: 0x6f837f, category: 'advanced' },
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
  assembler_control_unit: {
    id: 'assembler_control_unit',
    machine: 'assembler',
    input: { motor: 1, circuit: 2, plastic: 1 },
    output: { control_unit: 1 },
    seconds: 8.0,
  },
};

export const BUILDINGS = {
  hopper: {
    id: 'hopper', name: '投入ホッパー', cost: 0, category: 'logistics', buildable: false,
    description: '探索で集めた素材をまとめて投入する、工場ラインのスタート地点。Eでバッグの中身を移せる。',
    color: 0x6f7a63, accepts: ['raw', 'processed', 'product', 'advanced'],
  },
  seller: {
    id: 'seller', name: '販売ターミナル', cost: 90, category: 'sales', buildable: true,
    description: '届いたアイテムを自動で現金化する。Eでバッグの中身を直接売ることもできる。',
    color: 0xb98a3d, accepts: ['raw', 'processed', 'product', 'advanced'],
  },
  crusher: {
    id: 'crusher', name: '粉砕機', cost: 80, category: 'production', buildable: true,
    description: '鉄くず1個を2.2秒で破砕金属1個へ加工する。Rank 4以降は稼働時に18 Powerを使用する。',
    color: 0x8a6b4d, accepts: ['metal_scrap'], recipe: 'crusher_metal', powerUse: 18,
  },
  smelter: {
    id: 'smelter', name: '簡易精錬炉', cost: 140, category: 'production', buildable: true,
    description: '破砕金属1個を3.0秒で鉄インゴット1個へ精錬する。Rank 4以降は稼働時に30 Powerを使用する。',
    color: 0x7c4f3d, accepts: ['crushed_metal'], recipe: 'smelter_iron', powerUse: 30,
  },
  assembler: {
    id: 'assembler', name: 'アセンブラー', cost: 420, category: 'production', buildable: true,
    description: '廃工場の制御Blueprintを解析して解放する高度組立機。モーター・制御回路・プラスチックから制御ユニットを自動組立する。',
    color: 0x526a66, accepts: ['motor', 'circuit', 'plastic'], recipe: 'assembler_control_unit', powerUse: 50,
  },
  conveyor: {
    id: 'conveyor', name: 'コンベア Mk.1', cost: 12, category: 'logistics', buildable: true,
    description: '黄色い矢印の方向へ1.5個/秒で搬送する基本ベルト。Rで設置方向を変更し、設置後もEで回転・反転できる。',
    color: 0x4a555a, accepts: [], throughput: 1.5,
  },
  conveyor_mk2: {
    id: 'conveyor_mk2', name: 'コンベア Mk.2', cost: 28, category: 'logistics', buildable: true,
    description: 'Rank 4で解放される高速ベルト。黄色い矢印の方向へ3個/秒で搬送し、Mk.1の2倍の帯域を持つ。',
    color: 0x48656b, accepts: [], throughput: 3,
  },
  splitter: {
    id: 'splitter', name: 'スプリッター', cost: 85, category: 'logistics', buildable: true,
    description: 'Rank 4物流設備。背面1入力を正面・左・右の有効な搬送先へ順番に分配する。最大3個/秒。',
    color: 0x6b6548, accepts: [], throughput: 3,
  },
  merger: {
    id: 'merger', name: 'マージャー', cost: 85, category: 'logistics', buildable: true,
    description: 'Rank 4物流設備。背面・左・右の3入力を受け、正面1方向へ合流させる。最大3個/秒。',
    color: 0x65566b, accepts: [], throughput: 3,
  },
  smart_sorter: {
    id: 'smart_sorter', name: 'スマートソーター', cost: 180, category: 'logistics', buildable: true,
    description: 'Rank 5物流設備。背面から受けた素材をカテゴリで自動分類する。高度部品は正面、中間材・製品は左、原料は右へ最大3個/秒で送る。',
    color: 0x4f6b62, accepts: [], throughput: 3,
  },
  storage: {
    id: 'storage', name: '小型倉庫', cost: 60, category: 'logistics', buildable: true,
    description: '自動ラインの途中で最大120個を保管する中間バッファ。満杯になると上流を止め、Itemを消失させない。',
    color: 0x52616c, accepts: ['raw', 'processed', 'product', 'advanced'], storageCapacity: 120,
  },
  industrial_storage: {
    id: 'industrial_storage', name: '産業倉庫', cost: 240, category: 'logistics', buildable: true,
    description: 'Rank 5向け大容量Storage。最大600個を保管し、大規模ラインのBufferとして使う。',
    color: 0x435660, accepts: ['raw', 'processed', 'product', 'advanced'], storageCapacity: 600,
  },
  generator: {
    id: 'generator', name: 'スクラップ発電機', cost: 260, category: 'power', buildable: true,
    description: '鉄くず1個を燃料として24秒稼働し、80 Powerを供給するRank 4向け発電設備。',
    color: 0x7a6242, accepts: ['metal_scrap'], powerGeneration: 80,
  },
  power_pole: {
    id: 'power_pole', name: '電力ポール', cost: 45, category: 'power', buildable: true,
    description: 'Starter Gridや発電機から電力網を延長し、周囲10mの設備へ給電する。ポール同士は12.5m以内で接続する。',
    color: 0x59605f, accepts: [],
  },
  battery: {
    id: 'battery', name: 'グリッドバッテリー', cost: 220, category: 'power', buildable: true,
    description: 'Grid Storage研究で解放。余剰電力を自動充電し、発電不足時に最大80 Powerを自動放電する。',
    color: 0x52636f, accepts: [], powerStorageCapacity: 960, powerChargeRate: 60, powerDischargeRate: 80,
  },
};

export const HAND_CRAFTS = {
  iron_plate: { id: 'iron_plate', name: '鉄板', input: { iron_ingot: 2 }, output: { iron_plate: 1 } },
  cable_bundle: { id: 'cable_bundle', name: 'ケーブル束', input: { copper_wire: 2, plastic: 1 }, output: { cable_bundle: 1 } },
  tool_kit: { id: 'tool_kit', name: '工具セット', input: { iron_plate: 2, copper_wire: 1 }, output: { tool_kit: 1 } },
  circuit: { id: 'circuit', name: '制御回路', input: { copper_wire: 2, e_waste: 1, plastic: 1 }, output: { circuit: 1 } },
  motor: { id: 'motor', name: '産業モーター', input: { iron_ingot: 2, copper_wire: 2 }, output: { motor: 1 } },
};

// Keep the first five entries stable: Factory Management quick-build 1-5 is a public control contract.
export const BUILD_MENU_ORDER = [
  'crusher',
  'smelter',
  'conveyor',
  'storage',
  'seller',
  'conveyor_mk2',
  'splitter',
  'merger',
  'smart_sorter',
  'generator',
  'power_pole',
  'battery',
  'industrial_storage',
  'assembler',
];

export const SCRAP_SPAWNS = [
  { item: 'metal_scrap', weight: 48 },
  { item: 'copper_wire', weight: 24 },
  { item: 'plastic', weight: 18 },
  { item: 'e_waste', weight: 10 },
];

export const TUTORIAL = [
  { id: 'move', title: '廃材置き場へ向かう', body: 'WASDで移動 / Shiftでダッシュ。黄色いゲートの先がSCRAP YARDです。\n迷ったら O でガイドを開けます。', target: 1 },
  { id: 'collect', title: 'スクラップを5個回収', body: '画面中央の照準を落ちているスクラップに合わせて E。\nバッグは12枠。Tabで中身と売値を確認できます。', target: 5 },
  { id: 'return', title: '拠点へ戻る', body: '黄色いゲートを戻ってFACTORY BASEへ。\nまずは販売ターミナルに直接持ち込み、建築資金を作ります。', target: 1 },
  { id: 'sell', title: 'まず $80 稼ぐ', body: '販売ターミナルを見て E。バッグ内のアイテムをまとめて売却できます。\n加工品ほど高く売れるので、後ほど自動化すると利益が伸びます。', target: 80 },
  { id: 'crusher', title: '粉砕機を建てる', body: 'B → 粉砕機を選択。半透明プレビューを拠点内へ置き、左クリックで設置。\nRで向きを90°ずつ変更できます。', target: 1 },
  { id: 'process', title: '破砕金属を作る', body: '粉砕機を見て E →「対応素材を投入」。鉄くず1個が2.2秒で破砕金属になります。\n完成後は「出力を回収」もできます。', target: 1 },
  { id: 'automation', title: '最初の自動ラインを作る', body: '投入ホッパー → コンベア → 粉砕機 → コンベア → 販売ターミナル。\n重要：コンベアの黄色い矢印が搬送方向です。置いた後も E で回転・反転できます。Fは解体モード。', target: 1 },
  { id: 'revenue', title: '累計売上 $250', body: '探索・加工・自動化を組み合わせて売上を伸ばします。\nTabで鉄板や工具セットも作れます。Oのガイドでラインの作り方をいつでも確認できます。', target: 250 },
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
