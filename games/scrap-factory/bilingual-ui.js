// User-facing language compatibility layer.
// Keep established English game/system terminology, but always pair unclear English with Japanese.

const EXACT_LABELS = new Map([
  ['GAME 01 / INDUSTRIAL SALVAGE', 'GAME 01 / INDUSTRIAL SALVAGE（ゲーム01 / 産業廃材回収）'],
  ['INITIAL CONTRACT', 'INITIAL CONTRACT（初期目標）'],
  ['LOADING SYSTEM…', 'LOADING SYSTEM…（システム読込中）'],
  ['ZONE', 'ZONE（エリア）'],
  ['FACTORY BASE', 'FACTORY BASE（工場拠点）'],
  ['CASH', 'CASH（所持金）'],
  ['REVENUE', 'REVENUE（総売上）'],
  ['PACK', 'PACK（バッグ）'],
  ['CONTRACT', 'CONTRACT（目標）'],
  ['BUILD', 'BUILD（建築）'],
  ['DISMANTLE', 'DISMANTLE（解体）'],
  ['GUIDE', 'GUIDE（ガイド）'],
  ['MENU', 'MENU（メニュー）'],
  ['BUILD MODE', 'BUILD MODE（建築モード）'],
  ['DISMANTLE MODE', 'DISMANTLE MODE（解体モード）'],
  ['PAUSED', 'PAUSED（一時停止）'],
  ['FACTORY CONSTRUCTION', 'FACTORY CONSTRUCTION（工場建築）'],
  ['BACKPACK / 12 SLOTS', 'BACKPACK / 12 SLOTS（バッグ / 12枠）'],
  ['MACHINE CONTROL', 'MACHINE CONTROL（設備操作）'],
  ['INPUT', 'INPUT（入力）'],
  ['OUTPUT', 'OUTPUT（出力）'],
  ['FIELD MANUAL / CODEX', 'FIELD MANUAL / CODEX（操作マニュアル / 図鑑）'],
  ['SYSTEM SETTINGS', 'SYSTEM SETTINGS（システム設定）'],
  ['CONTRACT COMPLETE', 'CONTRACT COMPLETE（目標達成）'],
  ['High', 'High（高）'],
  ['Medium', 'Medium（中）'],
  ['Low', 'Low（低）'],
  ['HOME TERMINAL / PLAYER MANAGEMENT', 'HOME TERMINAL / PLAYER MANAGEMENT（ホーム端末 / プレイヤー管理）'],
  ['PLAYER MANAGEMENT', 'PLAYER MANAGEMENT（プレイヤー管理）'],
  ['PLAYER RANK', 'PLAYER RANK（プレイヤーランク）'],
  ['BACKPACK', 'BACKPACK（バッグ）'],
  ['HOME STORAGE', 'HOME STORAGE（ホーム保管庫）'],
  ['SECURE CASE', 'SECURE CASE（セキュアケース）'],
  ['RESPAWN', 'RESPAWN（復活地点）'],
  ['HOME EQUIPMENT', 'HOME EQUIPMENT（ホーム設備）'],
  ['COSMETIC', 'COSMETIC（外観）'],
  ['MATERIAL TRACKING', 'MATERIAL TRACKING（素材追跡）'],
  ['CURRENT / NEXT GOAL', 'CURRENT / NEXT GOAL（現在 / 次の目標）'],
  ['TUTORIAL LIBRARY', 'TUTORIAL LIBRARY（チュートリアル一覧）'],
  ['UPGRADES', 'UPGRADES（アップグレード）'],
  ['TRACKING', 'TRACKING（追跡）'],
  ['HOME', 'HOME（ホーム）'],
  ['PLAYER PROGRESS', 'PLAYER PROGRESS（プレイヤー進行）'],
  ['WORKBENCH', 'WORKBENCH（作業台）'],
  ['OWNED', 'OWNED（取得済み）'],
  ['LOCKED', 'LOCKED（未解放）'],
  ['NEW', 'NEW（未読）'],
  ['READ', 'READ（既読）'],
  ['NONE', 'NONE（なし）'],
  ['READY', 'READY（使用可能）'],
  ['FINAL LINE', 'FINAL LINE（最終生産ライン）'],
  ['PRODUCT', 'PRODUCT（製品）'],
  ['POWER', 'POWER（電力）'],
  ['ROUTE BANDWIDTH', 'ROUTE BANDWIDTH（搬送能力）'],
  ['FINAL PHASE', 'FINAL PHASE（最終段階）'],
  ['STABLE RUN', 'STABLE RUN（安定稼働）'],
  ['BEST', 'BEST（最高記録）'],
  ['MAIN CLEAR', 'MAIN CLEAR（メインクリア）'],
  ['COMPLETE', 'COMPLETE（完了）'],
  ['BUILDING', 'BUILDING（構築中）'],
  ['INTERRUPTED', 'INTERRUPTED（中断）'],
  ['STEP 8 REQUIRED', 'STEP 8 REQUIRED（手順8が必要）'],
  ['AUTOMATION CONSOLE', 'AUTOMATION CONSOLE（自動化コンソール）'],
  ['DRONE ROUTES', 'DRONE ROUTES（ドローン回収経路）'],
  ['PRODUCTION RECIPES', 'PRODUCTION RECIPES（生産レシピ）'],
  ['STORAGE UPGRADES', 'STORAGE UPGRADES（保管設備アップグレード）'],
  ['FINAL AUTOMATION', 'FINAL AUTOMATION（最終自動化）'],
  ['MEGA FACTORY', 'MEGA FACTORY（巨大工場）'],
  ['FACTORY MANAGEMENT', 'FACTORY MANAGEMENT（工場管理）'],
  ['PRODUCTION PLANNER', 'PRODUCTION PLANNER（生産計画）'],
  ['CHALLENGES', 'CHALLENGES（チャレンジ）'],
  ['PHASE 4 / OPERATIONS', 'PHASE 4 / OPERATIONS（フェーズ4 / 稼働分析）'],
  ['SYSTEM DIAGNOSTICS', 'SYSTEM DIAGNOSTICS（システム診断）'],
  ['TUTORIAL OBJECTIVES', 'TUTORIAL OBJECTIVES（チュートリアル目標）'],
  ['CONTEXTUAL HINTS', 'CONTEXTUAL HINTS（状況ヒント）'],
  ['STUCK HELP', 'STUCK HELP（詰まり時ヘルプ）'],
  ['NEXT GOAL', 'NEXT GOAL（次の目標）'],
  ['SCANNER KEY', 'SCANNER KEY（スキャナーキー）'],
  ['SCANNER', 'SCANNER（スキャナー）'],
  ['ACTIVE', 'ACTIVE（稼働中）'],
  ['OFFLINE', 'OFFLINE（停止中）'],
  ['FULL', 'FULL（満杯）'],
  ['OK', 'OK（正常）'],
]);

// Longest terms first so a specific phrase is translated before a generic word.
const TERM_LABELS = [
  ['Autonomous Industrial Core', '自律産業コア'],
  ['Experimental Power System', '実験電力システム'],
  ['Experimental Technology', '実験技術'],
  ['Experimental Power', '実験電力設備'],
  ['Advanced Drone Port', '上位ドローンポート'],
  ['Advanced Drone', '上位ドローン'],
  ['Utility Drone', '通常ドローン'],
  ['Automation Console', '自動化コンソール'],
  ['Final Automation Contract', '最終自動化の達成条件'],
  ['Final Automation', '最終自動化'],
  ['Factory Optimization', '工場最適化'],
  ['Mega Factory', '巨大工場'],
  ['Main Clear', 'メインクリア'],
  ['Resource Point', '資源回収地点'],
  ['Control Unit', '制御ユニット'],
  ['Smart Sorter', 'スマート仕分け機'],
  ['Priority Splitter', '優先分配機'],
  ['Overflow Splitter', '余剰分配機'],
  ['Logistics Warehouse', '物流倉庫'],
  ['Industrial Storage', '産業倉庫'],
  ['Back Pressure', '詰まりによる上流停止'],
  ['Power Shortage', '電力不足'],
  ['Material Tracking', '素材追跡'],
  ['Manual Save', '手動セーブ'],
  ['Secure Case', 'セキュアケース'],
  ['Player Progress', 'プレイヤー進行'],
  ['Player Management', 'プレイヤー管理'],
  ['Home Storage', 'ホーム保管庫'],
  ['Tutorial Library', 'チュートリアル一覧'],
  ['Contextual Hint', '状況ヒント'],
  ['System Diagnostics', 'システム診断'],
  ['Production Machine', '生産設備'],
  ['Drone Route', 'ドローン回収経路'],
  ['DRONE PORT', 'ドローンポート'],
  ['ADVANCED DRONE', '上位ドローン'],
  ['UTILITY', '通常型'],
  ['ADVANCED', '上位型'],
  ['Fabricator', 'ファブリケーター'],
  ['Assembler', 'アセンブラー'],
  ['Crusher', '粉砕機'],
  ['Smelter', '精錬炉'],
  ['Conveyor', 'コンベア'],
  ['Splitter', '分配機'],
  ['Merger', '合流機'],
  ['Motor', 'モーター'],
  ['Circuit', '制御回路'],
  ['Storage', '保管庫'],
  ['Recipe', 'レシピ'],
  ['Research', '研究'],
  ['Blueprint', '設計図'],
  ['Rank', 'ランク'],
  ['Route', '経路'],
  ['Machine', '設備'],
  ['Throughput', '処理量'],
  ['Power', '電力'],
  ['Output', '出力'],
  ['Input', '入力'],
  ['Upgrade', 'アップグレード'],
  ['Scanner', 'スキャナー'],
  ['Respawn', '復活地点'],
  ['Workbench', '作業台'],
  ['Tutorial', 'チュートリアル'],
  ['Objective', '目標'],
  ['Loot', '回収品'],
  ['Danger', '危険度'],
  ['Expedition', '探索'],
  ['Abandon', '探索中断'],
];

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'KBD', 'CODE', 'PRE', 'TEXTAREA']);

function preserveOuterWhitespace(original, replacement) {
  const first = original.search(/\S/);
  if (first < 0) return original;
  const last = original.search(/\s*$/);
  return `${original.slice(0, first)}${replacement}${original.slice(last)}`;
}

export function bilingualizeText(value) {
  if (typeof value !== 'string' || !/[A-Za-z]/.test(value)) return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const exact = EXACT_LABELS.get(trimmed);
  if (exact) return preserveOuterWhitespace(value, exact);

  let result = value;
  for (const [english, japanese] of TERM_LABELS) {
    const bilingual = `${english}（${japanese}）`;
    if (!result.includes(english) || result.includes(bilingual)) continue;
    result = result.split(english).join(bilingual);
  }
  return result;
}

function localizeTextNode(node) {
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName) || parent.closest('[data-bilingual-skip]')) return;
  const next = bilingualizeText(node.nodeValue || '');
  if (next !== node.nodeValue) node.nodeValue = next;
}

function localizeAttributes(element) {
  for (const attribute of ['title', 'placeholder']) {
    if (!element.hasAttribute(attribute)) continue;
    const current = element.getAttribute(attribute) || '';
    const next = bilingualizeText(current);
    if (next !== current) element.setAttribute(attribute, next);
  }
}

export function localizeSubtree(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    localizeTextNode(root);
    return;
  }
  if (!(root instanceof Element) && root !== document.body) return;
  if (root instanceof Element) localizeAttributes(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) localizeTextNode(node);
    else if (node instanceof Element) localizeAttributes(node);
    node = walker.nextNode();
  }
}

let observer = null;
let queuedRoots = new Set();
let scheduled = false;

function flushQueue() {
  scheduled = false;
  if (!document.body) return;
  observer?.disconnect();
  for (const root of queuedRoots) localizeSubtree(root);
  queuedRoots = new Set();
  observer?.observe(document.body, { subtree: true, childList: true, characterData: true });
}

function queue(root) {
  if (!root) return;
  queuedRoots.add(root.nodeType === Node.TEXT_NODE ? root : root);
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(flushQueue);
}

function start() {
  if (!document.body) return;
  localizeSubtree(document.body);
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') queue(mutation.target);
      for (const added of mutation.addedNodes || []) queue(added);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  window.__scrapFactoryBilingualUi = { bilingualizeText, localizeSubtree };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
