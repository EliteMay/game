// User-facing language compatibility layer.
// Keep established English game/system terminology, but pair unclear English with Japanese.
// Requirements already state that players must not need English knowledge to progress.

const EXACT_LABELS = new Map([
  ['GAME 01 / INDUSTRIAL SALVAGE', 'GAME 01 / INDUSTRIAL SALVAGE（ゲーム01 / 産業廃材回収）'],
  ['INITIAL CONTRACT', 'INITIAL CONTRACT（初期目標）'],
  ['LOADING SYSTEM…', 'LOADING SYSTEM…（システム読込中）'],
  ['SYSTEM READY', 'SYSTEM READY（準備完了）'],
  ['CURRENT TUTORIAL', 'CURRENT TUTORIAL（現在のチュートリアル）'],
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
  ['TERMINAL', 'TERMINAL（端末）'],
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
  ['HOME SAVED', 'HOME SAVED（ホームを保存しました）'],
  ['HOME AVAILABLE', 'HOME AVAILABLE（ホーム利用可能）'],
  ['BASIC TUTORIAL COMPLETE', 'BASIC TUTORIAL COMPLETE（基本チュートリアル完了）'],
  ['GOAL', 'GOAL（目標）'],
  ['HINT', 'HINT（ヒント）'],
  ['RANK', 'RANK（ランク）'],
  ['UPGRADE', 'UPGRADE（アップグレード）'],
  ['AI MODULE', 'AI MODULE（AI制御モジュール）'],
  ['EXP FRAME', 'EXP FRAME（実験フレーム）'],
  ['EXP POWER', 'EXP POWER（実験電力）'],
  ['AUTO CORE', 'AUTO CORE（自律産業コア）'],
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

// Longest/specific terms first. The replacement algorithm protects translated phrases,
// so shorter entries cannot re-translate a word inside a longer bilingual label.
const TERM_LABELS = [
  ['Autonomous Industrial Core', '自律産業コア'],
  ['Experimental Power System', '実験電力システム'],
  ['Experimental Technology', '実験技術'],
  ['Advanced Drone Port', '上位ドローンポート'],
  ['Advanced Drone Route', '上位ドローン回収経路'],
  ['Advanced Drone', '上位ドローン'],
  ['Utility Drone', '通常ドローン'],
  ['Automation Console', '自動化コンソール'],
  ['Final Automation Contract', '最終自動化の達成条件'],
  ['Final Automation', '最終自動化'],
  ['Factory Management', '工場管理'],
  ['Factory Optimization', '工場最適化'],
  ['Production Planner', '生産計画'],
  ['System Settings', 'システム設定'],
  ['Field Manual', '操作マニュアル'],
  ['Initial Contract', '初期目標'],
  ['Mega Factory', '巨大工場'],
  ['Main Clear', 'メインクリア'],
  ['MAIN CLEAR', 'メインクリア'],
  ['Resource Point', '資源回収地点'],
  ['Research Data', '研究データ'],
  ['Control Unit', '制御ユニット'],
  ['Smart Sorter', 'スマート仕分け機'],
  ['Priority Splitter', '優先分配機'],
  ['Overflow Splitter', '余剰分配機'],
  ['Logistics Warehouse', '物流倉庫'],
  ['Industrial Storage', '産業倉庫'],
  ['Experimental Power', '実験電力設備'],
  ['Factory Network Link', '工場ネットワーク接続'],
  ['Rare Loot Detection', 'レア回収品検出'],
  ['Loot Scanner', '回収品スキャナー'],
  ['Resource Scanner', '資源スキャナー'],
  ['Advanced Scanner', '上位スキャナー'],
  ['Scanner Mastery', 'スキャナー最終強化'],
  ['Power Shortage', '電力不足'],
  ['Back Pressure', '詰まりによる上流停止'],
  ['Material Tracking', '素材追跡'],
  ['Quick Deposit', '一括預け入れ'],
  ['Auto Sort', '自動整理'],
  ['Loadout Preset', '持ち物プリセット'],
  ['Sprint Efficiency', 'ダッシュ効率化'],
  ['Manual Save', '手動セーブ'],
  ['Secure Case', 'セキュアケース'],
  ['Player Progress', 'プレイヤー進行'],
  ['Player Management', 'プレイヤー管理'],
  ['Home Storage', 'ホーム保管庫'],
  ['Home Respawn', 'ホーム復活地点'],
  ['Home Bed', 'ホームのベッド'],
  ['Tutorial Library', 'チュートリアル一覧'],
  ['Contextual Hints', '状況ヒント'],
  ['Contextual Hint', '状況ヒント'],
  ['System Diagnostics', 'システム診断'],
  ['SYSTEM DIAGNOSTICS', 'システム診断'],
  ['Production Machine', '生産設備'],
  ['Directional Logistics', '方向付き物流'],
  ['Drone Route', 'ドローン回収経路'],
  ['DRONE PORT', 'ドローンポート'],
  ['ADVANCED DRONE', '上位ドローン'],
  ['Build Mode', '建築モード'],
  ['Build Menu', '建築メニュー'],
  ['Scrap Yard', 'スクラップ置き場'],
  ['Factory Base', '工場拠点'],
  ['Session Loot', '探索中の回収品'],
  ['Power Pole', '電力ポール'],
  ['BASIC TUTORIAL COMPLETE', '基本チュートリアル完了'],
  ['HOME AVAILABLE', 'ホーム利用可能'],
  ['HOME SAVED', 'ホームを保存しました'],
  ['UTILITY', '通常型'],
  ['ADVANCED', '上位型'],
  ['OPTIONAL', '任意'],
  ['RECOMMENDED', '推奨'],
  ['Fabricator', 'ファブリケーター'],
  ['Assembler', 'アセンブラー'],
  ['Crusher', '粉砕機'],
  ['Smelter', '精錬炉'],
  ['Conveyor', 'コンベア'],
  ['Splitter', '分配機'],
  ['Merger', '合流機'],
  ['Hopper', '投入ホッパー'],
  ['Seller', '販売ターミナル'],
  ['Generator', '発電機'],
  ['Battery', '蓄電池'],
  ['Motor', 'モーター'],
  ['Circuit', '制御回路'],
  ['Backpack', 'バッグ'],
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
  ['Preview', '設置プレビュー'],
  ['Pause', '一時停止'],
  ['Depot', '保管拠点'],
  ['Save', 'セーブ'],
  ['Pulse', 'パルス'],
  ['Preset', 'プリセット'],
  ['Stack', 'スタック'],
  ['Slot', '枠'],
  ['Pin', 'ピン留め'],
  ['Factory', '工場'],
  ['Home', 'ホーム'],
  ['Player', 'プレイヤー'],
  ['Inventory', '持ち物'],
  ['Exploration', '探索'],
  ['Building', '建築'],
  ['Logistics', '物流'],
  ['Production', '生産'],
  ['Automation', '自動化'],
  ['Movement', '移動'],
  ['Tracking', '追跡'],
  ['Basics', '基本'],
  ['Optional', '任意'],
  ['Recommended', '推奨'],
  ['Rare', 'レア'],
  ['Main', 'メイン'],
  ['Current', '現在'],
  ['Next', '次'],
  ['Status', '状態'],
  ['Cost', '費用'],
  ['Available', '利用可能'],
  ['Complete', '完了'],
  ['Owned', '取得済み'],
  ['Locked', '未解放'],
  ['Management', '管理'],
  ['Contract', '目標'],
  ['Settings', '設定'],
  ['System', 'システム'],
  ['Item', 'アイテム'],
  ['SCANNER', 'スキャナー'],
  ['BACKPACK', 'バッグ'],
  ['TUTORIAL', 'チュートリアル'],
  ['TERMINAL', '端末'],
  ['CURRENT', '現在'],
  ['STATUS', '状態'],
  ['COST', '費用'],
  ['SLOTS', '枠'],
  ['SLOT', '枠'],
  ['RANK', 'ランク'],
  ['POWER', '電力'],
  ['OUTPUT', '出力'],
  ['INPUT', '入力'],
  ['UPGRADE', 'アップグレード'],
  ['GOAL', '目標'],
  ['HINT', 'ヒント'],
  ['MAIN', 'メイン'],
  ['HOME', 'ホーム'],
  ['MANAGEMENT', '管理'],
  ['CONTRACT', '目標'],
  ['SETTINGS', '設定'],
  ['SYSTEM', 'システム'],
  ['ITEM', 'アイテム'],
];

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'KBD', 'CODE', 'PRE', 'TEXTAREA']);

function preserveOuterWhitespace(original, replacement) {
  const first = original.search(/\S/);
  if (first < 0) return original;
  const last = original.search(/\s*$/);
  return `${original.slice(0, first)}${replacement}${original.slice(last)}`;
}

function marker(index) {
  return `\uE000${index}\uE001`;
}

export function bilingualizeText(value) {
  if (typeof value !== 'string' || !/[A-Za-z]/.test(value)) return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const exact = EXACT_LABELS.get(trimmed);
  if (exact) return preserveOuterWhitespace(value, exact);

  // Protect already-bilingual phrases first. This makes the operation idempotent.
  let result = value;
  const protectedParts = [];
  for (const [english, japanese] of TERM_LABELS) {
    const bilingual = `${english}（${japanese}）`;
    if (!result.includes(bilingual)) continue;
    const token = marker(protectedParts.length);
    result = result.split(bilingual).join(token);
    protectedParts.push([token, bilingual]);
  }

  // Replace each longest term with an opaque token so shorter terms cannot match inside it.
  const translatedParts = [];
  for (const [english, japanese] of TERM_LABELS) {
    if (!result.includes(english)) continue;
    const token = marker(protectedParts.length + translatedParts.length);
    result = result.split(english).join(token);
    translatedParts.push([token, `${english}（${japanese}）`]);
  }

  for (const [token, bilingual] of [...protectedParts, ...translatedParts]) {
    result = result.split(token).join(bilingual);
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
  queuedRoots.add(root);
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
