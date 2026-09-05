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
  rare_alloy: { id: 'rare_alloy', name: '軍用レア合金', short: 'レア合金', value: 680, stack: 8, color: 0x8798a2, category: 'advanced' },
  ai_control_module: { id: 'ai_control_module', name: 'AI制御モジュール', short: 'AI MODULE', value: 980, stack: 6, color: 0x6faeb8, category: 'advanced' },
  experimental_frame: { id: 'experimental_frame', name: '実験フレーム', short: 'EXP FRAME', value: 1150, stack: 6, color: 0x8d99aa, category: 'advanced' },
  experimental_power_module: { id: 'experimental_power_module', name: '実験電力モジュール', short: 'EXP POWER', value: 1320, stack: 6, color: 0x777fd0, category: 'advanced' },
  autonomous_industrial_core: { id: 'autonomous_industrial_core', name: '自律産業コア', short: 'AUTO CORE', value: 8500, stack: 2, color: 0x75b7b2, category: 'advanced' },
};

export const RECIPES = {
  crusher_metal: { id: 'crusher_metal', machine: 'crusher', input: { metal_scrap: 1 }, output: { crushed_metal: 1 }, seconds: 2.2 },
  smelter_iron: { id: 'smelter_iron', machine: 'smelter', input: { crushed_metal: 1 }, output: { iron_ingot: 1 }, seconds: 3.0 },
  assembler_control_unit: { id: 'assembler_control_unit', machine: 'assembler', input: { motor: 1, circuit: 2, plastic: 1 }, output: { control_unit: 1 }, seconds: 8.0 },
  assembler_iron_plate: { id: 'assembler_iron_plate', machine: 'assembler_plate', input: { iron_ingot: 2 }, output: { iron_plate: 1 }, seconds: 4.0 },
  assembler_motor: { id: 'assembler_motor', machine: 'assembler_motor', input: { iron_ingot: 2, copper_wire: 2 }, output: { motor: 1 }, seconds: 6.0 },
  assembler_circuit: { id: 'assembler_circuit', machine: 'assembler_circuit', input: { copper_wire: 2, e_waste: 1, plastic: 1 }, output: { circuit: 1 }, seconds: 6.0 },
  fabricator_experimental_set: {
    id: 'fabricator_experimental_set',
    machine: 'fabricator',
    input: { control_unit: 2, rare_alloy: 3, circuit: 2, iron_plate: 2 },
    output: { ai_control_module: 1, experimental_frame: 1, experimental_power_module: 1 },
    seconds: 20.0,
  },
  fabricator_autonomous_core: {
    id: 'fabricator_autonomous_core',
    machine: 'fabricator_core',
    input: { ai_control_module: 1, experimental_frame: 1, experimental_power_module: 1, control_unit: 1 },
    output: { autonomous_industrial_core: 1 },
    seconds: 30.0,
  },
  drone_residential_copper: { id: 'drone_residential_copper', machine: 'drone_port_copper', input: {}, output: { copper_wire: 1 }, seconds: 8.0 },
  drone_industrial_electronics: { id: 'drone_industrial_electronics', machine: 'drone_port_electronics', input: {}, output: { e_waste: 1 }, seconds: 10.0 },
  drone_military_alloy: { id: 'drone_military_alloy', machine: 'drone_port', input: {}, output: { rare_alloy: 1 }, seconds: 12.0 },
  advanced_drone_residential_copper: { id: 'advanced_drone_residential_copper', machine: 'advanced_drone_port_copper', input: {}, output: { copper_wire: 1 }, seconds: 5.0 },
  advanced_drone_residential_plastic: { id: 'advanced_drone_residential_plastic', machine: 'advanced_drone_port_plastic', input: {}, output: { plastic: 1 }, seconds: 6.0 },
  advanced_drone_industrial_electronics: { id: 'advanced_drone_industrial_electronics', machine: 'advanced_drone_port_electronics', input: {}, output: { e_waste: 1 }, seconds: 6.0 },
  advanced_drone_industrial_scrap: { id: 'advanced_drone_industrial_scrap', machine: 'advanced_drone_port_scrap', input: {}, output: { metal_scrap: 1 }, seconds: 4.0 },
  advanced_drone_military_alloy: { id: 'advanced_drone_military_alloy', machine: 'advanced_drone_port', input: {}, output: { rare_alloy: 1 }, seconds: 8.0 },
};

const DRONE_PORT_COMMON = {
  cost: 760,
  category: 'automation',
  color: 0x53646c,
  accepts: [],
  powerUse: 65,
};

const ADVANCED_DRONE_PORT_COMMON = {
  cost: 1450,
  category: 'automation',
  color: 0x465d66,
  accepts: [],
  powerUse: 95,
};

const ASSEMBLER_COMMON = {
  cost: 420,
  category: 'production',
  color: 0x526a66,
  powerUse: 50,
};

const FABRICATOR_COMMON = {
  cost: 1250,
  category: 'production',
  color: 0x596b72,
  powerUse: 110,
};

export const BUILDINGS = {
  hopper: { id: 'hopper', name: '投入ホッパー', cost: 0, category: 'logistics', buildable: false, description: '探索で集めた素材をまとめて投入する、工場ラインのスタート地点。Eでバッグの中身を移せる。', color: 0x6f7a63, accepts: ['raw', 'processed', 'product', 'advanced'] },
  seller: { id: 'seller', name: '販売ターミナル', cost: 90, category: 'sales', buildable: true, description: '届いたアイテムを自動で現金化する。Eでバッグの中身を直接売ることもできる。', color: 0xb98a3d, accepts: ['raw', 'processed', 'product', 'advanced'] },
  crusher: { id: 'crusher', name: '粉砕機', cost: 80, category: 'production', buildable: true, description: '鉄くず1個を2.2秒で破砕金属1個へ加工する。Rank 4以降は稼働時に18 Powerを使用する。', color: 0x8a6b4d, accepts: ['metal_scrap'], recipe: 'crusher_metal', powerUse: 18 },
  smelter: { id: 'smelter', name: '簡易精錬炉', cost: 140, category: 'production', buildable: true, description: '破砕金属1個を3.0秒で鉄インゴット1個へ精錬する。Rank 4以降は稼働時に30 Powerを使用する。', color: 0x7c4f3d, accepts: ['crushed_metal'], recipe: 'smelter_iron', powerUse: 30 },
  assembler: { id: 'assembler', name: 'アセンブラー', buildable: true, description: '高度組立機。Automation ConsoleでControl Unit / 鉄板 / Motor / Circuitの自動Recipeを切り替えられる。', ...ASSEMBLER_COMMON, accepts: ['motor', 'circuit', 'plastic'], recipe: 'assembler_control_unit' },
  assembler_plate: { id: 'assembler_plate', name: 'アセンブラー / 鉄板', buildable: false, description: '鉄インゴットから鉄板を自動製造するAssembler設定。', ...ASSEMBLER_COMMON, accepts: ['iron_ingot'], recipe: 'assembler_iron_plate' },
  assembler_motor: { id: 'assembler_motor', name: 'アセンブラー / モーター', buildable: false, description: '鉄インゴットと銅線から産業モーターを自動製造するAssembler設定。', ...ASSEMBLER_COMMON, accepts: ['iron_ingot', 'copper_wire'], recipe: 'assembler_motor' },
  assembler_circuit: { id: 'assembler_circuit', name: 'アセンブラー / 回路', buildable: false, description: '銅線・電子ジャンク・プラスチックから制御回路を自動製造するAssembler設定。', ...ASSEMBLER_COMMON, accepts: ['copper_wire', 'e_waste', 'plastic'], recipe: 'assembler_circuit' },
  fabricator: { id: 'fabricator', name: 'ファブリケーター', buildable: true, description: 'Rank 7 Experimental Tier専用設備。Automation ConsoleでExperimental部品セットとAutonomous Industrial Core Recipeを切り替えられる。', ...FABRICATOR_COMMON, accepts: ['control_unit', 'rare_alloy', 'circuit', 'iron_plate'], recipe: 'fabricator_experimental_set' },
  fabricator_core: { id: 'fabricator_core', name: 'ファブリケーター / 自律産業コア', buildable: false, description: 'Experimental部品3種とControl UnitからAutonomous Industrial Coreを製造する最終Recipe設定。', ...FABRICATOR_COMMON, accepts: ['ai_control_module', 'experimental_frame', 'experimental_power_module', 'control_unit'], recipe: 'fabricator_autonomous_core' },
  drone_port: { id: 'drone_port', name: 'ドローンポート', buildable: true, description: '確保済みResource PointへUtility Droneを自動派遣するRank 6設備。Automation ConsoleでPortごとに回収先を変更できる。', ...DRONE_PORT_COMMON, recipe: 'drone_military_alloy' },
  drone_port_copper: { id: 'drone_port_copper', name: 'ドローンポート / 銅配線網', buildable: false, description: '住宅街の確保済み銅配線網をUtility Droneで自動回収する。', ...DRONE_PORT_COMMON, recipe: 'drone_residential_copper' },
  drone_port_electronics: { id: 'drone_port_electronics', name: 'ドローンポート / 電子部品庫', buildable: false, description: '廃工場の確保済み電子部品庫をUtility Droneで自動回収する。', ...DRONE_PORT_COMMON, recipe: 'drone_industrial_electronics' },
  advanced_drone_port: { id: 'advanced_drone_port', name: 'アドバンスド・ドローンポート', buildable: true, description: 'Experimental Technologyで解放。攻略済み地域の高密度回収点を含むAdvanced Drone Routeを運用する。', ...ADVANCED_DRONE_PORT_COMMON, recipe: 'advanced_drone_military_alloy' },
  advanced_drone_port_copper: { id: 'advanced_drone_port_copper', name: 'Advanced Drone / 銅配線網', buildable: false, description: '住宅街の銅配線網をAdvanced Droneで高速回収する。', ...ADVANCED_DRONE_PORT_COMMON, recipe: 'advanced_drone_residential_copper' },
  advanced_drone_port_plastic: { id: 'advanced_drone_port_plastic', name: 'Advanced Drone / 樹脂回収区画', buildable: false, description: '攻略済み住宅街の樹脂回収区画からプラスチックを反復回収する。', ...ADVANCED_DRONE_PORT_COMMON, recipe: 'advanced_drone_residential_plastic' },
  advanced_drone_port_electronics: { id: 'advanced_drone_port_electronics', name: 'Advanced Drone / 電子部品庫', buildable: false, description: '廃工場の電子部品庫をAdvanced Droneで高速回収する。', ...ADVANCED_DRONE_PORT_COMMON, recipe: 'advanced_drone_industrial_electronics' },
  advanced_drone_port_scrap: { id: 'advanced_drone_port_scrap', name: 'Advanced Drone / 金属回収ヤード', buildable: false, description: '攻略済み廃工場の金属回収ヤードから鉄くずを反復回収する。', ...ADVANCED_DRONE_PORT_COMMON, recipe: 'advanced_drone_industrial_scrap' },
  conveyor: { id: 'conveyor', name: 'コンベア Mk.1', cost: 12, category: 'logistics', buildable: true, description: '黄色い矢印の方向へ1.5個/秒で搬送する基本ベルト。Rで設置方向を変更し、設置後もEで回転・反転できる。', color: 0x4a555a, accepts: [], throughput: 1.5 },
  conveyor_mk2: { id: 'conveyor_mk2', name: 'コンベア Mk.2', cost: 28, category: 'logistics', buildable: true, description: 'Rank 4で解放される高速ベルト。黄色い矢印の方向へ3個/秒で搬送し、Mk.1の2倍の帯域を持つ。', color: 0x48656b, accepts: [], throughput: 3 },
  conveyor_mk3: { id: 'conveyor_mk3', name: 'コンベア Mk.3', cost: 55, category: 'logistics', buildable: true, description: 'Rank 6高速物流ベルト。黄色い矢印の方向へ6個/秒で搬送する。Priority / Overflow設備の高帯域Line向け。', color: 0x3f6870, accepts: [], throughput: 6 },
  splitter: { id: 'splitter', name: 'スプリッター', cost: 85, category: 'logistics', buildable: true, description: 'Rank 4物流設備。背面1入力を正面・左・右の有効な搬送先へ順番に分配する。最大3個/秒。', color: 0x6b6548, accepts: [], throughput: 3 },
  merger: { id: 'merger', name: 'マージャー', cost: 85, category: 'logistics', buildable: true, description: 'Rank 4物流設備。背面・左・右の3入力を受け、正面1方向へ合流させる。最大3個/秒。', color: 0x65566b, accepts: [], throughput: 3 },
  smart_sorter: { id: 'smart_sorter', name: 'スマートソーター', cost: 180, category: 'logistics', buildable: true, description: 'Rank 5物流設備。背面から受けた素材をカテゴリで自動分類する。高度部品は正面、中間材・製品は左、原料は右へ最大3個/秒で送る。', color: 0x4f6b62, accepts: [], throughput: 3 },
  priority_splitter: { id: 'priority_splitter', name: 'プライオリティ分岐機', cost: 260, category: 'logistics', buildable: true, description: 'Rank 6物流設備。背面1入力を正面Priority Lineへ最優先で送り、正面が詰まった時だけ左右Backup Lineへ流す。最大6個/秒。', color: 0x556d52, accepts: [], throughput: 6 },
  overflow_splitter: { id: 'overflow_splitter', name: 'オーバーフロー分岐機', cost: 240, category: 'logistics', buildable: true, description: 'Rank 6物流設備。背面1入力を正面Main Lineへ送り、Main Lineが受け取れない時だけ右Overflow Lineへ余剰を流す。最大6個/秒。', color: 0x6e5c4b, accepts: [], throughput: 6 },
  storage: { id: 'storage', name: '小型倉庫', cost: 60, category: 'logistics', buildable: true, description: '自動ラインの途中で最大120個を保管する中間バッファ。満杯になると上流を止め、Itemを消失させない。', color: 0x52616c, accepts: ['raw', 'processed', 'product', 'advanced'], storageCapacity: 120 },
  industrial_storage: { id: 'industrial_storage', name: '産業倉庫', cost: 240, category: 'logistics', buildable: true, description: 'Rank 5向け大容量Storage。最大600個を保管する。Rank 6ではAutomation Consoleから中身を維持したまま物流倉庫へUpgradeできる。', color: 0x435660, accepts: ['raw', 'processed', 'product', 'advanced'], storageCapacity: 600 },
  logistics_warehouse: { id: 'logistics_warehouse', name: '物流倉庫', cost: 620, category: 'logistics', buildable: true, description: 'Rank 6の高密度Storage。最大1800個を保管し、大規模物流のBufferとして使う。', color: 0x3d5159, accepts: ['raw', 'processed', 'product', 'advanced'], storageCapacity: 1800 },
  generator: { id: 'generator', name: 'スクラップ発電機', cost: 260, category: 'power', buildable: true, description: '鉄くず1個を燃料として24秒稼働し、80 Powerを供給するRank 4向け発電設備。', color: 0x7a6242, accepts: ['metal_scrap'], powerGeneration: 80, powerFuelItem: 'metal_scrap', powerFuelSeconds: 24 },
  industrial_generator: { id: 'industrial_generator', name: '産業発電機', cost: 680, category: 'power', buildable: true, description: 'Rank 6 Advanced Power設備。鉄くず1個を24秒利用し、180 Powerを安定供給する大容量Generator。', color: 0x5f6448, accepts: ['metal_scrap'], powerGeneration: 180, powerFuelItem: 'metal_scrap', powerFuelSeconds: 24 },
  experimental_power_system: { id: 'experimental_power_system', name: '実験電力システム', cost: 1900, category: 'power', buildable: true, description: 'Experimental Technologyで解放。軍用レア合金1個を24秒利用し、480 Powerを供給する最終Tier発電設備。自動Drone供給向け。', color: 0x4f586e, accepts: ['rare_alloy'], powerGeneration: 480, powerFuelItem: 'rare_alloy', powerFuelSeconds: 24 },
  power_pole: { id: 'power_pole', name: '電力ポール', cost: 45, category: 'power', buildable: true, description: 'Starter Gridや発電機から電力網を延長し、周囲10mの設備へ給電する。ポール同士は12.5m以内で接続する。', color: 0x59605f, accepts: [] },
  battery: { id: 'battery', name: 'グリッドバッテリー', cost: 220, category: 'power', buildable: true, description: 'Grid Storage研究で解放。余剰電力を自動充電し、発電不足時に最大80 Powerを自動放電する。', color: 0x52636f, accepts: [], powerStorageCapacity: 960, powerChargeRate: 60, powerDischargeRate: 80 },
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
  'crusher', 'smelter', 'conveyor', 'storage', 'seller',
  'conveyor_mk2', 'splitter', 'merger', 'smart_sorter',
  'conveyor_mk3', 'priority_splitter', 'overflow_splitter',
  'generator', 'industrial_generator', 'power_pole', 'battery',
  'industrial_storage', 'logistics_warehouse', 'assembler', 'drone_port', 'fabricator',
  'advanced_drone_port', 'experimental_power_system',
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

export function snapToGrid(value) { return Math.round(value / GRID_SIZE) * GRID_SIZE; }
export function positionKey(x, z) { return `${Math.round(x / GRID_SIZE)},${Math.round(z / GRID_SIZE)}`; }
export function itemCount(inventory) { return Object.values(inventory).reduce((sum, amount) => sum + Number(amount || 0), 0); }
export function usedSlots(inventory) {
  return Object.entries(inventory).reduce((sum, [id, amount]) => {
    const def = ITEMS[id];
    if (!def || amount <= 0) return sum;
    return sum + Math.ceil(amount / def.stack);
  }, 0);
}