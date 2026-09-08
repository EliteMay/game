import { loadRootSave } from '../games/scrap-factory/storage.js';
import { TUTORIAL } from '../games/scrap-factory/config.js';
import { PLANET_STAGES, SPECIES } from '../games/orbloom/config.js';
import { loadSave as loadOrbloomSave } from '../games/orbloom/storage.js';

const $ = (selector) => document.querySelector(selector);

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  if (total < 60) return `${total}s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatLastPlayed(iso) {
  if (!iso) return '未プレイ';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'プレイ履歴あり';
  return `最終プレイ ${new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)}`;
}

function renderOrbloomHub() {
  const root = loadRootSave();
  const scrap = root.games?.['scrap-factory'];
  const { state: orbloom } = loadOrbloomSave();

  const totalPlay = Number(root.profile?.totalPlayTimeSeconds || 0) + Number(orbloom.playTimeSeconds || 0);
  $('#total-playtime').textContent = formatDuration(totalPlay);

  const scrapStep = Math.min(TUTORIAL.length, Math.max(0, Number(scrap?.tutorialStep || 0)));
  const achievements = (scrapStep >= TUTORIAL.length ? 1 : 0) + (orbloom.mainClearedAt ? 1 : 0);
  $('#hub-achievements').textContent = `${achievements} / 2`;

  const stage = PLANET_STAGES[Math.max(0, Math.min(PLANET_STAGES.length - 1, Number(orbloom.planetStage || 0)))];
  $('#orbloom-stage').textContent = stage?.name || 'Dead Rock';
  $('#orbloom-species').textContent = `${SPECIES.filter((entry) => orbloom.species?.[entry.id]?.discovered).length} / ${SPECIES.length}`;
  $('#orbloom-playtime').textContent = formatDuration(orbloom.playTimeSeconds);
  $('#orbloom-status').textContent = orbloom.mainClearedAt ? 'MAIN CLEAR' : 'GROWING';
  $('#orbloom-last-played').textContent = Number(orbloom.playTimeSeconds || 0) > 0 ? formatLastPlayed(orbloom.lastPlayedAt) : '未プレイ';
}

renderOrbloomHub();
