import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BIOMES,
  EXPEDITIONS,
  PLANET_STAGES,
  RESEARCH,
  RESOURCES,
  SPECIES,
} from '../games/orbloom/config.js';
import {
  calculateExpeditionReward,
  countEcosystems,
  manualMatterGain,
  offlineConfig,
  planetEvolutionStatus,
  productionRates,
  spendResources,
} from '../games/orbloom/core.js';
import { createDefaultSave, normalizeSave, SAVE_SCHEMA } from '../games/orbloom/storage.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const relative of [
  'games/orbloom/index.html',
  'games/orbloom/orbloom.css',
  'games/orbloom/config.js',
  'games/orbloom/core.js',
  'games/orbloom/storage.js',
  'games/orbloom/world.js',
  'games/orbloom/game.js',
  'css/hub-orbloom.css',
  'js/hub-orbloom.js',
]) {
  assert.equal(fs.existsSync(path.join(root, relative)), true, `Missing Orbloom file: ${relative}`);
}
const orbloomHtml = fs.readFileSync(path.join(root, 'games/orbloom/index.html'), 'utf8');
for (const marker of ['planet-canvas', 'resource-strip', 'evolve-planet', 'panel-content', 'settings-panel']) {
  assert.ok(orbloomHtml.includes(`id="${marker}"`), `Orbloom HTML missing ${marker}`);
}
const hubHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(hubHtml.includes('./games/orbloom/index.html'), 'Game Hub must link to Orbloom');
assert.ok(hubHtml.includes('hub-orbloom.js'), 'Game Hub must load Orbloom progress adapter');

assert.equal(Object.keys(RESOURCES).length, 4, 'Orbloom must keep four core resources');
assert.equal(Object.keys(BIOMES).length, 4, 'Orbloom must keep four major biomes');
assert.equal(SPECIES.length, 12, 'Orbloom initial build should contain 12 species');
assert.equal(RESEARCH.length, 20, 'Orbloom initial build should contain 20 research nodes');
assert.equal(EXPEDITIONS.length, 4, 'Orbloom initial build should contain four expeditions');
assert.equal(PLANET_STAGES.length, 7, 'Orbloom must have seven visible planet stages');

const fresh = createDefaultSave();
assert.equal(fresh.schema, SAVE_SCHEMA);
assert.equal(fresh.planetStage, 0);
assert.equal(fresh.mainClearedAt, null);
assert.ok(manualMatterGain(fresh) >= 1);
assert.deepEqual(Object.keys(productionRates(fresh)), ['matter', 'water', 'oxygen', 'energy']);

const malformed = normalizeSave({
  schema: 1,
  planetStage: 99,
  resources: { matter: -10, water: 'bad' },
  generators: { matter: -4 },
  species: { dustmite: { discovered: true, xp: -20, mutation: 'not-real', biomeId: 'void' } },
});
assert.equal(malformed.planetStage, 6);
assert.equal(malformed.resources.matter, 0);
assert.equal(malformed.resources.water, 0);
assert.equal(malformed.generators.matter, 0);
assert.equal(malformed.species.dustmite.xp, 0);
assert.equal(malformed.species.dustmite.mutation, 'normal');
assert.equal(malformed.species.dustmite.biomeId, null);

const state = createDefaultSave();
for (const id of Object.keys(state.resources)) state.resources[id] = 1e15;
state.generators.matter = 4;

let status = planetEvolutionStatus(state);
assert.equal(status.canEvolve, true, 'Stage 0 -> 1 must be reachable');
spendResources(state, status.cost);
state.planetStage += 1;

state.biomes.rocky.level = 6;
state.biomes.ocean.level = 3;
for (const id of ['dustmite', 'pebbleback']) {
  state.species[id].discovered = true;
  state.species[id].biomeId = 'rocky';
}
status = planetEvolutionStatus(state);
assert.equal(status.canEvolve, true, 'Stage 1 -> 2 must be reachable');
spendResources(state, status.cost);
state.planetStage += 1;

state.biomes.forest.level = 4;
for (const id of ['tidefin', 'mistwing']) {
  state.species[id].discovered = true;
  state.species[id].biomeId = 'ocean';
}
state.research.push('p-geology', 'b-growth');
status = planetEvolutionStatus(state);
assert.equal(status.canEvolve, true, 'Stage 2 -> 3 must be reachable');
spendResources(state, status.cost);
state.planetStage += 1;

state.biomes.crystal.level = 5;
state.research.push('a-harvest', 'p-hydrology', 'b-affinity');
state.species.dustmite.evolved = true;
status = planetEvolutionStatus(state);
assert.equal(status.canEvolve, true, 'Stage 3 -> 4 must be reachable');
spendResources(state, status.cost);
state.planetStage += 1;

for (const id of ['mossling', 'sporefox']) {
  state.species[id].discovered = true;
  state.species[id].biomeId = 'forest';
}
state.research.push('p-ecosphere', 'b-mutation', 'a-offline', 'a-duration');
state.species.pebbleback.evolved = true;
state.species.tidefin.evolved = true;
state.rareMaterials.lunarShard = 1;
assert.ok(countEcosystems(state) >= 2, 'At least two ecosystem combinations should be attainable');
status = planetEvolutionStatus(state);
assert.equal(status.canEvolve, true, `Stage 4 -> 5 blocked: ${status.missing.join(', ')}`);
spendResources(state, status.cost);
state.planetStage += 1;

for (const id of ['sunmoth', 'crystalhare']) {
  state.species[id].discovered = true;
  state.species[id].biomeId = 'crystal';
}
state.research.push('p-engineering', 'b-slots', 'a-expand');
state.species.mistwing.evolved = true;
state.species.mossling.evolved = true;
state.rareMaterials.signalSeed = 1;
assert.ok(countEcosystems(state) >= 3, 'At least three ecosystem combinations should be attainable');
status = planetEvolutionStatus(state);
assert.equal(status.canEvolve, true, `Stage 5 -> 6 blocked: ${status.missing.join(', ')}`);

const offline = offlineConfig(state);
assert.ok(offline.efficiency > 0 && offline.efficiency <= 0.95);
assert.ok(offline.maxSeconds >= 7200 && offline.maxSeconds <= 43200);

const reward = calculateExpeditionReward(state, 'signal', 'artifact', 'crystalhare', 0);
assert.ok(reward);
assert.ok(reward.resources.energy > 0);
assert.equal(reward.rare, 'signalSeed');

console.log('Orbloom core contract: PASS');
