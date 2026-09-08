import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatorCost } from '../games/orbloom/config.js';
import { createDefaultSave } from '../games/orbloom/storage.js';
import {
  ONBOARDING_TOTAL_STEPS,
  ONBOARDING_VERSION,
  applyUnlockStarterResources,
  getOnboardingStep,
} from '../games/orbloom/onboarding-core.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const relative of [
  'games/orbloom/onboarding-core.js',
  'games/orbloom/onboarding.js',
  'games/orbloom/onboarding.css',
  'games/orbloom/ONBOARDING_RESEARCH.md',
]) {
  assert.equal(fs.existsSync(path.join(root, relative)), true, `Missing onboarding file: ${relative}`);
}

const html = fs.readFileSync(path.join(root, 'games/orbloom/index.html'), 'utf8');
assert.ok(html.includes('./onboarding.css'), 'Orbloom must load onboarding.css');
assert.ok(html.includes('./onboarding.js'), 'Orbloom must load onboarding.js');

assert.equal(ONBOARDING_VERSION, 3);
assert.equal(ONBOARDING_TOTAL_STEPS, 7);

const fresh = createDefaultSave();
let step = getOnboardingStep(fresh);
assert.equal(step.id, 'manual-matter');
assert.equal(step.target, 'manual');
assert.equal(step.step, 1);

fresh.resources.matter = generatorCost('matter', 0);
step = getOnboardingStep(fresh);
assert.equal(step.id, 'first-generator');
assert.equal(step.target, 'matter-generator');

fresh.generators.matter = 1;
fresh.resources.matter = 0;
step = getOnboardingStep(fresh);
assert.equal(step.id, 'reinvest-save');
assert.equal(step.target, 'manual');

fresh.resources.matter = generatorCost('matter', 1);
step = getOnboardingStep(fresh);
assert.equal(step.id, 'reinvest-buy');
assert.equal(step.target, 'matter-generator');

fresh.generators.matter = 4;
fresh.resources.matter = 0;
step = getOnboardingStep(fresh);
assert.equal(step.id, 'save-for-evolution');
assert.equal(step.step, 4);

fresh.resources.matter = 250;
step = getOnboardingStep(fresh);
assert.equal(step.id, 'first-evolution');
assert.equal(step.target, 'evolve');

fresh.planetStage = 1;
fresh.generators.water = 0;
fresh.resources.water = 0;
let starter = applyUnlockStarterResources(fresh);
assert.equal(starter.changed, true);
assert.equal(starter.rewards.length, 1);
assert.equal(starter.rewards[0].id, 'water');
assert.equal(fresh.resources.water, generatorCost('water', 0));
assert.equal(fresh.unlockRewards.water, true);

starter = applyUnlockStarterResources(fresh);
assert.equal(starter.changed, false, 'Starter reward must not repeat');
assert.equal(starter.rewards.length, 0, 'Starter reward must not be farmable');

step = getOnboardingStep(fresh);
assert.equal(step.id, 'water-generator');
assert.equal(step.target, 'water-generator');

fresh.generators.water = 1;
step = getOnboardingStep(fresh, { scanReady: false, scanCostLabel: 'H₂O 452', scanResourceTarget: 'water-generator' });
assert.equal(step.id, 'prepare-life-scan');
assert.equal(step.step, 6);
assert.equal(step.target, 'water-generator');

step = getOnboardingStep(fresh, { scanReady: true, scanCostLabel: 'H₂O 452', scanResourceTarget: 'water-generator' });
assert.equal(step.id, 'life-scan');
assert.equal(step.target, 'scan');

fresh.species.dustmite.discovered = true;
step = getOnboardingStep(fresh, { scanReady: false });
assert.equal(step.id, 'place-species');
assert.equal(step.step, 7);
assert.equal(step.target, 'species-placement');

fresh.species.dustmite.biomeId = 'rocky';
step = getOnboardingStep(fresh, { scanReady: false });
assert.equal(step.id, 'complete');
assert.equal(step.complete, true);
assert.equal(step.step, 7);

const partial = createDefaultSave();
partial.planetStage = 1;
partial.resources.water = 5;
starter = applyUnlockStarterResources(partial);
assert.equal(partial.resources.water, generatorCost('water', 0), 'Partial Water must be topped up to first generator cost');
assert.equal(starter.rewards[0].amount, generatorCost('water', 0) - 5);

const progressed = createDefaultSave();
progressed.planetStage = 1;
progressed.generators.water = 1;
progressed.resources.water = 0;
starter = applyUnlockStarterResources(progressed);
assert.equal(starter.changed, true);
assert.equal(starter.rewards.length, 0, 'Progressed saves must not receive a duplicate starter grant');
assert.equal(progressed.unlockRewards.water, true);

const later = createDefaultSave();
later.planetStage = 3;
starter = applyUnlockStarterResources(later);
assert.deepEqual(starter.rewards.map((entry) => entry.id), ['water', 'oxygen', 'energy']);
assert.equal(later.resources.oxygen, generatorCost('oxygen', 0));
assert.equal(later.resources.energy, generatorCost('energy', 0));

console.log('Orbloom onboarding contract: PASS');
