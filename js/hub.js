import { exportSaveText, importSaveText, loadRootSave } from '../games/scrap-factory/storage.js';
import { TUTORIAL } from '../games/scrap-factory/config.js';

const $ = (selector) => document.querySelector(selector);
const ui = {
  totalPlaytime: $('#total-playtime'),
  achievements: $('#hub-achievements'),
  money: $('#scrap-money'),
  revenue: $('#scrap-revenue'),
  playtime: $('#scrap-playtime'),
  progress: $('#scrap-progress'),
  lastPlayed: $('#last-played'),
  exportButton: $('#export-save'),
  importInput: $('#import-save'),
  toast: $('#hub-toast'),
};

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  if (total < 60) return `${total}s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatLastPlayed(iso) {
  if (!iso) return '未プレイ';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'プレイ履歴あり';
  return `最終プレイ ${new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)}`;
}

function render() {
  const root = loadRootSave();
  const game = root.games?.['scrap-factory'];
  ui.totalPlaytime.textContent = formatDuration(root.profile?.totalPlayTimeSeconds);
  ui.money.textContent = `$${Math.floor(Number(game?.money || 40)).toLocaleString('ja-JP')}`;
  ui.revenue.textContent = `$${Math.floor(Number(game?.lifetimeRevenue || 0)).toLocaleString('ja-JP')}`;
  ui.playtime.textContent = formatDuration(game?.playTimeSeconds);
  const step = Math.min(TUTORIAL.length, Math.max(0, Number(game?.tutorialStep || 0)));
  ui.progress.textContent = `${step} / ${TUTORIAL.length}`;
  ui.achievements.textContent = `${step >= TUTORIAL.length ? 1 : 0} / 1`;
  ui.lastPlayed.textContent = formatLastPlayed(game?.lastPlayedAt || root.profile?.lastPlayedAt);
}

function toast(message) {
  ui.toast.textContent = message;
  ui.toast.hidden = false;
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => { ui.toast.hidden = true; }, 2600);
}

ui.exportButton.addEventListener('click', () => {
  const blob = new Blob([exportSaveText()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `game-hub-save-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast('セーブJSONを書き出しました');
});

ui.importInput.addEventListener('change', async () => {
  const file = ui.importInput.files?.[0];
  ui.importInput.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    importSaveText(text);
    render();
    toast('セーブを読み込みました');
  } catch (error) {
    console.error(error);
    toast('読み込みに失敗しました。正しいGame Hubセーブか確認してください。');
  }
});

render();
