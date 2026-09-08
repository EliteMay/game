import {
  ONBOARDING_VERSION,
  applyUnlockStarterResources,
  getOnboardingStep,
} from './onboarding-core.js';

const STORAGE_KEY = 'elitemay-orbloom-onboarding-v3';
const $ = (selector) => document.querySelector(selector);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

let runtime = null;
let currentStep = null;
let currentSignature = '';
let layer = null;
let card = null;
let ring = null;
let ringLabel = null;
let progressBar = null;
let progressLabel = null;
let stepLabel = null;
let title = null;
let copy = null;
let completeButton = null;
let masks = [];
let helpPanel = null;
let pendingRewards = [];

boot();

function boot() {
  if (!window.__orbloomRuntime || !$('#hud') || !$('#boot-screen')) {
    setTimeout(boot, 40);
    return;
  }

  runtime = window.__orbloomRuntime;
  tuneBootScreen();
  buildTutorialUi();
  buildHelpUi();
  window.addEventListener('resize', positionTutorial);
  window.addEventListener('scroll', positionTutorial, { passive: true });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && helpPanel && !helpPanel.hidden) helpPanel.hidden = true;
  });

  tick();
  setInterval(tick, 160);
}

function tuneBootScreen() {
  const note = $('.boot-note');
  if (note) note.textContent = '最初の操作からゲーム内で1つずつ案内します。実際に操作すると次へ進みます。';
}

function buildTutorialUi() {
  layer = document.createElement('div');
  layer.id = 'orbloom-onboarding';
  layer.className = 'onboarding-layer';
  layer.hidden = true;
  layer.innerHTML = `
    <div class="onboarding-mask onboarding-mask--top" aria-hidden="true"></div>
    <div class="onboarding-mask onboarding-mask--left" aria-hidden="true"></div>
    <div class="onboarding-mask onboarding-mask--right" aria-hidden="true"></div>
    <div class="onboarding-mask onboarding-mask--bottom" aria-hidden="true"></div>
    <div class="onboarding-target-ring" aria-hidden="true"><span>CLICK</span></div>
    <section class="onboarding-coach" aria-live="polite" aria-label="Orbloomチュートリアル">
      <header class="onboarding-coach__header">
        <span class="onboarding-step-label">GUIDE 1 / 7</span>
        <button class="onboarding-skip" type="button">SKIP</button>
      </header>
      <h2></h2>
      <p class="onboarding-copy"></p>
      <div class="onboarding-progress" aria-hidden="true"><i></i></div>
      <div class="onboarding-progress-label"></div>
      <button class="onboarding-complete primary-button" type="button" hidden>自由に育てる</button>
    </section>
  `;
  document.body.append(layer);

  masks = [...layer.querySelectorAll('.onboarding-mask')];
  ring = layer.querySelector('.onboarding-target-ring');
  ringLabel = ring.querySelector('span');
  card = layer.querySelector('.onboarding-coach');
  progressBar = layer.querySelector('.onboarding-progress i');
  progressLabel = layer.querySelector('.onboarding-progress-label');
  stepLabel = layer.querySelector('.onboarding-step-label');
  title = layer.querySelector('h2');
  copy = layer.querySelector('.onboarding-copy');
  completeButton = layer.querySelector('.onboarding-complete');

  layer.querySelector('.onboarding-skip').addEventListener('click', () => {
    const state = runtime.getState();
    writeRecord(state, 'skipped');
    layer.hidden = true;
    showToast('チュートリアルをスキップしました。HELPからいつでも確認できます。');
  });

  completeButton.addEventListener('click', () => {
    const state = runtime.getState();
    writeRecord(state, 'complete');
    layer.hidden = true;
    showToast('基本ループを覚えました。次はNEXT OBJECTIVEへ。', 'success');
  });
}

function buildHelpUi() {
  const topActions = $('.top-actions');
  const button = document.createElement('button');
  button.id = 'open-how-to-play';
  button.className = 'icon-action onboarding-help-button';
  button.type = 'button';
  button.textContent = 'HELP';
  button.setAttribute('aria-label', '遊び方を開く');
  topActions?.prepend(button);

  helpPanel = document.createElement('section');
  helpPanel.id = 'how-to-play-panel';
  helpPanel.className = 'onboarding-help-panel';
  helpPanel.hidden = true;
  helpPanel.setAttribute('aria-label', 'Orbloomの遊び方');
  helpPanel.innerHTML = `
    <div class="onboarding-help-card" role="dialog" aria-modal="true" aria-labelledby="how-to-play-title">
      <header>
        <div><p class="panel-kicker">HOW TO PLAY</p><h2 id="how-to-play-title">Orbloomの基本ループ</h2></div>
        <button class="close-button" type="button" data-help-close>×</button>
      </header>
      <p class="onboarding-help-lead">迷ったら、左の <strong>NEXT OBJECTIVE</strong> を次のゴールにする。</p>
      <ol class="onboarding-loop-list">
        <li><span>01</span><div><strong>資源を作る</strong><small>最初だけGENERATE MATTERで手動生成。</small></div></li>
        <li><span>02</span><div><strong>上の資源パネルを押してGeneratorを買う</strong><small>資源欄は表示だけではなく購入ボタン。Generatorが自動生産する。</small></div></li>
        <li><span>03</span><div><strong>増えた資源を再投資する</strong><small>Generatorを強化すると /s が伸び、次の購入が速くなる。</small></div></li>
        <li><span>04</span><div><strong>条件が揃ったらPlanet Evolution</strong><small>左の条件を満たすと、新資源・Biome・Systemが順番に解放される。</small></div></li>
        <li><span>05</span><div><strong>Life ScanでSpeciesを見つける</strong><small>SCAN FOR LIFEのコストを貯め、発見したSpeciesをBiomeへ配置する。</small></div></li>
        <li><span>06</span><div><strong>新しいSystemも同じ成長へ戻す</strong><small>Biome・Species・Research・Expeditionは惑星の生産と進化を強くする。</small></div></li>
      </ol>
      <div class="onboarding-help-tip"><strong>覚えるのはこれだけ</strong><span>作る → 買う → 自動化 → 再投資 → 進化 → 発見して配置 → また加速</span></div>
      <div class="onboarding-help-actions">
        <button class="secondary-button" type="button" data-guide-resume>現在地点のガイドを表示</button>
        <button class="primary-button" type="button" data-help-close>ゲームに戻る</button>
      </div>
    </div>
  `;
  document.body.append(helpPanel);

  button.addEventListener('click', () => {
    helpPanel.hidden = false;
    layer.hidden = true;
  });
  helpPanel.querySelectorAll('[data-help-close]').forEach((close) => close.addEventListener('click', () => {
    helpPanel.hidden = true;
  }));
  helpPanel.querySelector('[data-guide-resume]').addEventListener('click', () => {
    clearRecord(runtime.getState());
    helpPanel.hidden = true;
    currentSignature = '';
    tick();
  });
}

function tick() {
  if (!runtime) return;
  const state = runtime.getState();
  const starter = applyUnlockStarterResources(state);
  if (starter.changed) {
    runtime.save();
    runtime.renderAll();
    pendingRewards.push(...starter.rewards);
  }

  flushRewards();

  const record = readRecord(state);
  const hud = $('#hud');
  const bootScreen = $('#boot-screen');
  const blocked = !hud || hud.hidden || !bootScreen?.hidden || isBlockingOverlayOpen();

  if (record || blocked) {
    if (layer) layer.hidden = true;
    return;
  }

  const scan = $('#scan-life');
  const scanCostLabel = $('#scan-cost')?.textContent?.trim() || '';
  const step = getOnboardingStep(state, {
    scanReady: Boolean(scan && !scan.disabled),
    scanCostLabel,
    scanResourceTarget: scanResourceTarget(scanCostLabel),
  });
  if (!step) {
    layer.hidden = true;
    return;
  }

  renderStep(step);
}

function renderStep(step) {
  currentStep = step;
  const signature = [step.id, step.title, step.body, step.progressLabel, step.target, step.verb, step.complete ? '1' : '0'].join('|');
  layer.hidden = false;

  if (signature !== currentSignature) {
    currentSignature = signature;
    stepLabel.textContent = `GUIDE ${step.step} / ${step.total}`;
    title.textContent = step.title;
    copy.textContent = step.body;
    progressLabel.textContent = step.progressLabel || '';
    progressBar.style.transform = `scaleX(${clamp(Number(step.progress || 0), 0, 1)})`;
    ringLabel.textContent = step.verb || 'CLICK';
    completeButton.hidden = !step.complete;
  } else {
    progressBar.style.transform = `scaleX(${clamp(Number(step.progress || 0), 0, 1)})`;
    progressLabel.textContent = step.progressLabel || '';
  }

  requestAnimationFrame(positionTutorial);
}

function positionTutorial() {
  if (!layer || layer.hidden || !currentStep) return;
  const target = tutorialTarget(currentStep.target);
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const visible = rect.bottom > 0 && rect.top < vh && rect.right > 0 && rect.left < vw;

  if (!visible) {
    ring.hidden = true;
    masks.forEach((mask) => { mask.hidden = true; });
    card.style.left = '12px';
    card.style.top = '12px';
    card.style.width = `${Math.min(390, vw - 24)}px`;
    return;
  }

  ring.hidden = false;
  masks.forEach((mask) => { mask.hidden = false; });

  const pad = 7;
  const left = clamp(rect.left - pad, 0, vw);
  const top = clamp(rect.top - pad, 0, vh);
  const right = clamp(rect.right + pad, 0, vw);
  const bottom = clamp(rect.bottom + pad, 0, vh);

  setBox(masks[0], 0, 0, vw, top);
  setBox(masks[1], 0, top, left, Math.max(0, bottom - top));
  setBox(masks[2], right, top, Math.max(0, vw - right), Math.max(0, bottom - top));
  setBox(masks[3], 0, bottom, vw, Math.max(0, vh - bottom));
  setBox(ring, left, top, Math.max(0, right - left), Math.max(0, bottom - top));

  const cardWidth = Math.min(390, vw - 24);
  card.style.width = `${cardWidth}px`;
  card.style.left = '12px';
  card.style.top = '12px';
  const cardHeight = card.offsetHeight || 220;
  let cardTop = bottom + 14;
  if (cardTop + cardHeight > vh - 12) cardTop = top - cardHeight - 14;
  if (cardTop < 12) cardTop = 12;

  let cardLeft = rect.left + rect.width / 2 - cardWidth / 2;
  cardLeft = clamp(cardLeft, 12, Math.max(12, vw - cardWidth - 12));

  const overlapsTarget = cardLeft < right && cardLeft + cardWidth > left && cardTop < bottom && cardTop + cardHeight > top;
  if (overlapsTarget) {
    if (right + 14 + cardWidth <= vw - 12) cardLeft = right + 14;
    else if (left - 14 - cardWidth >= 12) cardLeft = left - cardWidth - 14;
  }

  card.style.left = `${cardLeft}px`;
  card.style.top = `${cardTop}px`;
}

function tutorialTarget(id) {
  if (id === 'manual') return $('#manual-matter');
  if (id === 'matter-generator') return $('.resource-cell[data-id="matter"]');
  if (id === 'water-generator') return $('.resource-cell[data-id="water"]');
  if (id === 'oxygen-generator') return $('.resource-cell[data-id="oxygen"]');
  if (id === 'energy-generator') return $('.resource-cell[data-id="energy"]');
  if (id === 'scan') return $('#scan-life');
  if (id === 'species-placement') return $('[data-species-biome]') || $('.dock-tabs [data-tab="species"]');
  if (id === 'evolve') return $('#evolve-planet');
  if (id === 'management') return $('.management-dock');
  return $('.stage-panel');
}

function scanResourceTarget(label) {
  if (label.startsWith('MAT')) return 'matter-generator';
  if (label.startsWith('H₂O')) return 'water-generator';
  if (label.startsWith('O₂')) return 'oxygen-generator';
  if (label.startsWith('ENG')) return 'energy-generator';
  return null;
}

function setBox(node, left, top, width, height) {
  node.style.left = `${left}px`;
  node.style.top = `${top}px`;
  node.style.width = `${width}px`;
  node.style.height = `${height}px`;
}

function isBlockingOverlayOpen() {
  if (helpPanel && !helpPanel.hidden) return true;
  return ['#settings-panel', '#offline-panel', '#evolution-panel'].some((selector) => {
    const node = $(selector);
    return node && !node.hidden;
  });
}

function readRecord(state) {
  try {
    const record = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!record || record.version !== ONBOARDING_VERSION) return null;
    if (record.saveCreatedAt !== state.createdAt) return null;
    if (!['complete', 'skipped'].includes(record.status)) return null;
    return record;
  } catch {
    return null;
  }
}

function writeRecord(state, status) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: ONBOARDING_VERSION,
      saveCreatedAt: state.createdAt,
      status,
      updatedAt: new Date().toISOString(),
    }));
  } catch {}
}

function clearRecord(state) {
  try {
    const record = readRecord(state);
    if (!record) return;
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function flushRewards() {
  if (!pendingRewards.length || $('#hud')?.hidden || !$('#boot-screen')?.hidden) return;
  for (const reward of pendingRewards.splice(0)) {
    showToast(`NEW RESOURCE · ${reward.name} +${reward.amount} starter reserve`, 'success');
  }
}

function showToast(message, type = '') {
  const stack = $('#toast-stack');
  if (!stack) return;
  const node = document.createElement('div');
  node.className = `toast ${type ? `is-${type}` : ''}`;
  node.textContent = message;
  stack.append(node);
  setTimeout(() => node.remove(), 3400);
}
