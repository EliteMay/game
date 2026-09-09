export const GAME_VERSION = '0.1.0';
export const SAVE_SCHEMA_VERSION = 1;
export const SAVE_KEY = 'gameHub.farmUp.save';
export const RECOVERY_KEY = 'gameHub.farmUp.recovery';

export const FARM_LEVEL_THRESHOLDS = Array.from({ length: 30 }, (_, index) => {
  if (index === 0) return 0;
  return Math.round(40 * index + 20 * index * index);
});

export const CROPS = [
  { id: 'wheat', name: '小麦', shortName: 'WHEAT', unlockLevel: 1, seedCost: 8, sellPrice: 24, growthMs: 18000, xp: 9, color: 0xd7bd58, accent: '#e3c860', season: 'spring' },
  { id: 'carrot', name: 'にんじん', shortName: 'CARROT', unlockLevel: 2, seedCost: 14, sellPrice: 40, growthMs: 24000, xp: 13, color: 0xe77d2f, accent: '#f09445', season: 'spring' },
  { id: 'corn', name: 'とうもろこし', shortName: 'CORN', unlockLevel: 3, seedCost: 24, sellPrice: 70, growthMs: 32000, xp: 18, color: 0xe7d24b, accent: '#f4df63', season: 'summer' },
  { id: 'strawberry', name: 'いちご', shortName: 'STRAWBERRY', unlockLevel: 4, seedCost: 38, sellPrice: 112, growthMs: 42000, xp: 26, color: 0xd84b50, accent: '#ec6468', season: 'spring' },
];

export const TOOLS = [
  { id: 'hoe', name: 'クワ', key: '1' },
  { id: 'seed', name: '種まき', key: '2' },
  { id: 'water', name: 'じょうろ', key: '3' },
  { id: 'harvest', name: '収穫', key: '4' },
];

export const LAND = { initialWidth: 4, initialDepth: 4, expandedWidth: 7, expandedDepth: 4, expansionCost: 500, expansionXp: 65 };
export const TOOL_UPGRADE = { cost: 360, xp: 35, maxLevel: 2 };

export const TUTORIAL_STEPS = [
  { id: 'move', label: 'WASDで農場を歩く', detail: '少し移動して操作感を確認する。' },
  { id: 'till', label: '畑を耕す', detail: '1でクワを選び、中央の照準で畑を見てE。' },
  { id: 'plant', label: '小麦を植える', detail: '2で種まき。耕した土へE。' },
  { id: 'water', label: '水をやる', detail: '3でじょうろ。植えた区画へE。' },
  { id: 'harvest', label: '小麦を収穫する', detail: '育ったら4で収穫。' },
  { id: 'ship', label: '出荷箱へ納品する', detail: '赤い出荷箱へ近づいてE。' },
  { id: 'expand', label: '土地を1回拡張する', detail: 'HUDの土地拡張から新区画を購入。' },
];

export const WEATHER = [
  { id: 'sunny', name: '晴れ', icon: 'SUN' },
  { id: 'cloudy', name: '曇り', icon: 'CLOUD' },
  { id: 'rain', name: '雨', icon: 'RAIN' },
  { id: 'heavy-rain', name: '大雨', icon: 'RAIN+' },
];

export const SEASONS = [
  { id: 'spring', name: '春' },
  { id: 'summer', name: '夏' },
  { id: 'autumn', name: '秋' },
  { id: 'winter', name: '冬' },
];
