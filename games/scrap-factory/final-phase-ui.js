import {
  MEGA_FACTORY_STABLE_SECONDS,
  acknowledgeMainClear,
  advanceMegaFactoryStability,
  finalPhaseStatus,
} from './final-phase.js';
import { getRuntimeGame, persistRuntimeGame } from './storage.js';

const TICK_MS = 1000;
const PERSIST_BUCKET_SECONDS = 15;
let lastTick = performance.now();
let lastPersistBucket = -1;
let clearOverlay = null;
let carrierAcquired = false;

function gameplayReady() {
  const hud = document.querySelector('#hud');
  const boot = document.querySelector('#boot-screen');
  return Boolean(window.__scrapFactoryBooted && hud && !hud.hidden && boot?.hidden);
}

function ensureStyles() {
  if (document.querySelector('style[data-final-phase-ui]')) return;
  const style = document.createElement('style');
  style.dataset.finalPhaseUi = 'true';
  style.textContent = `
    .final-phase-hud {
      position:absolute; right:20px; top:276px; min-width:178px; padding:8px 10px;
      border:1px solid rgb(255 255 255 / .14); border-left:3px solid var(--accent);
      background:rgb(20 24 25 / .84); color:#eef0e9; pointer-events:none; backdrop-filter:blur(8px);
      display:grid; gap:3px; font-variant-numeric:tabular-nums;
    }
    .final-phase-hud span { color:var(--accent); font-size:.56rem; font-weight:900; letter-spacing:.11em; }
    .final-phase-hud strong { font-size:.78rem; }
    .final-phase-hud small { color:#9fa7a1; font-size:.6rem; }
    .final-phase-meter { height:4px; background:#313839; overflow:hidden; }
    .final-phase-meter i { display:block; width:var(--final-progress,0%); height:100%; background:var(--accent); }
    .main-clear-card { width:min(620px,100%); border-top:4px solid var(--accent); }
    .main-clear-card h2 { margin:.25rem 0 .75rem; font-size:clamp(2rem,6vw,4rem); letter-spacing:-.045em; }
    .main-clear-card p { color:#b9c0ba; line-height:1.7; }
    .main-clear-summary { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin:18px 0; }
    .main-clear-summary div { padding:11px; border:1px solid #3d4445; background:#252b2c; display:grid; gap:4px; }
    .main-clear-summary span { color:#8f9891; font-size:.56rem; letter-spacing:.1em; }
    .main-clear-summary strong { font-size:.82rem; }
    .final-phase-inline { margin-top:10px; padding:11px; border:1px solid #41494a; background:#202627; }
    .final-phase-inline__head { display:flex; justify-content:space-between; gap:10px; align-items:center; }
    .final-phase-inline__head span { color:var(--accent); font-size:.6rem; font-weight:900; letter-spacing:.1em; }
    .final-phase-inline__head strong { font-size:.72rem; }
    .final-phase-inline p { margin:7px 0 0 !important; font-size:.72rem; }
    @media (max-width:700px) { .final-phase-hud { right:12px; top:270px; min-width:150px; } .main-clear-summary { grid-template-columns:1fr; } }
  `;
  document.head.append(style);
}

function ensureHud() {
  const hud = document.querySelector('#hud');
  if (!hud || document.querySelector('#final-phase-hud')) return;
  const plate = document.createElement('aside');
  plate.id = 'final-phase-hud';
  plate.className = 'final-phase-hud';
  plate.hidden = true;
  hud.append(plate);
}

function ensureClearOverlay() {
  if (clearOverlay) return clearOverlay;
  const shell = document.querySelector('.game-shell');
  if (!shell) return null;
  const panel = document.createElement('section');
  panel.id = 'main-clear-panel';
  panel.className = 'overlay-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Scrap Factory Main Clear');
  panel.innerHTML = `
    <div class="panel-card panel-card--compact main-clear-card">
      <p class="panel-kicker">MAIN CLEAR / INDUSTRIAL NETWORK ONLINE</p>
      <h2>MEGA FACTORY<br>STABLE.</h2>
      <p>Autonomous Industrial Coreの完全自動Lineを維持し、Mega Factoryの連続安定稼働を達成しました。Scrap FactoryのMain Goalは完了です。</p>
      <div class="main-clear-summary">
        <div><span>STABLE RUN</span><strong>${MEGA_FACTORY_STABLE_SECONDS} sec</strong></div>
        <div><span>RANK</span><strong>7 / FINAL</strong></div>
        <div><span>NEXT</span><strong>OPTIMIZATION</strong></div>
      </div>
      <p>Clear後も同じSaveのまま工場を拡張・最適化できます。</p>
      <button id="main-clear-continue" class="primary-action" type="button">工場開発を続ける</button>
    </div>`;
  shell.append(panel);
  clearOverlay = panel;
  panel.querySelector('#main-clear-continue')?.addEventListener('click', closeClearOverlay);
  return panel;
}

function otherOverlayOpen() {
  return [...document.querySelectorAll('.overlay-panel, .factory-management-panel, .progression-panel')]
    .some((panel) => panel !== clearOverlay && !panel.hidden);
}

function acquireOverlayCarrier() {
  if (!gameplayReady() || otherOverlayOpen()) return false;
  const guideButton = document.querySelector('#open-guide-hud');
  const guidePanel = document.querySelector('#guide-panel');
  if (!guideButton || !guidePanel) return false;
  guideButton.click();
  guidePanel.hidden = true;
  carrierAcquired = true;
  return true;
}

function showClearOverlay(game) {
  const panel = ensureClearOverlay();
  if (!panel || !panel.hidden || !acquireOverlayCarrier()) return false;
  panel.hidden = false;
  return true;
}

function closeClearOverlay() {
  const game = getRuntimeGame();
  if (game && acknowledgeMainClear(game)) persistRuntimeGame();
  if (clearOverlay) clearOverlay.hidden = true;
  if (carrierAcquired) document.querySelector('#close-guide')?.click();
  carrierAcquired = false;
  renderAll();
}

function formatSeconds(value) {
  const seconds = Math.max(0, Math.ceil(Number(value || 0)));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}:${String(rest).padStart(2, '0')}` : `${rest}s`;
}

function renderHud(game) {
  ensureHud();
  const hud = document.querySelector('#final-phase-hud');
  if (!hud || !game) return;
  const rank = Number(game?.progression?.progressionRank || 1);
  if (rank < 7) {
    hud.hidden = true;
    return;
  }
  const status = finalPhaseStatus(game);
  hud.hidden = false;
  if (status.cleared) {
    hud.innerHTML = '<span>FINAL PHASE</span><strong>MAIN CLEAR</strong><small>Optimization継続可能</small><div class="final-phase-meter"><i style="--final-progress:100%"></i></div>';
    return;
  }
  if (!status.analysis.finalAutomation.qualifies) {
    hud.innerHTML = '<span>FINAL PHASE</span><strong>STEP 8 / AUTOMATION</strong><small>最終Line完成が必要</small><div class="final-phase-meter"><i style="--final-progress:0%"></i></div>';
    return;
  }
  const percent = Math.round(status.progress * 100);
  const detail = status.analysis.stable
    ? `連続稼働 ${formatSeconds(status.stableSeconds)} / ${formatSeconds(status.targetSeconds)}`
    : status.analysis.missing[0]?.label || '安定条件を確認中';
  hud.innerHTML = `<span>MEGA FACTORY</span><strong>${status.analysis.stable ? 'STABLE RUN' : 'INTERRUPTED'}</strong><small>${detail}</small><div class="final-phase-meter"><i style="--final-progress:${percent}%"></i></div>`;
}

function patchProgressionPanel(game) {
  const section = document.querySelector('#progression-panel .progression-section--cap');
  if (!section || !game) return;
  const status = finalPhaseStatus(game);
  const headStatus = section.querySelector('.progression-section__head > strong');
  if (headStatus) headStatus.textContent = status.cleared ? 'MAIN CLEAR' : status.analysis.finalAutomation.qualifies ? 'STEP 9 ACTIVE' : headStatus.textContent;

  let inline = section.querySelector('[data-final-phase-status]');
  if (!inline) {
    inline = document.createElement('div');
    inline.className = 'final-phase-inline';
    inline.dataset.finalPhaseStatus = 'true';
    section.append(inline);
  }
  const missing = status.analysis.missing.map((entry) => entry.label).join(' / ');
  inline.innerHTML = `
    <div class="final-phase-inline__head"><span>STEP 9 → 10 / MEGA FACTORY</span><strong>${status.cleared ? 'MAIN CLEAR' : `${Math.round(status.progress * 100)}%`}</strong></div>
    <div class="final-phase-meter"><i style="--final-progress:${Math.round(status.progress * 100)}%"></i></div>
    <p>${status.cleared
      ? 'Main Clear達成済み。同じSaveでFactory Optimizationを続行できます。'
      : status.analysis.finalAutomation.qualifies
        ? status.analysis.stable
          ? `${MEGA_FACTORY_STABLE_SECONDS}秒の連続安定稼働を確認中。残り ${formatSeconds(status.remainingSeconds)}。`
          : `安定稼働が中断中: ${missing || 'Factory状態を確認してください'}。連続時間は0から再計測します。`
        : 'Step 8のAutonomous Industrial Core完全自動Lineを先に完成させてください。'}</p>`;

  [...section.querySelectorAll('p')].forEach((paragraph) => {
    if (paragraph === inline.querySelector('p')) return;
    if (paragraph.textContent?.includes('Requirement Step 9')) {
      paragraph.textContent = 'Step 9はMega Factoryの連続安定稼働、Step 10はMain Clearです。Final Phase runtimeが現在のFactory状態を監視します。';
    }
  });
}

function patchAutomationConsole(game) {
  const section = [...document.querySelectorAll('.automation-console-section--wide')]
    .find((candidate) => candidate.querySelector('h3')?.textContent?.trim() === 'Final Automation Contract');
  if (!section || !game) return;
  let inline = section.querySelector('[data-mega-factory-console]');
  if (!inline) {
    inline = document.createElement('div');
    inline.className = 'final-phase-inline';
    inline.dataset.megaFactoryConsole = 'true';
    section.append(inline);
  }
  const status = finalPhaseStatus(game);
  const missing = status.analysis.missing.map((entry) => entry.label).join(' / ');
  inline.innerHTML = `
    <div class="final-phase-inline__head"><span>MEGA FACTORY STABILITY</span><strong>${status.cleared ? 'MAIN CLEAR' : `${Math.round(status.progress * 100)}%`}</strong></div>
    <div class="final-phase-meter"><i style="--final-progress:${Math.round(status.progress * 100)}%"></i></div>
    <p>${status.cleared ? 'Main Clear達成済み。' : status.analysis.stable ? `連続安定稼働 ${formatSeconds(status.stableSeconds)} / ${formatSeconds(status.targetSeconds)}` : `未安定: ${missing || 'Step 8未完成'}`}</p>`;
}

function renderAll() {
  const game = getRuntimeGame();
  if (!game) return;
  renderHud(game);
  patchProgressionPanel(game);
  patchAutomationConsole(game);
}

function maybePersist(result) {
  if (!result?.changed) return;
  const stable = Math.floor(Number(result.state.megaFactoryStableSeconds || 0));
  const bucket = Math.floor(stable / PERSIST_BUCKET_SECONDS);
  const reset = stable === 0 && lastPersistBucket > 0;
  if (result.justCleared || reset || bucket > lastPersistBucket) {
    persistRuntimeGame();
    lastPersistBucket = bucket;
  }
}

function tick() {
  const now = performance.now();
  const rawDelta = Math.max(0, (now - lastTick) / 1000);
  lastTick = now;
  const game = getRuntimeGame();
  if (!game) return;

  if (!gameplayReady() || document.visibilityState !== 'visible') {
    renderAll();
    return;
  }

  const result = advanceMegaFactoryStability(game, rawDelta);
  maybePersist(result);
  renderAll();

  if (result.justCleared) {
    persistRuntimeGame();
    showClearOverlay(game);
  } else if (result.cleared && !result.state.clearAcknowledgedAt && clearOverlay?.hidden !== false) {
    showClearOverlay(game);
  }
}

function waitForGame() {
  if (!window.__scrapFactoryBooted || !getRuntimeGame()) {
    window.setTimeout(waitForGame, 120);
    return;
  }
  ensureStyles();
  ensureHud();
  ensureClearOverlay();
  renderAll();
  const game = getRuntimeGame();
  if (game) lastPersistBucket = Math.floor(Number(game.finalChapter?.megaFactoryStableSeconds || 0) / PERSIST_BUCKET_SECONDS);
  window.setInterval(tick, TICK_MS);

  const observer = new MutationObserver(() => renderAll());
  observer.observe(document.body, { childList: true, subtree: true });
}

waitForGame();
