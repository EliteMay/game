import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [entry, surface, css] = await Promise.all([
  readFile(new URL('../games/scrap-factory/progression-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/pause-notification-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../games/scrap-factory/pause-notification-ui.css', import.meta.url), 'utf8'),
]);

assert.match(entry, /import '\.\/pause-notification-ui\.js';/, 'stable progression entrypoint must load final pause/notification surface');
assert.match(surface, /MAX_VISIBLE_TOASTS = 3/, 'normal play must cap visible notifications');
assert.match(surface, /DUPLICATE_WINDOW_MS = 1800/, 'repeated notifications must have an aggregation window');
assert.match(surface, /previous\.node\.remove\(\)/, 'duplicate notifications should collapse into the newest visible toast');
assert.match(surface, /notification-count/, 'aggregated notifications must show a repetition count');
assert.match(surface, /data-pause-session-summary/, 'Pause must expose current-session context');
assert.match(surface, /CURRENT GOAL/, 'Pause must keep the current goal visible');
assert.match(surface, /resume\.innerHTML = '<span>ゲームに戻る<\/span><kbd>Esc<\/kbd>'/, 'Pause must expose Escape as the resume shortcut');
assert.match(surface, /stopImmediatePropagation\(\)/, 'Pause Escape handling must prevent duplicate lower-level handling');
assert.match(surface, /data-settings-heading = 'base'|dataset\.settingsHeading = 'base'/, 'Settings must group core controls');
assert.match(surface, /dataset\.settingsHeading = 'guidance'/, 'Settings must group guidance/HUD controls');
assert.match(surface, /data-settings-data-label/, 'Save export/reset must remain visibly separated from normal settings');
assert.match(css, /\.toast-stack\s*\{[\s\S]*left:\s*18px;[\s\S]*bottom:\s*18px;/, 'notifications should leave the center/build interaction area clear on desktop');
assert.match(css, /\.notification-icon/, 'notification severity must use an icon/text channel in addition to color');
assert.match(css, /#pause-panel \[data-pause-surface="true"\]/, 'Pause hierarchy must have an explicit visual contract');
assert.match(css, /\.settings-surface-heading/, 'Settings groups must have explicit hierarchy styling');
assert.match(css, /@media \(max-width: 620px\)/, 'final surfaces must define narrow viewport behavior');

console.log('Pause and notification UI regression checks passed');
