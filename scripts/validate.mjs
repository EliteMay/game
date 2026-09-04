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
  'games/scrap-factory/config.js',
  'games/scrap-factory/storage.js',
  'games/scrap-factory/world.js',
  'games/scrap-factory/game.js',
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

const htmlFiles = ['index.html', '404.html', 'games/scrap-factory/index.html'];
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
console.log(`Validation passed: ${jsFiles.length} JS/MJS files, ${htmlFiles.length} HTML targets.`);
