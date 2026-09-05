import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const required = [
  'index.html',
  'css/hub.css',
  'js/hub.js',
  'games/scrap-factory/index.html',
  'games/scrap-factory/game.css',
  'games/scrap-factory/game-ux.css',
  'games/scrap-factory/factory-management.css',
  'games/scrap-factory/progression.css',
  'games/scrap-factory/exploration-ui.css',
  'games/scrap-factory/config.js',
  'games/scrap-factory/logistics.js',
  'games/scrap-factory/power.js',
  'games/scrap-factory/storage-capacity.js',
  'games/scrap-factory/exploration.js',
  'games/scrap-factory/exploration-core.js',
  'games/scrap-factory/exploration-ui.js',
  'games/scrap-factory/exploration-ui-v2.js',
  'games/scrap-factory/factory-management.js',
  'games/scrap-factory/feature-pack.js',
  'games/scrap-factory/phase4b-management-ui.js',
  'games/scrap-factory/progression.js',
  'games/scrap-factory/progression-core.js',
  'games/scrap-factory/progression-phase4b.js',
  'games/scrap-factory/progression-ui.js',
  'games/scrap-factory/storage.js',
  'games/scrap-factory/world.js',
  'games/scrap-factory/world-runtime.js',
  'games/scrap-factory/game.js',
  'games/scrap-factory/exploration/residential.html',
  'games/scrap-factory/exploration/residential.css',
  'games/scrap-factory/exploration/residential.js',
  'games/scrap-factory/exploration/industrial.html',
  'games/scrap-factory/exploration/industrial.css',
  'games/scrap-factory/exploration/industrial.js',
  'scripts/logistics.test.mjs',
  'scripts/factory-management.test.mjs',
  'scripts/progression.test.mjs',
  'scripts/power.test.mjs',
  'scripts/storage-capacity.test.mjs',
  'scripts/exploration.test.mjs',
  'scripts/industrial-exploration.test.mjs',
  'scripts/phase4b.test.mjs',
  'README.md',
  'REQUIREMENTS.md',
  'SPEC.md',
  'PROJECT_LEARNINGS.md',
  'project-meta.json',
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Missing required file: ${relative}`);
}

for (const jsonFile of ['project-meta.json', 'package.json']) {
  try { JSON.parse(fs.readFileSync(path.join(root, jsonFile), 'utf8')); }
  catch (error) { failures.push(`Invalid JSON: ${jsonFile}: ${error.message}`); }
}

const jsFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) jsFiles.push(full);
  }
}
walk(root);
for (const file of jsFiles) {
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); }
  catch (error) { failures.push(`JavaScript syntax: ${path.relative(root, file)}\n${error.stderr?.toString() || error.message}`); }
}

for (const [name, script] of [
  ['Directional logistics', 'scripts/logistics.test.mjs'],
  ['Factory management', 'scripts/factory-management.test.mjs'],
  ['Progression', 'scripts/progression.test.mjs'],
  ['Power', 'scripts/power.test.mjs'],
  ['Storage capacity', 'scripts/storage-capacity.test.mjs'],
  ['Exploration', 'scripts/exploration.test.mjs'],
  ['Industrial exploration', 'scripts/industrial-exploration.test.mjs'],
  ['Phase 4-B advanced logistics', 'scripts/phase4b.test.mjs'],
]) {
  try {
    execFileSync(process.execPath, [path.join(root, script)], { stdio: 'pipe' });
  } catch (error) {
    failures.push(`${name} tests failed:\n${error.stderr?.toString() || error.stdout?.toString() || error.message}`);
  }
}

const htmlFiles = [
  'index.html',
  '404.html',
  'games/scrap-factory/index.html',
  'games/scrap-factory/exploration/residential.html',
  'games/scrap-factory/exploration/industrial.html',
];
for (const relative of htmlFiles) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) continue;
  const html = fs.readFileSync(full, 'utf8');
  const dir = path.dirname(full);
  const refs = [...html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(ref)) continue;
    if (ref.startsWith('/game/')) {
      const target = path.join(root, ref.slice('/game/'.length));
      if (!fs.existsSync(target)) failures.push(`Broken local ref in ${relative}: ${ref}`);
      continue;
    }
    const clean = ref.split('?')[0];
    const target = path.resolve(dir, clean);
    if (!fs.existsSync(target)) failures.push(`Broken local ref in ${relative}: ${ref}`);
  }
  if (!/<html\s+lang=["']ja["']/i.test(html)) failures.push(`Missing html lang=ja: ${relative}`);
  if (!/<title>[^<]+<\/title>/i.test(html)) failures.push(`Missing title: ${relative}`);
}

const scrapHtml = fs.readFileSync(path.join(root, 'games/scrap-factory/index.html'), 'utf8');
for (const id of ['open-guide-hud', 'guide-panel', 'machine-rotate', 'machine-reverse', 'dismantle-hint', 'shortcut-bar']) {
  if (!scrapHtml.includes(`id="${id}"`)) failures.push(`Scrap Factory missing UX control: ${id}`);
}
if (!scrapHtml.includes('"./world.js": "./world-runtime.js"')) failures.push('Scrap Factory import map must route world.js through world-runtime.js');
if (!scrapHtml.includes('src="./feature-pack.js"')) failures.push('Scrap Factory must load feature-pack.js');

const factoryManagement = fs.readFileSync(path.join(root, 'games/scrap-factory/factory-management.js'), 'utf8');
if (!factoryManagement.includes("import('./progression-ui.js')")) failures.push('Factory management must load progression-ui.js in browser runtime');
if (!factoryManagement.includes("import('./exploration-ui.js')")) failures.push('Factory management must load exploration-ui.js in browser runtime');
if (!factoryManagement.includes("import('./phase4b-management-ui.js')")) failures.push('Factory management must load phase4b-management-ui.js in browser runtime');

const residentialRuntime = fs.readFileSync(path.join(root, 'games/scrap-factory/exploration/residential.js'), 'utf8');
for (const marker of ['startExpedition', 'collectExplorationLoot', 'advanceResidentialObjective', 'returnFromExpedition', 'abandonExpedition']) {
  if (!residentialRuntime.includes(marker)) failures.push(`Residential exploration runtime missing core integration: ${marker}`);
}

const industrialRuntime = fs.readFileSync(path.join(root, 'games/scrap-factory/exploration/industrial.js'), 'utf8');
for (const marker of ['INDUSTRIAL_AREA_ID', 'collectExplorationLoot', 'advanceIndustrialObjective', 'returnFromExpedition', 'abandonExpedition']) {
  if (!industrialRuntime.includes(marker)) failures.push(`Industrial exploration runtime missing core integration: ${marker}`);
}

const gameRuntime = fs.readFileSync(path.join(root, 'games/scrap-factory/game.js'), 'utf8');
for (const marker of ['computePowerSnapshot', 'tickGeneratorFuel', 'tickPowerStorage', 'storageRemaining', 'isBuildingUnlocked', 'isHandCraftUnlocked']) {
  if (!gameRuntime.includes(marker)) failures.push(`Scrap Factory runtime missing core integration: ${marker}`);
}

const logisticsRuntime = fs.readFileSync(path.join(root, 'games/scrap-factory/logistics.js'), 'utf8');
for (const marker of ['smart_sorter', 'smartSorterLaneForItem', 'SMART_SORTER_LANES']) {
  if (!logisticsRuntime.includes(marker)) failures.push(`Phase 4-B logistics runtime missing marker: ${marker}`);
}

const textFiles = [];
function collectText(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectText(full);
    else if (entry.isFile() && /\.(?:html|css|js|mjs|json|md|yml|yaml)$/i.test(entry.name)) textFiles.push(full);
  }
}
collectText(root);
for (const file of textFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  if (/C:\\Users\\|file:\/\/|localhost:\d+/i.test(text) && rel !== 'README.md') failures.push(`Local-only path found: ${rel}`);
  if (/sk-(?:proj-)?[A-Za-z0-9_-]{16,}/.test(text)) failures.push(`Possible API key found: ${rel}`);
}

const meta = JSON.parse(fs.readFileSync(path.join(root, 'project-meta.json'), 'utf8'));
for (const profile of ['STATIC', 'MEDIA', 'TOOL']) {
  if (!meta.profiles?.includes(profile)) failures.push(`project-meta missing profile: ${profile}`);
}

if (failures.length) {
  console.error('Validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Validation passed: ${jsFiles.length} JS/MJS files, ${htmlFiles.length} HTML targets, logistics + management + progression + power + storage + exploration + industrial exploration + Phase 4-B tests.`);
