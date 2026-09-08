import { homeTutorialObjective } from './home-system.js';

const STYLE_HREF = './pause-notification-ui.css';
const MAX_VISIBLE_TOASTS = 3;
const DUPLICATE_WINDOW_MS = 1800;
const UPDATE_MS = 300;

const state = {
  runtime: null,
  toastObserver: null,
  recentToasts: new Map(),
  pauseSignature: null,
};

function game() {
  return state.runtime?.getGame?.() || null;
}

function ensureStylesheet() {
  if (document.querySelector('link[data-pause-notification-ui]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  link.dataset.pauseNotificationUi = 'true';
  document.head.append(link);
}

function toastTone(node) {
  if (node.classList.contains('toast--warn')) return 'warn';
  if (node.classList.contains('toast--objective')) return 'objective';
  if (node.classList.contains('toast--success')) return 'success';
  if (node.classList.contains('toast--pickup')) return 'pickup';
  return 'info';
}

function toastIcon(tone) {
  if (tone === 'warn') return '!';
  if (tone === 'objective') return '↑';
  if (tone === 'success') return '✓';
  if (tone === 'pickup') return '+';
  return 'i';
}

function normalizedToastMessage(node) {
  return String(node.dataset.notificationMessage || node.textContent || '').replace(/\s+/g, ' ').trim();
}

function decorateToast(node, message, tone, count = 1) {
  node.dataset.notificationUi = 'true';
  node.dataset.notificationMessage = message;
  node.dataset.notificationTone = tone;
  node.setAttribute('role', tone === 'warn' ? 'alert' : 'status');
  node.replaceChildren();

  const icon = document.createElement('span');
  icon.className = 'notification-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = toastIcon(tone);

  const copy = document.createElement('span');
  copy.className = 'notification-copy';
  copy.textContent = message;

  node.append(icon, copy);
  if (count > 1) {
    const badge = document.createElement('strong');
    badge.className = 'notification-count';
    badge.textContent = `×${count}`;
    badge.setAttribute('aria-label', `${count}回`);
    node.append(badge);
  }
}

function trimToastStack(stack) {
  const toasts = [...stack.querySelectorAll(':scope > .toast')];
  if (toasts.length <= MAX_VISIBLE_TOASTS) return;
  toasts.slice(0, toasts.length - MAX_VISIBLE_TOASTS).forEach((node) => node.remove());
}

function processToast(node) {
  if (!(node instanceof HTMLElement) || !node.classList.contains('toast') || node.dataset.notificationUi === 'true') return;
  const message = normalizedToastMessage(node);
  if (!message) return;
  const tone = toastTone(node);
  const key = `${tone}|${message}`;
  const now = Date.now();
  const previous = state.recentToasts.get(key);
  let count = 1;

  if (previous && now - previous.time <= DUPLICATE_WINDOW_MS && previous.node?.isConnected) {
    count = Number(previous.count || 1) + 1;
    previous.node.remove();
  }

  decorateToast(node, message, tone, count);
  state.recentToasts.set(key, { node, time: now, count });
  trimToastStack(node.parentElement);

  for (const [entryKey, entry] of state.recentToasts) {
    if (!entry.node?.isConnected || now - entry.time > DUPLICATE_WINDOW_MS * 2) state.recentToasts.delete(entryKey);
  }
}

function installToastAggregation() {
  const stack = document.querySelector('#toast-stack');
  if (!stack || state.toastObserver) return;
  [...stack.children].forEach(processToast);
  state.toastObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) processToast(node);
    }
  });
  state.toastObserver.observe(stack, { childList: true });
}

function ensurePauseSummary() {
  const panel = document.querySelector('#pause-panel');
  const card = panel?.querySelector('.panel-card');
  const menu = card?.querySelector('.menu-stack');
  if (!panel || !card || !menu) return null;
  card.dataset.pauseSurface = 'true';

  let summary = card.querySelector('[data-pause-session-summary]');
  if (!summary) {
    summary = document.createElement('section');
    summary.className = 'pause-session-summary';
    summary.dataset.pauseSessionSummary = 'true';
    menu.before(summary);
  }

  const resume = document.querySelector('#resume-game');
  const guide = document.querySelector('#open-guide-pause');
  const save = document.querySelector('#save-now');
  const settings = document.querySelector('#open-settings-pause');
  const exit = menu.querySelector('.text-action');
  if (resume) resume.innerHTML = '<span>ゲームに戻る</span><kbd>Esc</kbd>';
  if (guide) guide.textContent = 'Quick Guide';
  if (save) save.textContent = '今すぐセーブ';
  if (settings) settings.textContent = '設定';
  if (exit) {
    exit.classList.add('pause-exit-action');
    exit.textContent = 'Game Hubへ戻る';
  }
  return summary;
}

function renderPauseSummary() {
  const g = game();
  const panel = document.querySelector('#pause-panel');
  if (!g || !panel || panel.hidden) return;
  const summary = ensurePauseSummary();
  if (!summary) return;
  const objective = homeTutorialObjective(g);
  const signature = `${objective.id}|${objective.title}|${objective.progress}|${objective.hint}`;
  if (signature === state.pauseSignature) return;
  state.pauseSignature = signature;
  summary.innerHTML = `
    <div class="pause-session-summary__goal">
      <span>CURRENT GOAL</span>
      <strong>${objective.title}</strong>
      <small>${objective.progress} · ${objective.hint}</small>
    </div>
    <div class="pause-session-summary__tools">
      <span><kbd>O</kbd> Quick Guide</span>
      <span><kbd>V</kbd> Diagnostics</span>
      <span><kbd>P</kbd> Factory</span>
    </div>
    <p>Factory simulationは通常の管理・Home画面中も継続します。Pause中だけ操作を止めて確認します。</p>
  `;
}

function settingsHeading(label, title) {
  const node = document.createElement('div');
  node.className = 'settings-surface-heading';
  node.innerHTML = `<span>${label}</span><strong>${title}</strong>`;
  return node;
}

function ensureSettingsHierarchy() {
  const panel = document.querySelector('#settings-panel');
  const list = panel?.querySelector('.settings-list');
  if (!panel || !list) return;
  panel.dataset.settingsSurface = 'true';

  const firstBase = list.querySelector(':scope > .setting-row:not([data-home-setting])');
  if (firstBase && !list.querySelector('[data-settings-heading="base"]')) {
    const heading = settingsHeading('CONTROLS / CORE', '基本操作・音量・描画');
    heading.dataset.settingsHeading = 'base';
    list.insertBefore(heading, firstBase);
  }

  const firstHome = list.querySelector(':scope > [data-home-setting]');
  if (firstHome && !list.querySelector('[data-settings-heading="guidance"]')) {
    const heading = settingsHeading('GUIDANCE / HUD', '目標・Hint・Home表示');
    heading.dataset.settingsHeading = 'guidance';
    list.insertBefore(heading, firstHome);
  }

  const phase7 = list.querySelector(':scope > [data-phase7-settings]');
  if (phase7) phase7.dataset.settingsGroup = 'accessibility-graphics';

  const danger = panel.querySelector('.settings-danger-zone');
  if (danger && !danger.querySelector('[data-settings-data-label]')) {
    const label = document.createElement('div');
    label.className = 'settings-data-label';
    label.dataset.settingsDataLabel = 'true';
    label.innerHTML = '<span>SAVE DATA</span><strong>Export / Reset</strong>';
    danger.prepend(label);
  }
}

function bindPauseEscape() {
  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.code !== 'Escape') return;
    const pause = document.querySelector('#pause-panel');
    if (!pause || pause.hidden) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelector('#resume-game')?.click();
  }, true);
}

function update() {
  installToastAggregation();
  ensurePauseSummary();
  renderPauseSummary();
  ensureSettingsHierarchy();
}

function boot() {
  if (!window.__scrapFactoryBooted || !window.__scrapFactoryRuntime) {
    window.setTimeout(boot, 100);
    return;
  }
  state.runtime = window.__scrapFactoryRuntime;
  ensureStylesheet();
  bindPauseEscape();
  update();
  window.setInterval(update, UPDATE_MS);
}

boot();
