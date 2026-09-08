import {
  BIOMES,
  EXPEDITIONS,
  MUTATIONS,
  PLANET_STAGES,
  RESEARCH,
  RESOURCES,
  RESOURCE_ORDER,
  SPECIES,
  biomeUnlocked,
  generatorCost,
  resourceUnlocked,
  speciesLevelFromXp,
} from './config.js';

const researchMap = new Map(RESEARCH.map((entry) => [entry.id, entry]));
const speciesMap = new Map(SPECIES.map((entry) => [entry.id, entry]));
const mutationMap = new Map(MUTATIONS.map((entry) => [entry.id, entry]));

export const ECOSYSTEM_COMBOS = {
  rocky: [['dustmite', 'pebbleback'], ['dustmite', 'shardbeetle']],
  ocean: [['tidefin', 'mistwing'], ['tidefin', 'lumenwhale']],
  forest: [['mossling', 'sporefox'], ['mossling', 'grovekeeper']],
  crystal: [['sunmoth', 'crystalhare'], ['crystalhare', 'aetherowl']],
};

export function canAfford(state, cost = {}) {
  return Object.entries(cost).every(([id, amount]) => Number(state.resources?.[id] || 0) >= Number(amount || 0));
}

export function spendResources(state, cost = {}) {
  if (!canAfford(state, cost)) return false;
  for (const [id, amount] of Object.entries(cost)) state.resources[id] = Math.max(0, Number(state.resources[id] || 0) - Number(amount || 0));
  return true;
}

export function researchModifiers(state) {
  const modifiers = {
    globalMultiplier: 1,
    biomeMultiplier: 1,
    evolutionCost: 1,
    speciesEvolutionCost: 1,
    speciesGrowth: 1,
    affinityBonus: 0.12,
    offAffinity: 0.72,
    mutationChance: 0.012,
    speciesSlots: 0,
    offlineEfficiency: 0.5,
    offlineHours: 2,
    expeditionSpeed: 0,
    resourceMultiplier: Object.fromEntries(RESOURCE_ORDER.map((id) => [id, 1])),
    unlocks: new Set(),
  };
  for (const id of state.research || []) {
    const research = researchMap.get(id);
    if (!research) continue;
    const m = research.modifiers || {};
    if (m.globalMultiplier) modifiers.globalMultiplier *= m.globalMultiplier;
    if (m.biomeMultiplier) modifiers.biomeMultiplier *= m.biomeMultiplier;
    if (m.evolutionCost) modifiers.evolutionCost *= m.evolutionCost;
    if (m.speciesEvolutionCost) modifiers.speciesEvolutionCost *= m.speciesEvolutionCost;
    if (m.speciesGrowth) modifiers.speciesGrowth *= m.speciesGrowth;
    if (m.affinityBonus) modifiers.affinityBonus += m.affinityBonus;
    if (m.offAffinity) modifiers.offAffinity = Math.max(modifiers.offAffinity, m.offAffinity);
    if (m.mutationChance) modifiers.mutationChance += m.mutationChance;
    if (m.speciesSlots) modifiers.speciesSlots += m.speciesSlots;
    if (m.offlineEfficiency) modifiers.offlineEfficiency = Math.max(modifiers.offlineEfficiency, m.offlineEfficiency);
    if (m.offlineHours) modifiers.offlineHours = Math.max(modifiers.offlineHours, m.offlineHours);
    if (m.expeditionSpeed) modifiers.expeditionSpeed += m.expeditionSpeed;
    for (const [rid, value] of Object.entries(m.resourceMultiplier || {})) modifiers.resourceMultiplier[rid] *= value;
    if (research.unlock) modifiers.unlocks.add(research.unlock);
  }
  return modifiers;
}

export function speciesModifiers(state) {
  const modifiers = { globalMultiplier: 1, offlineBonus: 0, researchDiscount: 0, expeditionSpeed: 0, expeditionMineral: 0, expeditionRare: 0, mutationBonus: 0, speciesGrowth: 0 };
  for (const species of SPECIES) {
    const slot = state.species?.[species.id];
    if (!slot?.discovered || !slot.biomeId) continue;
    const level = speciesLevelFromXp(slot.xp);
    const evolved = slot.evolved ? 1.7 : 1;
    const mutation = mutationMap.get(slot.mutation)?.multiplier || 1;
    const scale = (1 + (level - 1) * 0.045) * evolved * mutation;
    if (species.globalMultiplier) modifiers.globalMultiplier *= 1 + species.globalMultiplier * scale;
    if (species.offlineBonus) modifiers.offlineBonus += species.offlineBonus * scale;
    if (species.researchDiscount) modifiers.researchDiscount += species.researchDiscount * scale;
    if (species.expeditionSpeed) modifiers.expeditionSpeed += species.expeditionSpeed * scale;
    if (species.expeditionMineral) modifiers.expeditionMineral += species.expeditionMineral * scale;
    if (species.expeditionRare) modifiers.expeditionRare += species.expeditionRare * scale;
    if (species.mutationBonus) modifiers.mutationBonus += species.mutationBonus * scale;
    if (species.speciesGrowth) modifiers.speciesGrowth += species.speciesGrowth * scale;
  }
  return modifiers;
}

export function countEcosystems(state) {
  let count = 0;
  for (const [biomeId, combos] of Object.entries(ECOSYSTEM_COMBOS)) {
    if (!biomeUnlocked(biomeId, state.planetStage)) continue;
    if (combos.some((combo) => combo.every((id) => state.species?.[id]?.discovered && state.species?.[id]?.biomeId === biomeId))) count += 1;
  }
  return count;
}

export function biomeSpeciesSlots(state, biomeId) {
  const modifiers = researchModifiers(state);
  const level = Number(state.biomes?.[biomeId]?.level || 0);
  return 2 + Math.floor(level / 10) + modifiers.speciesSlots;
}

export function productionRates(state) {
  const research = researchModifiers(state);
  const speciesMods = speciesModifiers(state);
  const ecosystemCount = countEcosystems(state);
  const ecosystemMultiplier = 1 + ecosystemCount * 0.08 * (state.research?.includes('b-symbiosis') ? 1.5 : 1);
  const rates = Object.fromEntries(RESOURCE_ORDER.map((id) => [id, 0]));

  for (const id of RESOURCE_ORDER) {
    if (!resourceUnlocked(id, state.planetStage)) continue;
    const generatorLevel = Number(state.generators?.[id] || 0);
    if (generatorLevel <= 0) continue;
    const resource = RESOURCES[id];
    const biome = Object.values(BIOMES).find((entry) => entry.resource === id);
    const biomeState = biome ? state.biomes?.[biome.id] : null;
    const biomeLevel = Math.max(0, Number(biomeState?.level || 0));
    const biomeEvolution = Math.max(0, Number(biomeState?.evolution || 0));
    const generatorMilestone = Math.pow(1.6, Math.floor(generatorLevel / 10));
    const stageMultiplier = Math.pow(1.62, Math.max(0, state.planetStage));
    const biomeMultiplier = (1 + biomeLevel * 0.055) * Math.pow(1.65, biomeEvolution) * research.biomeMultiplier;
    rates[id] += resource.baseRate * generatorLevel * generatorMilestone * stageMultiplier * biomeMultiplier;
  }

  for (const species of SPECIES) {
    const slot = state.species?.[species.id];
    if (!slot?.discovered || !slot.biomeId || !species.resource || !resourceUnlocked(species.resource, state.planetStage)) continue;
    const level = speciesLevelFromXp(slot.xp);
    const evolved = slot.evolved ? 2.1 : 1;
    const mutation = mutationMap.get(slot.mutation)?.multiplier || 1;
    const affinity = slot.biomeId === species.preferredBiome ? 1 + research.affinityBonus : research.offAffinity;
    rates[species.resource] += species.baseProduction * level * evolved * mutation * affinity * Math.pow(1.35, state.planetStage);
  }

  for (const id of RESOURCE_ORDER) {
    rates[id] *= research.resourceMultiplier[id] * research.globalMultiplier * speciesMods.globalMultiplier * ecosystemMultiplier;
  }
  return rates;
}

export function manualMatterGain(state) {
  const rate = productionRates(state).matter;
  return Math.max(1, 1 + Math.floor(state.planetStage * 1.4) + Math.floor(Math.sqrt(rate + 1) * 0.22));
}

export function effectivePlanetCost(state, stageIndex = state.planetStage + 1) {
  const stage = PLANET_STAGES[stageIndex];
  if (!stage) return {};
  const discount = researchModifiers(state).evolutionCost;
  return Object.fromEntries(Object.entries(stage.cost || {}).map(([id, value]) => [id, Math.ceil(value * discount)]));
}

function sumGeneratorLevels(state) {
  return RESOURCE_ORDER.reduce((sum, id) => sum + Number(state.generators?.[id] || 0), 0);
}

export function planetEvolutionStatus(state) {
  const nextIndex = state.planetStage + 1;
  const stage = PLANET_STAGES[nextIndex];
  if (!stage) return { canEvolve: false, complete: true, missing: ['Stable Living World reached'], cost: {} };
  const missing = [];
  const cost = effectivePlanetCost(state, nextIndex);
  for (const [id, value] of Object.entries(cost)) if (Number(state.resources?.[id] || 0) < value) missing.push(`${RESOURCES[id].name} ${formatShort(value)}`);
  const req = stage.requirements || {};
  if (req.generatorLevels && sumGeneratorLevels(state) < req.generatorLevels) missing.push(`Generator Lv total ${req.generatorLevels}`);
  for (const [biomeId, level] of Object.entries(req.biomeLevel || {})) if (Number(state.biomes?.[biomeId]?.level || 0) < level) missing.push(`${BIOMES[biomeId].name} Lv.${level}`);
  const discovered = SPECIES.filter((entry) => state.species?.[entry.id]?.discovered).length;
  const evolved = SPECIES.filter((entry) => state.species?.[entry.id]?.evolved).length;
  if (req.species && discovered < req.species) missing.push(`Species ${req.species}`);
  if (req.research && (state.research?.length || 0) < req.research) missing.push(`Research ${req.research}`);
  if (req.evolvedSpecies && evolved < req.evolvedSpecies) missing.push(`Evolved Species ${req.evolvedSpecies}`);
  if (req.ecosystems && countEcosystems(state) < req.ecosystems) missing.push(`Ecosystem ${req.ecosystems}`);
  for (const [id, amount] of Object.entries(req.rare || {})) if (Number(state.rareMaterials?.[id] || 0) < amount) missing.push(`${rareLabel(id)} ×${amount}`);
  return { canEvolve: missing.length === 0, complete: false, missing, cost, stage };
}

export function researchStatus(state, researchId) {
  const research = researchMap.get(researchId);
  if (!research) return { available: false, reason: 'Unknown Research' };
  if (state.research?.includes(researchId)) return { available: false, completed: true, reason: 'Completed' };
  if (state.planetStage < research.unlockStage) return { available: false, reason: `${PLANET_STAGES[research.unlockStage].name}で解放` };
  const missingPrereq = (research.requires || []).find((id) => !state.research?.includes(id));
  if (missingPrereq) return { available: false, reason: `${researchMap.get(missingPrereq)?.name || missingPrereq} が必要` };
  const discount = Math.max(0.7, 1 - speciesModifiers(state).researchDiscount);
  const cost = Object.fromEntries(Object.entries(research.cost).map(([id, value]) => [id, Math.ceil(value * discount)]));
  if (!canAfford(state, cost)) return { available: false, reason: '資源不足', cost };
  return { available: true, cost };
}

export function effectiveSpeciesEvolutionCost(state, speciesId) {
  const species = speciesMap.get(speciesId);
  if (!species) return {};
  const factor = researchModifiers(state).speciesEvolutionCost;
  return Object.fromEntries(Object.entries(species.evolveCost || {}).map(([id, value]) => [id, Math.ceil(value * factor)]));
}

export function offlineConfig(state) {
  const research = researchModifiers(state);
  const species = speciesModifiers(state);
  return {
    efficiency: Math.min(0.95, research.offlineEfficiency + species.offlineBonus),
    maxSeconds: research.offlineHours * 3600,
  };
}

export function expeditionDuration(state, expedition, speciesId) {
  const research = researchModifiers(state);
  const species = speciesModifiers(state);
  const assigned = speciesMap.get(speciesId);
  let speed = research.expeditionSpeed + species.expeditionSpeed;
  if (assigned?.role === 'expedition-speed') speed += assigned.expeditionSpeed || 0;
  return Math.max(20, Math.round(expedition.duration * Math.max(0.45, 1 - speed)));
}

export function calculateExpeditionReward(state, expeditionId, focus, speciesId, randomValue = Math.random()) {
  const expedition = EXPEDITIONS.find((entry) => entry.id === expeditionId);
  if (!expedition) return null;
  const assigned = speciesMap.get(speciesId);
  const speciesMods = speciesModifiers(state);
  const focusResourceMultiplier = focus === 'mineral' ? 1.35 : focus === 'life' ? 1.12 : 1.18;
  const resources = Object.fromEntries(Object.entries(expedition.rewards || {}).map(([id, value]) => [id, Math.floor(value * focusResourceMultiplier)]));
  let rareChance = expedition.rareChance || 0;
  if (focus === 'artifact') rareChance += 0.12;
  if (focus === 'life') rareChance += 0.05;
  rareChance += speciesMods.expeditionRare;
  if (assigned?.role === 'expedition-rare') rareChance += assigned.expeditionRare || 0;
  if (focus === 'mineral' && assigned?.role === 'expedition-mineral') {
    rareChance += (assigned.expeditionMineral || 0) * 0.4;
    for (const id of Object.keys(resources)) resources[id] = Math.floor(resources[id] * (1 + (assigned.expeditionMineral || 0)));
  }
  return { resources, rare: randomValue <= Math.min(1, rareChance) ? expedition.rare : null, rareChance: Math.min(1, rareChance) };
}

export function autoBuyTick(state, dt) {
  const research = researchModifiers(state);
  if (!research.unlocks.has('autoMatter') && !research.unlocks.has('autoAll')) return 0;
  let bought = 0;
  const maxPurchases = Math.max(1, Math.min(8, Math.floor(dt * 2)));
  for (const id of RESOURCE_ORDER) {
    if (!resourceUnlocked(id, state.planetStage) || !state.autoBuy?.[id]) continue;
    if (id !== 'matter' && !research.unlocks.has('autoAll')) continue;
    for (let i = 0; i < maxPurchases; i += 1) {
      const cost = generatorCost(id, state.generators[id]);
      if (state.resources[id] < cost) break;
      state.resources[id] -= cost;
      state.generators[id] += 1;
      bought += 1;
    }
  }
  return bought;
}

export function rareLabel(id) {
  return ({ lunarShard: 'Lunar Shard', ancientCore: 'Ancient Core', signalSeed: 'Signal Seed' })[id] || id;
}

export function formatShort(value) {
  const number = Number(value || 0);
  if (number < 1000) return Math.floor(number).toLocaleString('ja-JP');
  const units = [['Qa', 1e15], ['T', 1e12], ['B', 1e9], ['M', 1e6], ['K', 1e3]];
  for (const [label, size] of units) if (number >= size) return `${(number / size).toFixed(number >= size * 100 ? 0 : number >= size * 10 ? 1 : 2)}${label}`;
  return Math.floor(number).toLocaleString('ja-JP');
}
