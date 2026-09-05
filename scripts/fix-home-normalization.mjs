import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve(import.meta.dirname, '../games/scrap-factory/home-system.js');
let content = fs.readFileSync(target, 'utf8');
const before = `export function ensureHomeState(game, options = {}) {
  if (!game) return makeDefaultHomeState(options);
  const hasHome = isObject(game.home);
  game.home = normalizeHomeState(game.home, {
    existingSave: options.existingSave ?? !hasHome,
    legacyGame: game,
  });
  return game.home;
}`;
const after = `export function ensureHomeState(game, options = {}) {
  if (!game) return makeDefaultHomeState(options);
  const hasHome = isObject(game.home);
  const runtimeReady = hasHome
    && Number(game.home.version) === HOME_VERSION
    && isObject(game.home.storage)
    && isObject(game.home.secureCase)
    && Array.isArray(game.home.upgrades)
    && isObject(game.home.tutorial)
    && isObject(game.home.tutorial.events);
  if (runtimeReady) return game.home;
  game.home = normalizeHomeState(game.home, {
    existingSave: options.existingSave ?? !hasHome,
    legacyGame: game,
  });
  return game.home;
}`;
if (!content.includes(after)) {
  if (!content.includes(before)) throw new Error('ensureHomeState anchor not found');
  content = content.replace(before, after);
  fs.writeFileSync(target, content);
}
console.log('Home state normalization now runs once at load/migration and preserves runtime references.');
