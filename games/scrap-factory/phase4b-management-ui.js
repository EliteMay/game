import { SAVE_KEY } from './config.js';

let analyzeFactoryFn = null;

function readGame() {
  try {
    const root = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    return root?.games?.['scrap-factory'] || null;
  } catch {
    return null;
  }
}

async function getAnalyzer() {
  if (analyzeFactoryFn) return analyzeFactoryFn;
  const module = await import('./factory-management.js');
  analyzeFactoryFn = module.analyzeFactory;
  return analyzeFactoryFn;
}

function statCard(label, value, note = '') {
  const article = document.createElement('article');
  article.className = 'management-stat';
  article.dataset.phase4bOps = 'true';
  article.innerHTML = `<span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ''}`;
  return article;
}

function bottleneckSection(factory) {
  const section = document.createElement('section');
  section.className = 'management-section';
  section.dataset.phase4bOps = 'true';
  const bottlenecks = (factory.alerts || []).filter((alert) => alert.kind === 'bottleneck');
  const rows = bottlenecks.slice(0, 8).map((alert) => `
    <article class="factory-alert factory-alert--${alert.severity}">
      <strong>${alert.title}</strong><span>${alert.detail}</span>
    </article>
  `).join('') || '<p class="management-empty">現在、重大な生産ボトルネックは検出されていません。</p>';
  section.innerHTML = `
    <div class="management-section__head">
      <div><span>PHASE 4 / OPERATIONS</span><h3>生産統計・ボトルネック</h3></div>
      <strong>${bottlenecks.length}</strong>
    </div>
    <p class="management-help">理論生産能力、搬送可能量、Machine稼働率、Power / Storage / Output滞留を同じFactory snapshotから確認します。</p>
    <div class="factory-alert-list">${rows}</div>
  `;
  return section;
}

async function renderAdvancedOps() {
  const panel = document.querySelector('#factory-management-panel');
  const content = document.querySelector('#factory-management-content');
  const grid = content?.querySelector('.management-stat-grid');
  if (!panel || panel.hidden || !content || !grid) return;

  content.querySelectorAll('[data-phase4b-ops="true"]').forEach((node) => node.remove());

  const game = readGame();
  if (!game) return;
  const analyzeFactory = await getAnalyzer();
  const factory = analyzeFactory(game);
  const production = factory.production || {};

  grid.append(
    statCard('理論生産能力', `${Number(production.theoreticalPerMinute || 0).toFixed(1)}/分`, '全Production Machine合計'),
    statCard('搬送対応能力', `${Number(production.routeSupportedPerMinute || 0).toFixed(1)}/分`, '有効な出力Routeで運べる範囲'),
    statCard('Machine稼働率', `${Math.round(Number(production.utilization || 0) * 100)}%`, `待機 ${factory.waitingMachines || 0}台`),
    statCard('Smart Sorter', `${production.smartSorters || 0}台`, '正面=高度 / 左=中間・製品 / 右=原料'),
  );
  content.append(bottleneckSection(factory));
}

function schedule() {
  window.setInterval(() => {
    renderAdvancedOps().catch(() => {});
  }, 1000);
  document.addEventListener('click', () => {
    window.setTimeout(() => renderAdvancedOps().catch(() => {}), 50);
  });
}

if (typeof window !== 'undefined') {
  window.setTimeout(schedule, 0);
}
