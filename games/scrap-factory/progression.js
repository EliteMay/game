export const PROGRESSION_VERSION = 1;
export const MIN_PROGRESSION_RANK = 1;
export const MAX_PROGRESSION_RANK = 7;
export const PHASE1_MAX_PLAYABLE_RANK = 3;

export const RESEARCH = [
  {
    id: 'basic_smelting',
    rank: 2,
    category: 'Production',
    title: '基礎精錬',
    description: '簡易精錬炉を建築可能にし、鉄くず → 破砕金属 → 鉄インゴットの工程を開く。',
    unlocks: ['building:smelter'],
  },
  {
    id: 'buffer_logistics',
    rank: 2,
    category: 'Logistics',
    title: '中間バッファ物流',
    description: '小型倉庫を建築可能にし、生産ラインの途中で素材と製品を保持できるようにする。',
    unlocks: ['building:storage'],
  },
  {
    id: 'residential_recon',
    rank: 3,
    category: 'Exploration',
    title: '廃住宅街 事前調査',
    description: '廃住宅街への正式な探索計画。Phase 3の探索基盤で使用する特殊Research。',
    blueprint: 'residential_recon_blueprint',
    researchData: ['residential_survey_data'],
    unlocks: ['area:residential'],
  },
];

export const RANK_GOALS = {
  1: {
    nextRank: 2,
    title: '最初の自動化',
    required: {
      id: 'first_automation',
      title: 'Directional自動販売ラインを成立させる',
      description: 'Hopper → Conveyor → Crusher → Conveyor → Seller を正しい搬送方向で接続する。',
    },
    optionalRequired: 2,
    optionals: [
      { id: 'revenue_500', title: '累計売上 $500', metric: 'lifetimeRevenue', target: 500 },
      { id: 'collect_20', title: 'スクラップを20個回収', metric: 'collected', target: 20 },
      { id: 'process_10', title: '破砕金属を10個生産', metric: 'processed', target: 10 },
      { id: 'crusher_2', title: '粉砕機を2台設置', metric: 'crusherCount', target: 2 },
      { id: 'discover_4', title: '4種類のアイテムを発見', metric: 'discoveredCount', target: 4 },
    ],
  },
  2: {
    nextRank: 3,
    title: '基本工場',
    required: {
      id: 'iron_automation',
      title: '鉄インゴットの完全自動ラインを成立させる',
      description: 'Hopper → Crusher → Smelter → Storage / Seller をDirectional Conveyorでつなぎ、鉄インゴットまで自動搬送する。',
    },
    optionalRequired: 2,
    optionals: [
      { id: 'revenue_1200', title: '累計売上 $1,200', metric: 'lifetimeRevenue', target: 1200 },
      { id: 'process_25', title: '破砕金属を25個生産', metric: 'processed', target: 25 },
      { id: 'storage_1', title: '小型倉庫を1台設置', metric: 'storageCount', target: 1 },
      { id: 'discover_ingot', title: '鉄インゴットを発見', metric: 'ironIngotDiscovered', target: 1 },
      { id: 'player_buildings_8', title: '自作設備を8台設置', metric: 'playerBuiltCount', target: 8 },
    ],
  },
};

function clampRank(value) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return MIN_PROGRESSION_RANK;
  return Math.min(MAX_PROGRESSION_RANK, Math.max(MIN_PROGRESSION_RANK, number));
}

function uniqueStrings(value) {
  return Array.isArray(value) ? [...new Set(value.map(String).filter(Boolean))] : [];
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function itemExistsInBuffers(game, itemId) {
  return (game.buildings || []).some((building) => (
    Number(building?.input?.[itemId] || 0) > 0 || Number(building?.output?.[itemId] || 0) > 0
  ));
}

function hasLegacyEvidence(game) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const discovered = Array.isArray(game?.discoveredItems) ? game.discoveredItems : [];
  const tutorialStep = Number(game?.tutorialStep || 0);
  const revenue = Number(game?.lifetimeRevenue || 0);
  const hasAdvancedBuilding = buildings.some((building) => ['smelter', 'storage'].includes(building?.type));
  const hasIron = discovered.includes('iron_ingot')
    || Number(game?.inventory?.iron_ingot || 0) > 0
    || itemExistsInBuffers(game, 'iron_ingot');
  return { buildings, discovered, tutorialStep, revenue, hasAdvancedBuilding, hasIron };
}

export function makeDefaultProgression() {
  return {
    version: PROGRESSION_VERSION,
    researched: [],
    blueprints: [],
    researchData: [],
    unlocks: [],
    migratedFromLegacy: false,
    migrationNote: null,
    updatedAt: null,
  };
}

export function inferLegacyProgression(game = {}) {
  const evidence = hasLegacyEvidence(game);
  let progressionRank = 1;
  const unlocks = [];
  let migrationNote = 'Pre-progression save detected; kept at Rank 1.';

  if (evidence.hasAdvancedBuilding || evidence.hasIron || evidence.tutorialStep >= 8 || evidence.revenue >= 250) {
    progressionRank = 2;
    unlocks.push('building:smelter', 'building:storage');
    migrationNote = 'Legacy MVP progress preserved at Rank 2 with Smelter/Storage access.';
  }

  return {
    progressionRank,
    progression: {
      ...makeDefaultProgression(),
      researched: progressionRank >= 2 ? ['basic_smelting', 'buffer_logistics'] : [],
      unlocks: [...new Set(unlocks)],
      migratedFromLegacy: true,
      migrationNote,
    },
  };
}

export function withNormalizedProgression(game = {}, { inferLegacy = true } = {}) {
  const source = isObject(game) ? game : {};
  const hasProgression = isObject(source.progression) || Number.isFinite(Number(source.progressionRank));
  if (!hasProgression && inferLegacy) {
    const inferred = inferLegacyProgression(source);
    return { ...source, ...inferred };
  }

  const base = makeDefaultProgression();
  const raw = isObject(source.progression) ? source.progression : {};
  const researched = uniqueStrings(raw.researched);
  const researchUnlocks = RESEARCH
    .filter((research) => researched.includes(research.id))
    .flatMap((research) => research.unlocks || []);
  const progression = {
    ...base,
    ...raw,
    version: PROGRESSION_VERSION,
    researched,
    blueprints: uniqueStrings(raw.blueprints),
    researchData: uniqueStrings(raw.researchData),
    unlocks: [...new Set([...uniqueStrings(raw.unlocks), ...researchUnlocks])],
    migratedFromLegacy: Boolean(raw.migratedFromLegacy),
    migrationNote: typeof raw.migrationNote === 'string' ? raw.migrationNote : null,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  };
  return {
    ...source,
    progressionRank: clampRank(source.progressionRank),
    progression,
  };
}

export function hasUnlock(game, unlockId) {
  const normalized = withNormalizedProgression(game);
  return normalized.progression.unlocks.includes(String(unlockId));
}

function metricValues(game, context = {}) {
  const buildings = Array.isArray(game?.buildings) ? game.buildings : [];
  const discovered = Array.isArray(game?.discoveredItems) ? game.discoveredItems : [];
  return {
    lifetimeRevenue: Math.max(0, Number(game?.lifetimeRevenue || 0)),
    collected: Math.max(0, Number(game?.tutorialStats?.collected || 0)),
    processed: Math.max(0, Number(game?.tutorialStats?.processed || 0)),
    crusherCount: buildings.filter((building) => building?.type === 'crusher' && !building?.permanent).length,
    storageCount: buildings.filter((building) => building?.type === 'storage' && !building?.permanent).length,
    discoveredCount: discovered.length,
    ironIngotDiscovered: discovered.includes('iron_ingot') || Number(game?.inventory?.iron_ingot || 0) > 0 || itemExistsInBuffers(game, 'iron_ingot') ? 1 : 0,
    playerBuiltCount: buildings.filter((building) => !building?.permanent).length,
    firstAutomation: Boolean(context.firstAutomation ?? game?.tutorialStats?.automationComplete),
    ironAutomation: Boolean(context.ironAutomation),
  };
}

export function evaluateRank(game = {}, context = {}) {
  const normalized = withNormalizedProgression(game);
  const rank = normalized.progressionRank;
  const goal = RANK_GOALS[rank];
  if (!goal) {
    return {
      rank,
      nextRank: rank < MAX_PROGRESSION_RANK ? rank + 1 : null,
      phase1Implemented: false,
      eligible: false,
      required: null,
      optionals: [],
      optionalDone: 0,
      optionalRequired: 0,
      title: rank >= PHASE1_MAX_PLAYABLE_RANK ? '次Phase待ち' : '最大Rank',
    };
  }

  const metrics = metricValues(normalized, context);
  const requiredDone = goal.required.id === 'first_automation' ? metrics.firstAutomation : metrics.ironAutomation;
  const optionals = goal.optionals.map((optional) => {
    const value = Number(metrics[optional.metric] || 0);
    return { ...optional, value, done: value >= optional.target };
  });
  const optionalDone = optionals.filter((optional) => optional.done).length;
  return {
    rank,
    nextRank: goal.nextRank,
    phase1Implemented: true,
    eligible: requiredDone && optionalDone >= goal.optionalRequired,
    required: { ...goal.required, done: requiredDone },
    optionals,
    optionalDone,
    optionalRequired: goal.optionalRequired,
    title: goal.title,
  };
}

export function researchState(game = {}, researchOrId) {
  const normalized = withNormalizedProgression(game);
  const research = typeof researchOrId === 'string'
    ? RESEARCH.find((entry) => entry.id === researchOrId)
    : researchOrId;
  if (!research) return { status: 'missing', available: false, complete: false, reason: 'Researchが見つかりません。' };
  if (normalized.progression.researched.includes(research.id)) {
    return { status: 'complete', available: false, complete: true, reason: '研究済み' };
  }
  if (normalized.progressionRank < research.rank) {
    return { status: 'rank-locked', available: false, complete: false, reason: `Rank ${research.rank}で解放` };
  }
  if (research.blueprint && !normalized.progression.blueprints.includes(research.blueprint)) {
    return { status: 'blueprint-locked', available: false, complete: false, reason: 'Blueprint未発見' };
  }
  const requiredData = Array.isArray(research.researchData) ? research.researchData : [];
  const missingData = requiredData.filter((id) => !normalized.progression.researchData.includes(id));
  if (missingData.length) {
    return { status: 'data-locked', available: false, complete: false, reason: 'Research Data不足', missingData };
  }
  return { status: 'available', available: true, complete: false, reason: '研究可能' };
}

function progressionTouch(game, progression) {
  return {
    ...game,
    progression: {
      ...progression,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function completeResearch(game = {}, researchId) {
  const normalized = withNormalizedProgression(game);
  const research = RESEARCH.find((entry) => entry.id === researchId);
  const state = researchState(normalized, research);
  if (!research || !state.available) {
    return { ok: false, game: normalized, research, reason: state.reason };
  }
  const progression = {
    ...normalized.progression,
    researched: [...new Set([...normalized.progression.researched, research.id])],
    unlocks: [...new Set([...normalized.progression.unlocks, ...(research.unlocks || [])])],
  };
  return {
    ok: true,
    game: progressionTouch(normalized, progression),
    research,
    reason: '研究完了',
  };
}

export function completeRankUp(game = {}, context = {}) {
  const normalized = withNormalizedProgression(game);
  const state = evaluateRank(normalized, context);
  if (!state.phase1Implemented) {
    return { ok: false, game: normalized, state, reason: 'このRank以降は次の実装Phaseで解放します。' };
  }
  if (!state.eligible) {
    return { ok: false, game: normalized, state, reason: '必須目標と選択目標を達成していません。' };
  }
  const next = {
    ...normalized,
    progressionRank: state.nextRank,
  };
  return {
    ok: true,
    game: progressionTouch(next, next.progression),
    state: evaluateRank(next, context),
    previousRank: normalized.progressionRank,
    nextRank: state.nextRank,
    reason: `Rank ${state.nextRank}へ昇格`,
  };
}

export function progressionUpdatedAt(game = {}) {
  const time = Date.parse(game?.progression?.updatedAt || '');
  return Number.isFinite(time) ? time : 0;
}
