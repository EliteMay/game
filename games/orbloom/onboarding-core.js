import { RESOURCES, generatorCost } from './config.js';
import { planetEvolutionStatus } from './core.js';

export const ONBOARDING_VERSION = 4;
export const ONBOARDING_TOTAL_STEPS = 7;

const n = (value) => Math.max(0, Number(value || 0));
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value || 0)));
const whole = (value) => Math.floor(n(value));

export function getOnboardingStep(state, context = {}) {
  if (!state) return null;

  const matter = n(state.resources?.matter);
  const matterLevel = whole(state.generators?.matter);
  const firstMatterCost = generatorCost('matter', 0);

  if (Number(state.planetStage || 0) >= 1) {
    const waterLevel = whole(state.generators?.water);
    const waterCost = generatorCost('water', waterLevel);

    if (waterLevel < 1) {
      return {
        id: 'water-generator',
        step: 5,
        total: ONBOARDING_TOTAL_STEPS,
        target: 'water-generator',
        verb: 'TAP',
        title: 'Waterの自動生産を起動する',
        body: '画面上の WATER カードをタップ。最初のGenerator（自動生産装置）を買うと、Waterが毎秒勝手に増え始める。',
        progress: clamp01(n(state.resources?.water) / Math.max(1, waterCost)),
        progressLabel: `Water ${whole(state.resources?.water)} / ${waterCost}`,
      };
    }

    const species = Object.values(state.species || {});
    const discovered = species.filter((entry) => entry?.discovered).length;
    const placed = species.filter((entry) => entry?.discovered && entry?.biomeId).length;

    if (discovered < 1) {
      if (!context.scanReady) {
        return {
          id: 'prepare-life-scan',
          step: 6,
          total: ONBOARDING_TOTAL_STEPS,
          target: context.scanResourceTarget || 'scan',
          verb: context.scanResourceTarget ? 'TAP' : 'WAIT',
          title: 'Life Scanの資源を貯める',
          body: 'SCAN FOR LIFE に必要な資源を貯めよう。画面上の対象資源カードをタップすると自動生産を強化できる。',
          progress: 0,
          progressLabel: context.scanCostLabel ? `SCAN COST · ${context.scanCostLabel}` : 'SCAN costまで資源を増やす',
        };
      }

      return {
        id: 'life-scan',
        step: 6,
        total: ONBOARDING_TOTAL_STEPS,
        target: 'scan',
        verb: 'TAP',
        title: '最初のSpeciesを発見する',
        body: '準備できた。SCAN FOR LIFE をタップしよう。SpeciesはBiomeへ配置すると、自動生産や補助効果が働く。',
        progress: 1,
        progressLabel: 'Life Scan Ready',
      };
    }

    if (placed < 1) {
      return {
        id: 'place-species',
        step: 7,
        total: ONBOARDING_TOTAL_STEPS,
        target: 'species-placement',
        verb: 'SELECT',
        title: 'SpeciesをBiomeへ配置する',
        body: '発見したSpeciesの UNASSIGNED をタップしてBiomeを選ぼう。配置するとSpeciesが育ち、生産や補助を始める。',
        progress: 0,
        progressLabel: '1体をBiomeへ配置',
      };
    }

    return {
      id: 'complete',
      step: ONBOARDING_TOTAL_STEPS,
      total: ONBOARDING_TOTAL_STEPS,
      target: 'management',
      verb: 'NEXT',
      title: '基本ループはこれでOK',
      body: '作る → 自動生産を買う → 強化する → Planet Evolution → 新資源 → Species配置、が基本。ここからは左の NEXT OBJECTIVE を次のゴールにして進めればOK。',
      progress: 1,
      progressLabel: '基本ループ習得',
      complete: true,
    };
  }

  if (matterLevel < 1) {
    if (matter < firstMatterCost) {
      return {
        id: 'manual-matter',
        step: 1,
        total: ONBOARDING_TOTAL_STEPS,
        target: 'manual',
        verb: 'TAP',
        title: 'まず10 Matter作る',
        body: '左下の GENERATE MATTER をタップ。Matterが10になるまで押そう。今は数字が増えることだけ分かればOK。',
        progress: clamp01(matter / firstMatterCost),
        progressLabel: `Matter ${whole(matter)} / ${firstMatterCost}`,
      };
    }

    return {
      id: 'first-generator',
      step: 2,
      total: ONBOARDING_TOTAL_STEPS,
      target: 'matter-generator',
      verb: 'TAP',
      title: '10 Matterで「自動生産」を買う',
      body: '画面上の緑で目立っている MATTER カードをタップ。これがGenerator（自動生産装置）の購入。買うと、もう押さなくてもMatterが毎秒増える。',
      progress: 1,
      progressLabel: `MATTERカードをタップ · 購入費 ${firstMatterCost} Matter`,
    };
  }

  if (matterLevel < 4) {
    const nextCost = generatorCost('matter', matterLevel);
    const canBuy = matter >= nextCost;
    return {
      id: canBuy ? 'reinvest-buy' : 'reinvest-save',
      step: 3,
      total: ONBOARDING_TOTAL_STEPS,
      target: canBuy ? 'matter-generator' : 'manual',
      verb: canBuy ? 'TAP' : 'BOOST',
      title: canBuy ? `自動生産をLv.${matterLevel + 1}へ強化` : '次の自動生産強化まで貯める',
      body: canBuy
        ? '画面上の MATTER カードをもう一度タップ。増えたMatterを自動生産へ戻すほど、毎秒の増加量が大きくなる。'
        : `Matterはもう自動で増えている。待ってもいいし、GENERATE MATTERを押して次の${nextCost} Matterまで加速してもいい。`,
      progress: clamp01(matterLevel / 4),
      progressLabel: `自動生産 Lv.${matterLevel} / 4 · 次 ${nextCost} Matter`,
    };
  }

  const evolution = planetEvolutionStatus(state);
  if (evolution.canEvolve) {
    return {
      id: 'first-evolution',
      step: 4,
      total: ONBOARDING_TOTAL_STEPS,
      target: 'evolve',
      verb: 'TAP',
      title: '惑星そのものを進化させる',
      body: '条件が揃った。左の PLANET EVOLUTION をタップしよう。WaterとOceanという新しい成長軸が解放される。',
      progress: 1,
      progressLabel: 'Evolution Ready',
    };
  }

  const targetMatter = Number(evolution.cost?.matter || 250);
  return {
    id: 'save-for-evolution',
    step: 4,
    total: ONBOARDING_TOTAL_STEPS,
    target: 'manual',
    verb: 'BOOST',
    title: '最初のPlanet Evolutionまで貯める',
    body: `左の NEXT OBJECTIVE が次の大目標。Matterを${targetMatter}まで増やそう。自動生産に任せても、手動で加速してもいい。`,
    progress: clamp01(matter / Math.max(1, targetMatter)),
    progressLabel: `Matter ${whole(matter)} / ${targetMatter}`,
  };
}

export function applyUnlockStarterResources(state) {
  if (!state || typeof state !== 'object') return { changed: false, rewards: [] };
  if (!state.unlockRewards || typeof state.unlockRewards !== 'object') state.unlockRewards = {};

  const rewards = [];
  let changed = false;

  for (const id of ['water', 'oxygen', 'energy']) {
    const resource = RESOURCES[id];
    if (!resource || Number(state.planetStage || 0) < resource.unlockStage || state.unlockRewards[id]) continue;

    state.unlockRewards[id] = true;
    changed = true;

    if (n(state.generators?.[id]) > 0) continue;

    const firstCost = generatorCost(id, 0);
    const current = n(state.resources?.[id]);
    const amount = Math.max(0, firstCost - current);
    if (amount <= 0) continue;

    state.resources[id] = current + amount;
    rewards.push({ id, name: resource.name, amount });
  }

  return { changed, rewards };
}
