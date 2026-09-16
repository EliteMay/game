import { rankProgress } from './progression.js';

const STACK_SELECTOR = '[data-hud-context-stack]';
const FRESH_SELECTOR = ':scope > .objective-panel[data-early-contract-panel]';
const RANK_SELECTOR = ':scope > .objective-panel[data-rank-goal-panel]';
const SYNC_MS = 300;

function currentGame() {
  return window.__scrapFactoryRuntime?.getGame?.() || null;
}

function ensureOwnershipStyle() {
  if (document.querySelector('style[data-objective-ownership]')) return;
  const style = document.createElement('style');
  style.dataset.objectiveOwnership = 'true';
  style.textContent = `
    ${STACK_SELECTOR}[data-objective-owner="fresh"] > .objective-panel:not([data-early-contract-panel]) { display:none !important; }
    ${STACK_SELECTOR}[data-objective-owner="rank"] > .objective-panel:not([data-rank-goal-panel]) { display:none !important; }
    ${RANK_SELECTOR} [data-rank-goal-body] { display:block; }
  `;
  document.head.append(style);
}

function ensureRankPanel(stack) {
  let panel = stack.querySelector(RANK_SELECTOR);
  if (panel) return panel;

  panel = document.createElement('aside');
  panel.className = 'objective-panel';
  panel.dataset.rankGoalPanel = 'true';
  panel.hidden = true;
  panel.setAttribute('aria-label', '現在のランク目標');
  panel.innerHTML = `
    <div class="objective-panel__header">
      <span>MAIN GOAL</span>
      <strong data-rank-goal-progress>RANK 1 / 7</strong>
    </div>
    <h2 data-rank-goal-title>次のRank条件を確認中</h2>
    <p data-rank-goal-body></p>
  `;

  const management = stack.querySelector('[data-hud-management]');
  if (management) stack.insertBefore(panel, management);
  else stack.append(panel);
  return panel;
}

function optionalSummary(progress) {
  if (!progress?.optionalRequired) return '';
  const remaining = (progress.optionals || [])
    .filter((goal) => !goal.done)
    .map((goal) => goal.label);
  const prefix = `追加条件 ${progress.optionalDone}/${progress.optionalRequired}`;
  if (!remaining.length) return `${prefix} ✓`;
  return `${prefix}: ${remaining.join(' / ')}`;
}

function rankGoal(game) {
  const rank = Math.max(1, Number(game?.progression?.progressionRank || 1));
  if (rank >= 7) {
    return {
      signature: `final|${Boolean(game?.finalChapter?.mainClearedAt)}`,
      title: game?.finalChapter?.mainClearedAt ? 'MAIN CLEAR — Factory Optimization' : 'FINAL CHAPTER — Mega Factory',
      body: game?.finalChapter?.mainClearedAt
        ? 'Main Goal達成済み。同じSaveでPower・物流・生産ラインをさらに最適化できます。'
        : 'Experimental Technology → Final Automation → Mega Factoryの連続安定稼働を進める。',
      progress: game?.finalChapter?.mainClearedAt ? 'POST CLEAR' : 'RANK 7 / FINAL',
    };
  }

  const progress = rankProgress(game);
  const definition = progress?.definition;
  if (!definition || !progress?.mandatory) {
    return {
      signature: `rank-${rank}|loading`,
      title: `Rank ${rank + 1}への条件を確認中`,
      body: 'Factory / Exploration / Researchの現在条件を確認しています。',
      progress: `RANK ${rank} / 7`,
    };
  }

  const mandatory = `${progress.mandatory.done ? '✓' : '○'} ${progress.mandatory.label}`;
  const optional = optionalSummary(progress);
  const ready = progress.eligible ? '条件達成。自動Rank Upします。' : '条件を満たすと自動でRank Upします。';
  const body = [mandatory, optional, ready].filter(Boolean).join('　');
  const optionalProgress = progress.optionalRequired ? ` · 追加 ${progress.optionalDone}/${progress.optionalRequired}` : '';

  return {
    signature: [
      rank,
      Boolean(progress.mandatory.done),
      progress.optionalDone,
      progress.optionalRequired,
      Boolean(progress.eligible),
      body,
    ].join('|'),
    title: `Rank ${definition.nextRank} — ${definition.title}`,
    body,
    progress: `RANK ${rank} / 7 · 必須 ${progress.mandatory.done ? '✓' : '○'}${optionalProgress}`,
  };
}

function renderRankPanel(panel, game) {
  const goal = rankGoal(game);
  if (panel.dataset.rankGoalSignature === goal.signature) return;
  panel.dataset.rankGoalSignature = goal.signature;
  panel.querySelector('[data-rank-goal-title]').textContent = goal.title;
  panel.querySelector('[data-rank-goal-body]').textContent = goal.body;
  panel.querySelector('[data-rank-goal-progress]').textContent = goal.progress;
}

function syncObjectiveOwnership() {
  const stack = document.querySelector(STACK_SELECTOR);
  const game = currentGame();
  if (!stack || !game) return false;

  ensureOwnershipStyle();
  const rankPanel = ensureRankPanel(stack);
  const fresh = stack.querySelector(FRESH_SELECTOR);

  if (fresh) {
    stack.dataset.objectiveOwner = 'fresh';
    rankPanel.hidden = true;
    return true;
  }

  stack.dataset.objectiveOwner = 'rank';
  renderRankPanel(rankPanel, game);
  rankPanel.hidden = false;
  return true;
}

function boot() {
  if (!window.__scrapFactoryBooted || !window.__scrapFactoryRuntime || !document.querySelector(STACK_SELECTOR)) {
    window.setTimeout(boot, 100);
    return;
  }

  syncObjectiveOwnership();
  window.setInterval(syncObjectiveOwnership, SYNC_MS);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
