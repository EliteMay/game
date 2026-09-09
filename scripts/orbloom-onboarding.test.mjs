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
  'games/orbloom/onboarding-entry.js',
  'games/orbloom/onboarding.css',
  'games/orbloom/ONBOARDING_RESEARCH.md',
]) {
  assert.equal(fs.existsSync(path.join(root, relative)), true, `Missing onboarding file: ${relative}`);
}

const html = fs.readFileSync(path.join(root, 'games/orbloom/index.html'), 'utf8');
const onboardingJs = fs.readFileSync(path.join(root, 'games/orbloom/onboarding.js'), 'utf8');
const onboardingEntry = fs.readFileSync(path.join(root, 'games/orbloom/onboarding-entry.js'), 'utf8');
const onboardingCss = fs.readFileSync(path.join(root, 'games/orbloom/onboarding.css'), 'utf8');
const onboardingResearch = fs.readFileSync(path.join(root, 'games/orbloom/ONBOARDING_RESEARCH.md'), 'utf8');
assert.ok(html.includes('./onboarding.css?v=6'), 'Orbloom must cache-bust onboarding.css after mobile visibility fixes');
assert.ok(html.includes('./onboarding-entry.js?v=6'), 'Orbloom must load the cache-busted onboarding entry');
assert.ok(html.includes('id="open-tutorial"'), 'Orbloom HUD must expose an explicit tutorial launcher');
assert.ok(onboardingEntry.includes("import('./onboarding.js?v=6')"), 'Onboarding entry must force a fresh onboarding module fetch');
assert.ok(onboardingEntry.includes('elitemay-orbloom-onboarding-v5'), 'Recovery entry must know the current onboarding completion key');
assert.ok(onboardingEntry.includes('onboarding-mobile-recovery-v6'), 'Mobile recovery must only replay once by default');
assert.ok(onboardingEntry.includes("params.get(FORCE_PARAM) === '1'"), 'A tutorial=1 URL must force current tutorial replay');
assert.ok(onboardingEntry.includes("'#offline-panel'"), 'Manual tutorial launch must close blocking overlays');
assert.ok(onboardingJs.includes('TAP → 自動生産を購入'), 'Generator cards must expose a clear tap-to-buy action');
assert.ok(onboardingJs.includes('onboarding-pointer'), 'Onboarding must render a direct pointer at the real target');
assert.ok(onboardingJs.includes('ここをタップ'), 'Touch onboarding must label the exact target in Japanese');
assert.ok(onboardingJs.includes('scrollIntoView'), 'Off-screen tutorial targets must be brought into view');
assert.ok(onboardingJs.includes('is-onboarding-live-target'), 'The real DOM target must receive an active tutorial state');
assert.ok(onboardingJs.includes('vw <= 620'), 'Onboarding must include a mobile-specific coach placement path');
assert.ok(onboardingCss.includes('.resource-cell.is-generator-ready'), 'Affordable generator cards must have a visible ready state');
assert.ok(onboardingCss.includes('.onboarding-pointer__hand'), 'Touch onboarding must visually render a finger cue');
assert.ok(onboardingCss.includes('.tutorial-action{'), 'Tutorial launcher must have an explicit visible state');
assert.match(onboardingCss, /@media \(max-width:620px\)[\s\S]*\.tutorial-action\{position:fixed/, 'Tutorial launcher must remain viewport-visible on phones');
assert.match(onboardingCss, /\.onboarding-mask\{[^}]*pointer-events:auto/, 'Dimmed non-target regions must intercept accidental taps');
assert.ok(onboardingResearch.includes('Idle Planet Miner'), 'Onboarding research must include Idle Planet Miner');
assert.ok(onboardingResearch.includes('Cell to Singularity'), 'Onboarding research must include Cell to Singularity');
assert.ok(onboardingResearch.includes('Egg, Inc.'), 'Onboarding research must include Egg, Inc.');
assert.ok(onboardingResearch.includes('Idle Miner Tycoon'), 'Onboarding research must include Idle Miner Tycoon');

assert.equal(ONBOARDING_VERSION, 5);
assert.equal(ONBOARDING_TOTAL_STEPS, 7);

const fresh = createDefaultSave();
let step = getOnboardingStep(fresh);
assert.equal(step.id, 'manual-matter');
assert.equal(step.target, 'manual');
assert.equal(step.step, 1);
assert.match(step.body, /ここをタップ/);

fresh.resources.matter = generatorCost('matter', 0);
step = getOnboardingStep(fresh);
assert.equal(step.id, 'first-generator');
assert.equal(step.target, 'matter-generator');
assert.match(step.title, /自動生産/);
assert.match(step.body, /Generator（自動生産装置）/);
assert.match(step.body, /ここをタップ/);
assert.equal(step.body.includes('画面上'), false, 'First Generator must not depend on relative screen-position wording');
assert.equal(step.verb, 'TAP');

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
assert.match(step.body, /自動生産装置/);
assert.equal(step.body.includes('画面上'), false, 'Water Generator must not depend on relative screen-position wording');

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