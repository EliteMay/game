import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const entry = await readFile(new URL('../games/scrap-factory/progression-ui.js', import.meta.url), 'utf8');
const moduleSource = await readFile(new URL('../games/scrap-factory/phase7-settings.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../games/scrap-factory/phase7-settings.css', import.meta.url), 'utf8');
const gameSource = await readFile(new URL('../games/scrap-factory/game.js', import.meta.url), 'utf8');
const worldSource = await readFile(new URL('../games/scrap-factory/world.js', import.meta.url), 'utf8');

assert.match(entry, /import '\.\/phase7-settings\.js';/, 'stable progression entrypoint must load Phase 7 settings');

for (const setting of [
  'invertY',
  'fieldOfView',
  'headBob',
  'sprintFovEffect',
  'reduceMotion',
  'hudScale',
  'textScale',
  'crosshairScale',
  'performanceMode',
  'customRenderScale',
  'customShadows',
  'customAtmosphere',
]) {
  assert.match(moduleSource, new RegExp(`\\b${setting}\\b`), `Phase 7 settings must include ${setting}`);
}

assert.match(moduleSource, /\['high', 'medium', 'low', 'custom'\]/, 'graphics quality must support High / Medium / Low / Custom');
assert.match(moduleSource, /world\.setQuality\?\.\('low'\)/, 'Performance Mode must reuse low-cost renderer quality');
assert.match(moduleSource, /world\.renderer\.shadowMap\.enabled = false/, 'Performance Mode must disable realtime shadows');
assert.match(moduleSource, /world\.camera\.far = 145/, 'Performance Mode must reduce draw distance');
assert.match(moduleSource, /Simulationは変更しません/, 'Performance Mode UI must explicitly preserve Simulation');
assert.doesNotMatch(moduleSource, /processMachines|transportTick|computePowerSnapshot|RECIPES|BUILDINGS/, 'settings layer must not alter Factory Simulation contracts');

assert.match(worldSource, /const bob = moving && this\.player\.grounded/, 'base world must expose deterministic head-bob behavior for the accessibility layer');
assert.match(worldSource, /this\.camera\.fov = THREE\.MathUtils\.damp/, 'base world must expose deterministic sprint FOV behavior for the accessibility layer');
assert.match(gameSource, /world\.setQuality\(game\.settings\.quality\)/, 'existing graphics quality contract must remain wired');

assert.match(css, /--phase7-hud-scale/, 'HUD Scale CSS variable must exist');
assert.match(css, /--phase7-text-scale/, 'Text Size CSS variable must exist');
assert.match(css, /--phase7-crosshair-scale/, 'Crosshair Scale CSS variable must exist');
assert.match(css, /prefers-reduced-motion: reduce/, 'OS reduce-motion preference must be respected');

console.log('Phase 7 settings regression checks passed.');
