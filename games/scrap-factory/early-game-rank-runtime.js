import { claimRankUp, rankProgress } from './progression.js';

const MAX_RANK = 7;
const CHECK_INTERVAL_MS = 250;
const CELEBRATION_VISIBLE_MS = 2800;
const CELEBRATION_EXIT_MS = 260;

const celebrationQueue = [];
let celebrationActive = false;
let celebrationRetry = null;

export function advanceAutomaticRank(game) {
  const fromRank = Math.max(1, Number(game?.progression?.progressionRank || 1));
  if (fromRank >= MAX_RANK) return { changed: false, reason: 'rank-cap', fromRank };

  const progress = rankProgress(game);
  if (!progress.eligible) return { changed: false, reason: 'requirements', fromRank, progress };

  const completedDefinition = progress.definition || null;
  const result = claimRankUp(game);
  if (!result.changed) return { ...result, fromRank, completedDefinition };

  return {
    ...result,
    changed: true,
    fromRank,
    toRank: Number(game.progression?.progressionRank || fromRank + 1),
    completedDefinition,
  };
}

// Compatibility export for older tests/imports. Rank automation is no longer
// Fresh-Start-only; every Rank 1-6 promotion uses the same condition contract.
export function advanceFreshEarlyRank(game) {
  return advanceAutomaticRank(game);
}

export function rankUpPresentation(result) {
  const rank = Math.max(2, Number(result?.toRank || result?.rank || 2));
  const definition = result?.completedDefinition || null;
  const rewards = Array.isArray(definition?.rewards) ? definition.rewards.filter(Boolean) : [];
  return {
    eyebrow: 'CONDITIONS COMPLETE / RANK UP',
    title: `RANK ${rank}`,
    subtitle: rank >= MAX_RANK ? 'FINAL CHAPTER UNLOCKED' : (definition?.title || 'FACTORY PROGRESSION'),
    detail: rewards.length ? `解放: ${rewards.join(' / ')}` : '次のFactory Objectiveが解放されました。',
  };
}

function gameplayReady() {
  const hud = document.querySelector('#hud');
  const boot = document.querySelector('#boot-screen');
  return Boolean(hud && !hud.hidden && boot?.hidden);
}

function blockingOverlayOpen() {
  return [...document.querySelectorAll(
    '.overlay-panel, .factory-management-panel, .progression-panel, .home-system-panel, .post-clear-optimization-panel',
  )].some((panel) => panel.id !== 'rank-up-celebration' && !panel.hidden);
}

function ensureCelebrationStyles() {
  if (document.querySelector('style[data-rank-up-celebration]')) return;
  const style = document.createElement('style');
  style.dataset.rankUpCelebration = 'true';
  style.textContent = `
    .rank-up-celebration {
      position:absolute;
      inset:0;
      z-index:80;
      display:grid;
      place-items:center;
      pointer-events:none;
      opacity:0;
      transform:scale(.985);
      transition:opacity .2s ease, transform .24s ease;
    }
    .rank-up-celebration[hidden] { display:none; }
    .rank-up-celebration.is-visible { opacity:1; transform:scale(1); }
    .rank-up-celebration__card {
      width:min(620px,calc(100% - 40px));
      padding:26px 30px 28px;
      border:1px solid rgb(255 255 255 / .16);
      border-top:4px solid var(--accent,#d4b74f);
      background:linear-gradient(180deg,rgb(28 34 35 / .96),rgb(18 23 24 / .96));
      box-shadow:0 24px 80px rgb(0 0 0 / .44);
      text-align:center;
      backdrop-filter:blur(10px);
    }
    .rank-up-celebration__card > span {
      display:block;
      color:var(--accent,#d4b74f);
      font-size:.62rem;
      font-weight:900;
      letter-spacing:.17em;
    }
    .rank-up-celebration__card h2 {
      margin:8px 0 2px;
      color:#f4f3ea;
      font-size:clamp(2.6rem,8vw,5.4rem);
      line-height:.95;
      letter-spacing:-.055em;
    }
    .rank-up-celebration__card strong {
      display:block;
      margin-top:8px;
      color:#d7d9d2;
      font-size:.82rem;
      letter-spacing:.08em;
    }
    .rank-up-celebration__card p {
      margin:18px auto 0;
      max-width:520px;
      color:#aeb5af;
      font-size:.74rem;
      line-height:1.65;
    }
    body[data-reduce-motion="true"] .rank-up-celebration { transition:none; transform:none; }
    @media (max-width:620px) {
      .rank-up-celebration__card { padding:22px 20px 24px; }
    }
  `;
  document.head.append(style);
}

function ensureCelebrationSurface() {
  let panel = document.querySelector('#rank-up-celebration');
  if (panel) return panel;
  const shell = document.querySelector('.game-shell');
  if (!shell) return null;

  ensureCelebrationStyles();
  panel = document.createElement('aside');
  panel.id = 'rank-up-celebration';
  panel.className = 'rank-up-celebration';
  panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  panel.setAttribute('aria-atomic', 'true');
  panel.innerHTML = `
    <div class="rank-up-celebration__card">
      <span data-rank-up-eyebrow></span>
      <h2 data-rank-up-title></h2>
      <strong data-rank-up-subtitle></strong>
      <p data-rank-up-detail></p>
    </div>
  `;
  shell.append(panel);
  return panel;
}

function scheduleCelebrationPump(delay = 180) {
  if (celebrationRetry) return;
  celebrationRetry = window.setTimeout(() => {
    celebrationRetry = null;
    pumpCelebration();
  }, delay);
}

function pumpCelebration() {
  if (celebrationActive || celebrationQueue.length === 0) return;
  if (!gameplayReady() || blockingOverlayOpen()) {
    scheduleCelebrationPump();
    return;
  }

  const panel = ensureCelebrationSurface();
  if (!panel) {
    scheduleCelebrationPump();
    return;
  }

  const presentation = celebrationQueue.shift();
  panel.querySelector('[data-rank-up-eyebrow]').textContent = presentation.eyebrow;
  panel.querySelector('[data-rank-up-title]').textContent = presentation.title;
  panel.querySelector('[data-rank-up-subtitle]').textContent = presentation.subtitle;
  panel.querySelector('[data-rank-up-detail]').textContent = presentation.detail;

  celebrationActive = true;
  panel.hidden = false;
  requestAnimationFrame(() => panel.classList.add('is-visible'));

  window.setTimeout(() => {
    panel.classList.remove('is-visible');
    window.setTimeout(() => {
      panel.hidden = true;
      celebrationActive = false;
      pumpCelebration();
    }, CELEBRATION_EXIT_MS);
  }, CELEBRATION_VISIBLE_MS);
}

function queueRankCelebration(result) {
  celebrationQueue.push(rankUpPresentation(result));
  pumpCelebration();
}

function installAutomaticRankRuntime() {
  let timer = null;

  const stop = () => {
    if (!timer) return;
    window.clearInterval(timer);
    timer = null;
  };

  const tick = () => {
    const runtime = window.__scrapFactoryRuntime;
    const game = runtime?.getGame?.();
    if (!game) return;

    const result = advanceAutomaticRank(game);
    if (result.changed) {
      runtime.persist?.(`Automatic Rank ${result.toRank}`);
      runtime.renderAll?.();
      queueRankCelebration(result);
    }

    const rank = Math.max(1, Number(game?.progression?.progressionRank || 1));
    if (rank >= MAX_RANK) stop();
  };

  tick();
  const game = window.__scrapFactoryRuntime?.getGame?.();
  if (Number(game?.progression?.progressionRank || 1) < MAX_RANK) {
    timer = window.setInterval(tick, CHECK_INTERVAL_MS);
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installAutomaticRankRuntime();
}
