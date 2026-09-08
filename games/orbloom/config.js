export const RESOURCE_ORDER = ['matter', 'water', 'oxygen', 'energy'];

export const RESOURCES = {
  matter: { id: 'matter', name: 'Matter', short: 'MAT', unlockStage: 0, baseRate: 0.72, baseCost: 10, color: '#d6b78a' },
  water: { id: 'water', name: 'Water', short: 'H₂O', unlockStage: 1, baseRate: 0.32, baseCost: 22, color: '#72bce8' },
  oxygen: { id: 'oxygen', name: 'Oxygen', short: 'O₂', unlockStage: 2, baseRate: 0.17, baseCost: 42, color: '#87d5a2' },
  energy: { id: 'energy', name: 'Energy', short: 'ENG', unlockStage: 3, baseRate: 0.085, baseCost: 88, color: '#d6b8ff' },
};

export const PLANET_STAGES = [
  {
    id: 'dead-rock', name: 'Dead Rock', kicker: 'A WORLD WITHOUT LIFE',
    description: '冷えた岩塊。Matterを集め、最初の自動生成を作る。',
    cost: {}, requirements: {},
    palette: { land: 0x625d5b, accent: 0x8b8075, ocean: 0x23425a, atmosphere: 0x33495f, crystal: 0x7f6b9e },
  },
  {
    id: 'primitive', name: 'Primitive Planet', kicker: 'WATER AWAKENS',
    description: '氷と鉱物の循環が始まり、水とOcean biomeが解放される。',
    cost: { matter: 250 }, requirements: { generatorLevels: 4 },
    palette: { land: 0x7c6a56, accent: 0xb18d61, ocean: 0x317da7, atmosphere: 0x4c809a, crystal: 0x8272a5 },
  },
  {
    id: 'atmosphere', name: 'Atmosphere Planet', kicker: 'THE SKY FORMS',
    description: '空と雲が生まれ、OxygenとForest biomeが解放される。',
    cost: { matter: 8000, water: 1500 }, requirements: { biomeLevel: { rocky: 6, ocean: 3 }, species: 2 },
    palette: { land: 0x70805c, accent: 0x96a873, ocean: 0x2d86b0, atmosphere: 0x65a8c9, crystal: 0x9075bd },
  },
  {
    id: 'living', name: 'Living Planet', kicker: 'LIFE TAKES HOLD',
    description: '生態系が自走し始め、Energy・Crystal Field・Expeditionが解放される。',
    cost: { matter: 100000, water: 35000, oxygen: 8000 }, requirements: { biomeLevel: { forest: 4 }, species: 4, research: 2 },
    palette: { land: 0x547853, accent: 0x78a85e, ocean: 0x2585b5, atmosphere: 0x62afd2, crystal: 0x9a7ad1 },
  },
  {
    id: 'resonant', name: 'Resonant World', kicker: 'CRYSTAL RESONANCE',
    description: '生命と結晶Energyが結びつき、世界全体の成長が加速する。',
    cost: { matter: 2000000, water: 600000, oxygen: 180000, energy: 25000 }, requirements: { biomeLevel: { crystal: 5 }, research: 5, evolvedSpecies: 1 },
    palette: { land: 0x3f7657, accent: 0x6ca772, ocean: 0x2d7fb4, atmosphere: 0x6b9fca, crystal: 0xb988ea },
  },
  {
    id: 'advanced', name: 'Advanced Ecosystem', kicker: 'SYSTEMS IN BALANCE',
    description: '複数BiomeとSpeciesが相互に支え合う高度な生態圏。',
    cost: { matter: 50000000, water: 15000000, oxygen: 5000000, energy: 1000000 }, requirements: { research: 9, evolvedSpecies: 3, rare: { lunarShard: 1 }, ecosystems: 2 },
    palette: { land: 0x34715b, accent: 0x55b77c, ocean: 0x246aa8, atmosphere: 0x7a91d2, crystal: 0xd292ff },
  },
  {
    id: 'stable', name: 'Stable Living World', kicker: 'ORBLOOM',
    description: 'Matter・Water・Oxygen・Energyが安定循環する完成された生きた惑星。',
    cost: { matter: 1000000000, water: 250000000, oxygen: 100000000, energy: 25000000 }, requirements: { research: 12, evolvedSpecies: 5, rare: { signalSeed: 1 }, ecosystems: 3 },
    palette: { land: 0x25715a, accent: 0x62d79d, ocean: 0x2864b7, atmosphere: 0x8f87de, crystal: 0xe6a6ff },
  },
];

export const BIOMES = {
  rocky: {
    id: 'rocky', name: 'Rocky Zone', unlockStage: 0, resource: 'matter',
    description: '鉱物・地殻・基礎Matterの生産域。', baseCost: 45,
    milestones: [5, 10, 20], evolutionNames: ['Fractured Basin', 'Mineral Crown'],
  },
  ocean: {
    id: 'ocean', name: 'Ocean', unlockStage: 1, resource: 'water',
    description: '水循環と初期生命を育てる海洋域。', baseCost: 90,
    milestones: [5, 10, 20], evolutionNames: ['Blue Shelf', 'Deep Current'],
  },
  forest: {
    id: 'forest', name: 'Forest', unlockStage: 2, resource: 'oxygen',
    description: 'OxygenとSpecies成長を支える生態域。', baseCost: 160,
    milestones: [5, 10, 20], evolutionNames: ['Green Belt', 'Ancient Canopy'],
  },
  crystal: {
    id: 'crystal', name: 'Crystal Field', unlockStage: 3, resource: 'energy',
    description: '高密度EnergyとResearchを増幅する結晶域。', baseCost: 300,
    milestones: [5, 10, 20], evolutionNames: ['Resonant Vein', 'Astral Lattice'],
  },
};

export const SPECIES = [
  { id: 'dustmite', name: 'Dustmite', unlockStage: 1, preferredBiome: 'rocky', role: 'matter', resource: 'matter', baseProduction: 1.8, evolveCost: { matter: 18000 }, description: '岩肌の微細鉱物を集めMatterへ変える。' },
  { id: 'pebbleback', name: 'Pebbleback', unlockStage: 1, preferredBiome: 'rocky', role: 'global', globalMultiplier: 0.04, evolveCost: { matter: 42000 }, description: '地殻を安定させ、惑星全体の生産を少し底上げする。' },
  { id: 'tidefin', name: 'Tidefin', unlockStage: 1, preferredBiome: 'ocean', role: 'water', resource: 'water', baseProduction: 1.2, evolveCost: { water: 16000 }, description: '潮流を作り、Water循環を加速する。' },
  { id: 'mistwing', name: 'Mistwing', unlockStage: 2, preferredBiome: 'ocean', role: 'expedition-speed', resource: 'water', baseProduction: 0.7, expeditionSpeed: 0.08, evolveCost: { water: 38000 }, description: '大気と海を渡る。Expedition時間も短縮する。' },
  { id: 'mossling', name: 'Mossling', unlockStage: 2, preferredBiome: 'forest', role: 'oxygen', resource: 'oxygen', baseProduction: 0.65, evolveCost: { oxygen: 14000 }, description: '地表を覆いOxygenを安定供給する。' },
  { id: 'sporefox', name: 'Sporefox', unlockStage: 2, preferredBiome: 'forest', role: 'mutation', resource: 'oxygen', baseProduction: 0.35, mutationBonus: 0.02, evolveCost: { oxygen: 42000 }, description: '胞子を運び、Rare Mutation発見率を高める。' },
  { id: 'sunmoth', name: 'Sunmoth', unlockStage: 3, preferredBiome: 'crystal', role: 'energy', resource: 'energy', baseProduction: 0.42, evolveCost: { energy: 12000 }, description: '恒星光と結晶をEnergyへ変換する。' },
  { id: 'crystalhare', name: 'Crystalhare', unlockStage: 3, preferredBiome: 'crystal', role: 'research', resource: 'energy', baseProduction: 0.2, researchDiscount: 0.025, evolveCost: { energy: 30000 }, description: '結晶共鳴を読み、Research costを少し下げる。' },
  { id: 'lumenwhale', name: 'Lumenwhale', unlockStage: 4, preferredBiome: 'ocean', role: 'offline', globalMultiplier: 0.06, offlineBonus: 0.04, evolveCost: { water: 900000, energy: 120000 }, description: '惑星規模の循環を保ち、Offline生産を支える。' },
  { id: 'grovekeeper', name: 'Grovekeeper', unlockStage: 4, preferredBiome: 'forest', role: 'growth', speciesGrowth: 0.18, globalMultiplier: 0.03, evolveCost: { oxygen: 600000, energy: 90000 }, description: '他Speciesの成長速度を高める。' },
  { id: 'shardbeetle', name: 'Shardbeetle', unlockStage: 4, preferredBiome: 'rocky', role: 'expedition-mineral', resource: 'matter', baseProduction: 9, expeditionMineral: 0.2, evolveCost: { matter: 12000000, energy: 400000 }, description: '希少鉱物に反応し、Mineral Searchを強化する。' },
  { id: 'aetherowl', name: 'Aetherowl', unlockStage: 5, preferredBiome: 'crystal', role: 'expedition-rare', globalMultiplier: 0.08, expeditionRare: 0.22, evolveCost: { energy: 3000000, oxygen: 900000 }, description: '未知信号を読み、Rare Life / Artifact探索を強化する。' },
];

export const RESEARCH = [
  { id: 'p-geology', branch: 'planetology', name: 'Deep Geology', unlockStage: 2, cost: { matter: 5000 }, effect: 'Matter production ×1.25', modifiers: { resourceMultiplier: { matter: 1.25 } } },
  { id: 'p-hydrology', branch: 'planetology', name: 'Hydrologic Cycle', unlockStage: 2, cost: { matter: 14000, water: 4200 }, requires: ['p-geology'], effect: 'Water production ×1.40', modifiers: { resourceMultiplier: { water: 1.4 } } },
  { id: 'p-ecosphere', branch: 'planetology', name: 'Ecosphere Mapping', unlockStage: 2, cost: { water: 18000, oxygen: 6500 }, requires: ['p-hydrology'], effect: 'Biome production +25%', modifiers: { biomeMultiplier: 1.25 } },
  { id: 'p-engineering', branch: 'planetology', name: 'Planet Engineering', unlockStage: 3, cost: { oxygen: 42000, energy: 6000 }, requires: ['p-ecosphere'], effect: 'Planet Evolution cost -15%', modifiers: { evolutionCost: 0.85 } },
  { id: 'p-resonance', branch: 'planetology', name: 'Global Resonance', unlockStage: 4, cost: { energy: 28000, oxygen: 90000 }, requires: ['p-engineering'], effect: 'All production ×1.50', modifiers: { globalMultiplier: 1.5 } },
  { id: 'p-capacity', branch: 'planetology', name: 'Habitat Capacity', unlockStage: 4, cost: { energy: 150000, water: 300000 }, requires: ['p-resonance'], effect: 'All biomes +1 Species slot', modifiers: { speciesSlots: 1 } },
  { id: 'p-stabilization', branch: 'planetology', name: 'World Stabilization', unlockStage: 5, cost: { energy: 1200000, oxygen: 3500000 }, requires: ['p-capacity'], effect: 'All production ×2.00', modifiers: { globalMultiplier: 2 } },

  { id: 'b-growth', branch: 'biology', name: 'Adaptive Growth', unlockStage: 2, cost: { oxygen: 2500, water: 8000 }, effect: 'Species growth +30%', modifiers: { speciesGrowth: 1.3 } },
  { id: 'b-affinity', branch: 'biology', name: 'Biome Affinity', unlockStage: 2, cost: { oxygen: 9000, matter: 22000 }, requires: ['b-growth'], effect: 'Preferred biome bonus strengthened', modifiers: { affinityBonus: 0.18 } },
  { id: 'b-mutation', branch: 'biology', name: 'Mutation Survey', unlockStage: 3, cost: { oxygen: 36000, energy: 4500 }, requires: ['b-affinity'], effect: 'Rare Mutation chance +4%', modifiers: { mutationChance: 0.04 } },
  { id: 'b-slots', branch: 'biology', name: 'Habitat Expansion', unlockStage: 3, cost: { oxygen: 120000, water: 280000 }, requires: ['b-affinity'], effect: 'All biomes +1 Species slot', modifiers: { speciesSlots: 1 } },
  { id: 'b-evolution', branch: 'biology', name: 'Directed Evolution', unlockStage: 4, cost: { energy: 90000, oxygen: 260000 }, requires: ['b-mutation'], effect: 'Species Evolution cost -20%', modifiers: { speciesEvolutionCost: 0.8 } },
  { id: 'b-symbiosis', branch: 'biology', name: 'Symbiotic Networks', unlockStage: 4, cost: { energy: 340000, oxygen: 900000 }, requires: ['b-slots', 'b-evolution'], effect: 'Ecosystem bonuses ×1.5', modifiers: { ecosystemMultiplier: 1.5 } },
  { id: 'b-adaptation', branch: 'biology', name: 'Universal Adaptation', unlockStage: 5, cost: { energy: 1800000, oxygen: 6500000 }, requires: ['b-symbiosis'], effect: 'Non-preferred placement penalty reduced', modifiers: { offAffinity: 0.92 } },

  { id: 'a-harvest', branch: 'automation', name: 'Auto Harvest', unlockStage: 2, cost: { matter: 12000, water: 5000 }, effect: 'Unlock Matter auto-buy toggle', unlock: 'autoMatter' },
  { id: 'a-offline', branch: 'automation', name: 'Offline Relay', unlockStage: 2, cost: { oxygen: 6500, matter: 24000 }, requires: ['a-harvest'], effect: 'Offline efficiency 65%', modifiers: { offlineEfficiency: 0.65 } },
  { id: 'a-duration', branch: 'automation', name: 'Deep Storage', unlockStage: 3, cost: { energy: 8500, matter: 80000 }, requires: ['a-offline'], effect: 'Offline cap 6 hours', modifiers: { offlineHours: 6 } },
  { id: 'a-expand', branch: 'automation', name: 'Legacy Auto-Buy', unlockStage: 4, cost: { energy: 80000, oxygen: 190000 }, requires: ['a-duration'], effect: 'Unlock auto-buy for older resources', unlock: 'autoAll' },
  { id: 'a-expedition', branch: 'automation', name: 'Trajectory Solver', unlockStage: 4, cost: { energy: 280000, matter: 1200000 }, requires: ['a-expand'], effect: 'Expedition duration -20%', modifiers: { expeditionSpeed: 0.2 } },
  { id: 'a-master', branch: 'automation', name: 'Autonomous Biosphere', unlockStage: 5, cost: { energy: 2200000, oxygen: 4800000 }, requires: ['a-expedition'], effect: 'Offline 85% / 12h, all production ×1.25', modifiers: { offlineEfficiency: 0.85, offlineHours: 12, globalMultiplier: 1.25 } },
];

export const EXPEDITIONS = [
  { id: 'moon', name: 'Small Moon', unlockStage: 3, duration: 90, description: '近傍衛星。初めてのRare Materialを安全に探せる。', rewards: { matter: 160000, water: 45000 }, rare: 'lunarShard', rareChance: 0.42 },
  { id: 'belt', name: 'Asteroid Belt', unlockStage: 4, duration: 180, description: '鉱物密度が高い。Mineral Search向け。', rewards: { matter: 2200000, energy: 80000 }, rare: 'lunarShard', rareChance: 0.52 },
  { id: 'satellite', name: 'Ancient Satellite', unlockStage: 4, duration: 300, description: '古い文明痕跡。ArtifactとSpecies signalを探す。', rewards: { oxygen: 900000, energy: 260000 }, rare: 'ancientCore', rareChance: 0.48 },
  { id: 'signal', name: 'Unknown Signal', unlockStage: 5, duration: 480, description: 'Stable Living Worldへ必要な最後の信号源。', rewards: { matter: 18000000, energy: 2500000 }, rare: 'signalSeed', rareChance: 1 },
];

export const MUTATIONS = [
  { id: 'normal', name: 'Normal', multiplier: 1 },
  { id: 'golden', name: 'Golden', multiplier: 1.35 },
  { id: 'crystal', name: 'Crystal', multiplier: 1.65 },
];

export const BRANCH_LABELS = {
  planetology: 'Planetology', biology: 'Biology', automation: 'Automation',
};

export const FOCUS_LABELS = {
  mineral: 'Mineral Search', life: 'Rare Life Search', artifact: 'Artifact Search',
};

export function resourceUnlocked(resourceId, stage) {
  return (RESOURCES[resourceId]?.unlockStage ?? Infinity) <= stage;
}

export function biomeUnlocked(biomeId, stage) {
  return (BIOMES[biomeId]?.unlockStage ?? Infinity) <= stage;
}

export function generatorCost(resourceId, level) {
  const resource = RESOURCES[resourceId];
  return resource.baseCost * Math.pow(1.255, Math.max(0, level));
}

export function biomeUpgradeCost(biomeId, level) {
  const biome = BIOMES[biomeId];
  return biome.baseCost * Math.pow(1.31, Math.max(0, level));
}

export function biomeEvolutionCost(biomeId, evolution) {
  const biome = BIOMES[biomeId];
  return biome.baseCost * 28 * Math.pow(9, Math.max(0, evolution));
}

export function speciesLevelFromXp(xp) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, Number(xp || 0)) / 28)) + 1);
}

export function speciesXpForLevel(level) {
  return Math.pow(Math.max(0, level - 1), 2) * 28;
}
