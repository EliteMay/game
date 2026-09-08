import { RESOURCES, generatorCost } from './config.js';
import { planetEvolutionStatus } from './core.js';

export const ONBOARDING_VERSION = 2;
export const ONBOARDING_TOTAL_STEPS = 5;

const n = (value) => Math.max(0, Number(value || 0));
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value || 0)));
const whole = (value) => Math.floor(n(value));

export function getOnboardingStep(state) {
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
        verb: 'CLICK',
        title: '新しい資源を動かす',
        body: 'Planet EvolutionでWaterが解放された。上の WATER を押して最初のGeneratorを起動しよう。新資源も「作る → 再投資 → 加速」は同じ。',
        progress: clamp01(n(state.resources?.water) / Math.max(1, waterCost)),
        progressLabel: `Water ${whole(state.resources?.water)} / ${waterCost}`,
      };
    }

    return {
      id: 'complete',
      step: ONBOARDING_TOTAL_STEPS,
      total: ONBOARDING_TOTAL_STEPS,
      target: 'management',
      verb: 'NEXT',
      title: '基本ループはこれでOK',
      body: '右のBIOMESでRocky / Oceanを育て、左の NEXT OBJECTIVE を次のゴールとして進めればOK。Species・Research・Expeditionは進化に合わせて順番に使う。',
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
        verb: 'CLICK',
        title: 'まずMatterを作る',
        body: '左下の GENERATE MATTER を押そう。まず10 Matter集める。数字が増えることだけ確認すればOK。',
        progress: clamp01(matter / firstMatterCost),
        progressLabel: `Matter ${whole(matter)} / ${firstMatterCost}`,
      };
    }

    return {
      id: 'first-generator',
      step: 2,
      total: ONBOARDING_TOTAL_STEPS,
      target: 'matter-generator',
      verb: 'CLICK',
      title: '最初の自動化を買う',
      body: '上の MATTER 欄は表示だけじゃなくGenerator購入ボタン。押すとMatterが毎秒自動で増え始める。',
      progress: 1,
      progressLabel: `購入費 ${firstMatterCost} Matter`,
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
      verb: canBuy ? 'CLICK' : 'BOOST',
      title: canBuy ? `Matter GeneratorをLv.${matterLevel + 1}へ` : '増えたMatterを再投資する',
      body: canBuy
        ? 'Generatorが作ったMatterをそのままGeneratorへ戻す。これを繰り返すほど増える速度が上がる。'
        : `Matterはもう自動で増えている。待ってもいいし、GENERATE MATTERで加速して次の${nextCost} Matterを貯めよう。`,
      progress: clamp01(matterLevel / 4),
      progressLabel: `Generator Lv.${matterLevel} / 4 · 次 ${nextCost}`,
    };
  }

  const evolution = planetEvolutionStatus(state);
  if (evolution.canEvolve) {
    return {
      id: 'first-evolution',
      step: 4,
      total: ONBOARDING_TOTAL_STEPS,
      target: 'evolve',
      verb: 'CLICK',
      title: '惑星そのものを進化させる',
      body: '条件が揃った。左の PLANET EVOLUTION を押そう。見た目が変わるだけじゃなく、WaterとOceanという新しい成長軸が解放される。',
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
    body: `左の NEXT OBJECTIVE が次の大目標。Matterを${targetMatter}まで増やそう。自動生成に任せても、手動で加速してもいい。`,
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
