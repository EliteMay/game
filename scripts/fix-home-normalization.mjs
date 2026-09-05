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
  const normalized = normalizeHomeState(game.home, {
    existingSave: options.existingSave ?? !hasHome,
    legacyGame: game,
  });
  if (hasHome) {
    for (const key of Object.keys(game.home)) {
      if (!Object.prototype.hasOwnProperty.call(normalized, key)) delete game.home[key];
    }
    Object.assign(game.home, normalized);
    return game.home;
  }
  game.home = normalized;
  return game.home;
}`;
if (!content.includes(after)) {
  if (!content.includes(before)) throw new Error('ensureHomeState anchor not found');
  content = content.replace(before, after);
  fs.writeFileSync(target, content);
}
console.log('Home state normalization now preserves object identity.');
