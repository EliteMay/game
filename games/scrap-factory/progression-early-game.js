import * as core from './progression-core.js';
import * as base from './progression-phase6c.js';

export * from './progression-phase6c.js';

const EARLY_RANK_REWARDS = Object.freeze({
  2: { researchData: 1 },
  3: { researchData: 2 },
  4: { researchData: 1 },
});

function earlyMetrics(game) {
  const residential = game?.exploration?.areas?.residential || {};
  const discovered = new Set(game?.discoveredItems || []);
  return {
    processed: Math.max(0, Number(game?.tutorialStats?.processed || 0)),
    discoveredCount: discovered.size,
    discoveredIronIngot: discovered.has('iron_ingot'),
    discoveredCable: discovered.has('cable_bundle'),
    autoCrushedLine: core.hasAutomatedCrushedMetalLine(game),
    autoIronLine: core.hasAutomatedIronLine(game),
    residentialObjective: Boolean(residential?.objective?.completed),
    residentialZones: Array.isArray(residential.discoveredZones) ? residential.discoveredZones.length : 0,
    residentialReturnedLoot: Math.max(0, Number(residential?.returnedLootTotal || 0)),
  };
}

export function getRankDefinition(rank) {
  if (rank === 1) return {
    rank: 1,
    nextRank: 2,
    title: '最初の自動化',
    mandatory: {
      id: 'factory_online',
      label: 'Hopper → Crusher → Seller の自動ラインを成立',
      test: (m) => m.autoCrushedLine,
    },
    optionalRequired: 0,
    optionals: [],
    rewards: ['Smelter', 'Storage', 'Research Tier 2', 'Research Data +1'],
  };

  if (rank === 2) return {
    rank: 2,
    nextRank: 3,
    title: '基本工場',
    mandatory: {
      id: 'basic_production',
      label: 'Crusher → Smelterを含む鉄インゴット完全自動ラインを成立',
      test: (m) => m.autoIronLine && m.discoveredIronIngot,
    },
    optionalRequired: 0,
    optionals: [],
    rewards: ['Rank 3 Progression', 'Research Data +2', '廃住宅街 / Exploration入口'],
  };

  if (rank === 3) return {
    rank: 3,
    nextRank: 4,
    title: '新素材と探索',
    mandatory: {
      id: 'residential_objective',
      label: '廃住宅街のMain Objectiveを完了',
      test: (m) => m.residentialObjective,
    },
    optionalRequired: 1,
    optionals: [
      { id: 'residential_zones_3', label: '廃住宅街の4区画中3区画を発見', test: (m) => m.residentialZones >= 3 },
      { id: 'residential_return_10', label: '廃住宅街から素材を累計10個持ち帰る', test: (m) => m.residentialReturnedLoot >= 10 },
      { id: 'discover_cable', label: 'ケーブル束を発見 / 製作', test: (m) => m.discoveredCable },
      { id: 'discover_4', label: '鉄くず以外を含め4種類のアイテムを発見', test: (m) => m.discoveredCount >= 4 },
    ],
    rewards: ['Splitter', 'Merger', 'Conveyor Mk.2', 'Generator', 'Power Pole', 'Research Data +1'],
  };

  return base.getRankDefinition(rank);
}

export function rankProgress(game) {
  const progression = core.ensureProgressionState(game);
  if (progression.progressionRank > 3) return base.rankProgress(game);

  const definition = getRankDefinition(progression.progressionRank);
  if (!definition) {
    return {
      rank: progression.progressionRank,
      phaseCap: progression.progressionRank >= base.PLAYABLE_MAX_RANK,
      eligible: false,
      mandatory: null,
      optionals: [],
      optionalDone: 0,
      optionalRequired: 0,
      definition: null,
    };
  }

  const metrics = earlyMetrics(game);
  const mandatory = { ...definition.mandatory, done: Boolean(definition.mandatory.test(metrics)) };
  const optionals = definition.optionals.map((goal) => ({ ...goal, done: Boolean(goal.test(metrics)) }));
  const optionalDone = optionals.filter((goal) => goal.done).length;
  return {
    rank: progression.progressionRank,
    phaseCap: false,
    definition,
    mandatory,
    optionals,
    optionalDone,
    optionalRequired: definition.optionalRequired,
    eligible: mandatory.done && optionalDone >= definition.optionalRequired,
  };
}

export function claimRankUp(game) {
  const progression = core.ensureProgressionState(game);
  if (progression.progressionRank > 3) return base.claimRankUp(game);
  if (progression.progressionRank >= base.PLAYABLE_MAX_RANK) {
    return { changed: false, reason: 'phase-cap', progression };
  }

  const progress = rankProgress(game);
  if (!progress.eligible) return { changed: false, reason: 'requirements', progress, progression };

  const nextRank = progression.progressionRank + 1;
  const reward = EARLY_RANK_REWARDS[nextRank] || { researchData: 0 };
  progression.progressionRank = nextRank;
  progression.researchData += reward.researchData;
  progression.history.push({ type: 'rank-up', rank: nextRank, at: new Date().toISOString() });
  progression.history = progression.history.slice(-100);

  return {
    changed: true,
    rank: nextRank,
    reward,
    progression,
    progress: rankProgress(game),
  };
}
