import {
  BIOMES, BRANCH_LABELS, EXPEDITIONS, FOCUS_LABELS, PLANET_STAGES, RESEARCH, RESOURCES,
  RESOURCE_ORDER, SPECIES, biomeEvolutionCost, biomeUnlocked, biomeUpgradeCost, generatorCost,
  resourceUnlocked, speciesLevelFromXp, speciesXpForLevel,
} from './config.js';
import {
  autoBuyTick, biomeSpeciesSlots, calculateExpeditionReward, canAfford, countEcosystems,
  effectiveSpeciesEvolutionCost, expeditionDuration, formatShort, manualMatterGain, offlineConfig,
  planetEvolutionStatus, productionRates, rareLabel, researchModifiers, researchStatus, spendResources,
} from './core.js';
import { createDefaultSave, exportSaveText, importSaveText, loadSave, resetSave, saveState } from './storage.js';
import { OrbloomWorld } from './world.js';

const $ = (s) => document.querySelector(s);
const ui = {
  canvas: $('#planet-canvas'), boot: $('#boot-screen'), start: $('#start-game'), hud: $('#hud'),
  resources: $('#resource-strip'), stageKicker: $('#stage-kicker'), stageIndex: $('#stage-index'),
  stageName: $('#stage-name'), stageDescription: $('#stage-description'), objective: $('#objective-text'),
  requirements: $('#evolution-requirements'), evolve: $('#evolve-planet'), tabs: [...document.querySelectorAll('[data-tab]')],
  dockKicker: $('#dock-kicker'), dockTitle: $('#dock-title'), dockStatus: $('#dock-status'), panel: $('#panel-content'),
  manual: $('#manual-matter'), scan: $('#scan-life'), scanCost: $('#scan-cost'), save: $('#save-now'),
  settings: $('#settings-panel'), openSettings: $('#open-settings'), motion: $('#setting-motion'),
  quality: $('#setting-quality'), volume: $('#setting-volume'), export: $('#export-save'),
  import: $('#import-save'), reset: $('#reset-save'), offline: $('#offline-panel'), offlineSummary: $('#offline-summary'),
  evoPanel: $('#evolution-panel'), evoKicker: $('#evolution-kicker'), evoTitle: $('#evolution-title'),
  evoCopy: $('#evolution-copy'), evoClose: $('#evolution-close'), toasts: $('#toast-stack'),
};

const speciesById = new Map(SPECIES.map((x) => [x.id, x]));
const researchById = new Map(RESEARCH.map((x) => [x.id, x]));
const expeditionById = new Map(EXPEDITIONS.map((x) => [x.id, x]));
let { state, elapsedSeconds } = loadSave();
let tab = 'biomes', selectedBiome = 'rocky', started = false, last = performance.now(), renderWait = 0, saveWait = 0;
let expId = EXPEDITIONS[0]?.id || '', expFocus = 'mineral', expSpecies = '', audio = null;

const world = new OrbloomWorld(ui.canvas, {
  onBiomeSelect(id) { selectedBiome = id; setTab('biomes'); renderPanel(); },
});
world.setReducedMotion(state.settings.reducedMotion);
world.setQuality(state.settings.quality);
world.setState(state);

applyOffline(elapsedSeconds);
normalize();
bind();
renderAll();
requestAnimationFrame(loop);
window.__orbloomRuntime = { getState: () => state, renderAll, save: persist, world };

function bind() {
  ui.start.addEventListener('click', () => {
    started = true; ui.boot.hidden = true; ui.hud.hidden = false; ensureAudio(); tone(420);
    if (elapsedSeconds >= 8) ui.offline.hidden = false;
    toast('Matterを生成し、最初のGeneratorを作ろう。', 'success');
  });
  ui.manual.addEventListener('click', gather);
  ui.scan.addEventListener('click', scanLife);
  ui.evolve.addEventListener('click', evolvePlanet);
  ui.save.addEventListener('click', () => { persist(); toast('セーブしました', 'success'); });
  ui.openSettings.addEventListener('click', () => { ui.settings.hidden = false; });
  ui.evoClose.addEventListener('click', () => { ui.evoPanel.hidden = true; });
  ui.tabs.forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  document.addEventListener('click', (e) => {
    const close = e.target.closest('[data-close]');
    if (close) {
      if (close.dataset.close === 'settings') ui.settings.hidden = true;
      if (close.dataset.close === 'offline') ui.offline.hidden = true;
      return;
    }
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const { action, id } = b.dataset;
    if (action === 'generator-buy') buyGenerator(id);
    if (action === 'biome-upgrade') upgradeBiome(id);
    if (action === 'biome-evolve') evolveBiome(id);
    if (action === 'species-evolve') evolveSpecies(id);
    if (action === 'research-buy') buyResearch(id);
    if (action === 'expedition-launch') launchExpedition();
    if (action === 'expedition-collect') collectExpedition(true);
  });
  ui.motion.checked = state.settings.reducedMotion;
  ui.quality.value = state.settings.quality;
  ui.volume.value = state.settings.volume;
  ui.motion.addEventListener('change', () => { state.settings.reducedMotion = ui.motion.checked; world.setReducedMotion(state.settings.reducedMotion); persist(); });
  ui.quality.addEventListener('change', () => { state.settings.quality = ui.quality.value; world.setQuality(state.settings.quality); persist(); });
  ui.volume.addEventListener('input', () => { state.settings.volume = Number(ui.volume.value); persist(false); });
  ui.export.addEventListener('click', exportSave);
  ui.import.addEventListener('change', importSave);
  ui.reset.addEventListener('click', resetProgress);
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.code === 'Space' && started && ui.settings.hidden && ui.evoPanel.hidden) { e.preventDefault(); gather(); }
    if (e.key >= '1' && e.key <= '4') setTab(['biomes', 'species', 'research', 'expedition'][Number(e.key) - 1]);
    if (e.key === 'Escape') { ui.settings.hidden = true; ui.offline.hidden = true; }
  });
  window.addEventListener('beforeunload', () => persist(false));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) persist(false);
    else { last = performance.now(); collectExpedition(false); }
  });
}

function loop(now) {
  const dt = Math.min(.25, Math.max(0, (now - last) / 1000)); last = now;
  if (started && !document.hidden) tick(dt);
  requestAnimationFrame(loop);
}
function tick(dt) {
  const rates = productionRates(state);
  RESOURCE_ORDER.forEach((id) => { if (resourceUnlocked(id, state.planetStage)) state.resources[id] += rates[id] * dt; });
  const growth = researchModifiers(state).speciesGrowth;
  SPECIES.forEach((x) => { const s = state.species[x.id]; if (s?.discovered && s.biomeId) s.xp += dt * (1 + state.planetStage * .08) * growth; });
  autoBuyTick(state, dt);
  state.playTimeSeconds += dt; renderWait += dt; saveWait += dt;
  normalize(); collectExpedition(false); clearCheck();
  if (renderWait >= .2) { renderWait = 0; world.setState(state); renderAll(); }
  if (saveWait >= 15) { saveWait = 0; persist(false); }
}

function gather() {
  const gain = manualMatterGain(state); state.resources.matter += gain; state.stats.manualMatter += gain; tone(300, .035); renderAll();
}
function buyGenerator(id) {
  if (!resourceUnlocked(id, state.planetStage)) return;
  const cost = generatorCost(id, state.generators[id]);
  if (state.resources[id] < cost) return toast(`${RESOURCES[id].name}が不足しています`, 'warn');
  state.resources[id] -= cost; state.generators[id]++; state.stats.upgradesBought++; tone(430); persist(false); renderAll();
}
function upgradeBiome(id) {
  const b = BIOMES[id], s = state.biomes[id]; if (!b || !biomeUnlocked(id, state.planetStage)) return;
  const cost = biomeUpgradeCost(id, s.level);
  if (state.resources[b.resource] < cost) return toast(`${RESOURCES[b.resource].name}が不足しています`, 'warn');
  state.resources[b.resource] -= cost; s.level++; tone(520); world.setState(state); persist(false); renderAll();
}
function evolveBiome(id) {
  const b = BIOMES[id], s = state.biomes[id]; if (!b || s.evolution >= 2) return;
  const need = s.evolution === 0 ? 10 : 20, cost = biomeEvolutionCost(id, s.evolution);
  if (s.level < need) return toast(`Biome Lv.${need}で進化できます`, 'warn');
  if (state.resources[b.resource] < cost) return toast(`${RESOURCES[b.resource].name} ${formatShort(cost)} が必要です`, 'warn');
  state.resources[b.resource] -= cost; s.evolution++; tone(680, .14); toast(`${b.name} → ${b.evolutionNames[s.evolution - 1]}`, 'success'); world.setState(state); persist(); renderAll();
}
function scanLife() {
  const list = SPECIES.filter((x) => x.unlockStage <= state.planetStage && !state.species[x.id].discovered);
  if (!list.length) return toast(state.planetStage < 6 ? '次のPlanet Evolutionで新しいSpeciesが見つかります' : '発見可能なSpeciesは登録済みです');
  const x = list[0], rid = x.unlockStage >= 3 ? 'energy' : x.unlockStage >= 2 ? 'oxygen' : state.planetStage >= 1 ? 'water' : 'matter';
  const cost = Math.ceil(70 * Math.pow(5.2, x.unlockStage) * (1 + list.length * .08));
  if (state.resources[rid] < cost) return toast(`${RESOURCES[rid].name} ${formatShort(cost)} でLife Scanできます`, 'warn');
  state.resources[rid] -= cost;
  const s = state.species[x.id]; s.discovered = true; s.xp = speciesXpForLevel(1);
  const chance = researchModifiers(state).mutationChance + (state.species.sporefox?.biomeId ? .02 : 0), roll = Math.random();
  s.mutation = roll < chance * .22 ? 'crystal' : roll < chance ? 'golden' : 'normal';
  tone(780, .18); toast(`${x.name} を発見${s.mutation !== 'normal' ? ` — ${s.mutation.toUpperCase()}` : ''}`, 'success');
  setTab('species'); persist(); world.setState(state); renderAll();
}
function placeSpecies(id, biomeId) {
  const x = speciesById.get(id), s = state.species[id]; if (!x || !s?.discovered || !biomeUnlocked(biomeId, state.planetStage)) return;
  const used = SPECIES.filter((e) => state.species[e.id]?.biomeId === biomeId && e.id !== id).length;
  if (used >= biomeSpeciesSlots(state, biomeId)) return toast(`${BIOMES[biomeId].name} のSpecies Slotが満杯です`, 'warn');
  s.biomeId = biomeId; selectedBiome = biomeId; tone(560); persist(false); world.setState(state); renderAll();
}
function evolveSpecies(id) {
  const x = speciesById.get(id), s = state.species[id]; if (!x || !s?.discovered || s.evolved) return;
  if (speciesLevelFromXp(s.xp) < 10) return toast('Species Lv.10でEvolutionできます', 'warn');
  const cost = effectiveSpeciesEvolutionCost(state, id);
  if (!canAfford(state, cost)) return toast(`Evolution資源が不足: ${costText(cost)}`, 'warn');
  spendResources(state, cost); s.evolved = true; tone(880, .2); toast(`${x.name} EVOLUTION`, 'success'); world.setState(state); persist(); renderAll();
}
function buyResearch(id) {
  const st = researchStatus(state, id), x = researchById.get(id);
  if (!st.available || !x) return toast(st.reason || 'まだResearchできません', 'warn');
  spendResources(state, st.cost); state.research.push(id); tone(720, .14); toast(`${x.name} 完了`, 'success'); persist(); renderAll();
}
function launchExpedition() {
  if (state.expedition && !state.expedition.collected) return toast('進行中のExpeditionがあります', 'warn');
  const x = expeditionById.get(expId);
  const ready = SPECIES.filter((e) => state.species[e.id]?.discovered && state.species[e.id]?.biomeId);
  const sid = expSpecies && state.species[expSpecies]?.discovered ? expSpecies : ready[0]?.id;
  if (!x || !sid) return toast('配置済みSpeciesを1体以上用意してください', 'warn');
  const sec = expeditionDuration(state, x, sid), now = Date.now();
  state.expedition = { id: x.id, focus: expFocus, speciesId: sid, launchedAt: new Date(now).toISOString(), endsAt: new Date(now + sec * 1000).toISOString(), collected: false };
  tone(330, .1); toast(`${x.name}へExpeditionを開始`, 'success'); persist(); renderAll();
}
function collectExpedition(show) {
  const cur = state.expedition; if (!cur || cur.collected) return false;
  const end = Date.parse(cur.endsAt);
  if (Date.now() < end) { if (show) toast(`帰還まで ${duration((end - Date.now()) / 1000)}`); return false; }
  const reward = calculateExpeditionReward(state, cur.id, cur.focus, cur.speciesId); if (!reward) return false;
  Object.entries(reward.resources || {}).forEach(([id, v]) => { state.resources[id] = (state.resources[id] || 0) + v; });
  if (reward.rare) state.rareMaterials[reward.rare] = (state.rareMaterials[reward.rare] || 0) + 1;
  state.expeditionHistory[cur.id] = (state.expeditionHistory[cur.id] || 0) + 1;
  toast(`Expedition帰還: ${costText(reward.resources)}${reward.rare ? ` / ${rareLabel(reward.rare)}獲得` : ''}`, 'success');
  tone(reward.rare ? 920 : 620, .16); state.expedition = null; persist(); renderAll(); return true;
}
function evolvePlanet() {
  const st = planetEvolutionStatus(state);
  if (!st.canEvolve || !st.stage) return toast(st.complete ? 'Stable Living Worldは完成しています' : st.missing[0] || '条件未達成', 'warn');
  spendResources(state, st.cost); state.planetStage++; state.stats.planetEvolutions++;
  normalize(); world.setState(state);
  const s = PLANET_STAGES[state.planetStage]; ui.evoKicker.textContent = s.kicker; ui.evoTitle.textContent = s.name; ui.evoCopy.textContent = s.description; ui.evoPanel.hidden = false;
  tone(260, .18); setTimeout(() => tone(540, .24), 120); persist(); renderAll(); clearCheck();
}
function clearCheck() {
  if (state.planetStage < 6 || state.mainClearedAt) return;
  state.mainClearedAt = new Date().toISOString();
  ui.evoKicker.textContent = 'PRIMARY COMPLETION CONDITION'; ui.evoTitle.textContent = 'STABLE LIVING WORLD';
  ui.evoCopy.textContent = '惑星の主要循環が安定しました。Main Clearは履歴として保存され、このセーブでそのまま育成を続けられます。';
  ui.evoPanel.hidden = false; persist();
}

function normalize() {
  if (state.generators.matter === 0 && state.resources.matter >= 10) state.tutorialStep = Math.max(state.tutorialStep, 1);
  if (state.generators.matter >= 1) state.tutorialStep = Math.max(state.tutorialStep, 2);
  if (state.generators.matter >= 4) state.tutorialStep = Math.max(state.tutorialStep, 3);
  if (state.planetStage >= 1) state.tutorialStep = Math.max(state.tutorialStep, 4);
  if (SPECIES.some((x) => state.species[x.id]?.discovered)) state.tutorialStep = Math.max(state.tutorialStep, 5);
}
function objective() {
  if (state.mainClearedAt) return 'Stable Living Worldをさらに最適化する';
  if (!state.generators.matter) return 'Matterを10集め、最初のGeneratorを作る';
  if (state.generators.matter < 4) return `Matter GeneratorをLv.4へ (${state.generators.matter}/4)`;
  if (!state.planetStage) return 'Planet EvolutionでWaterを解放する';
  const found = SPECIES.filter((x) => state.species[x.id]?.discovered).length;
  if (state.planetStage === 1 && found < 2) return 'Life ScanでSpeciesを2種発見する';
  if (state.planetStage >= 2 && !state.research.length) return 'Researchを開始し、生産方針を選ぶ';
  if (state.planetStage >= 3 && !state.expeditionHistory.moon) return 'Small Moon Expeditionを完了する';
  const st = planetEvolutionStatus(state); return st.canEvolve ? `${st.stage.name}へPlanet Evolutionできる` : st.missing[0] || '生産・Biome・Speciesを育てる';
}
function scanInfo() {
  const list = SPECIES.filter((x) => x.unlockStage <= state.planetStage && !state.species[x.id].discovered);
  if (!list.length) return { disabled: true, label: 'NO SIGNAL' };
  const x = list[0], id = x.unlockStage >= 3 ? 'energy' : x.unlockStage >= 2 ? 'oxygen' : state.planetStage >= 1 ? 'water' : 'matter';
  return { disabled: false, label: `${RESOURCES[id].short} ${formatShort(Math.ceil(70 * Math.pow(5.2, x.unlockStage) * (1 + list.length * .08)))}` };
}
function setTab(next) {
  if (!['biomes', 'species', 'research', 'expedition'].includes(next)) return;
  tab = next; ui.tabs.forEach((b) => b.classList.toggle('is-active', b.dataset.tab === next)); renderPanel();
}
function renderAll() {
  renderResources(); renderStage(); renderPanel();
  const s = scanInfo(); ui.scan.disabled = s.disabled; ui.scanCost.textContent = s.label;
  ui.motion.checked = state.settings.reducedMotion; ui.quality.value = state.settings.quality; ui.volume.value = state.settings.volume;
}
function renderResources() {
  const rates = productionRates(state);
  ui.resources.innerHTML = RESOURCE_ORDER.map((id) => {
    const r = RESOURCES[id], open = resourceUnlocked(id, state.planetStage), cost = generatorCost(id, state.generators[id]);
    return `<button class="resource-cell ${open ? '' : 'is-locked'}" data-action="generator-buy" data-id="${id}" type="button" ${open ? '' : 'disabled'}>
      <span><em>${r.name.toUpperCase()}</em><b>${open ? r.short : 'LOCKED'}</b></span><strong>${open ? formatShort(state.resources[id]) : '—'}</strong>
      <small class="${rates[id] > 0 ? 'is-positive' : ''}">${open ? `+${formatShort(rates[id])}/s · GEN ${state.generators[id]} · NEXT ${formatShort(cost)}` : `STAGE ${r.unlockStage + 1}`}</small>
    </button>`;
  }).join('');
}
function renderStage() {
  const s = PLANET_STAGES[state.planetStage], st = planetEvolutionStatus(state);
  ui.stageKicker.textContent = s.kicker; ui.stageIndex.textContent = `${String(state.planetStage + 1).padStart(2, '0')} / 07`; ui.stageName.textContent = s.name;
  ui.stageDescription.textContent = s.description; ui.objective.textContent = objective();
  ui.requirements.innerHTML = st.complete ? req('MAIN CLEAR', 'COMPLETE', true) : [
    ...Object.entries(st.cost || {}).map(([id, n]) => req(RESOURCES[id].name, `${formatShort(state.resources[id])} / ${formatShort(n)}`, state.resources[id] >= n)),
    ...st.missing.filter((t) => !Object.keys(st.cost || {}).some((id) => t.startsWith(RESOURCES[id].name))).slice(0, 4).map((t) => req(t, 'NEEDED', false)),
  ].join('');
  ui.evolve.disabled = !st.canEvolve; ui.evolve.textContent = st.complete ? 'STABLE LIVING WORLD' : st.canEvolve ? `EVOLVE → ${st.stage.name.toUpperCase()}` : 'PLANET EVOLUTION';
}
const req = (a, b, met) => `<div class="requirement ${met ? 'is-met' : ''}"><span><i></i>${esc(a)}</span><strong>${esc(b)}</strong></div>`;

function renderPanel() {
  if (tab === 'biomes') biomesPanel(); else if (tab === 'species') speciesPanel(); else if (tab === 'research') researchPanel(); else expeditionPanel();
}
function biomesPanel() {
  ui.dockKicker.textContent = 'PLANET SURFACE'; ui.dockTitle.textContent = 'Biomes';
  ui.dockStatus.textContent = `${Object.values(BIOMES).filter((b) => biomeUnlocked(b.id, state.planetStage)).length} / 4 OPEN`;
  ui.panel.innerHTML = `<div class="list-stack">${Object.values(BIOMES).map((b) => {
    const open = biomeUnlocked(b.id, state.planetStage), s = state.biomes[b.id], cost = biomeUpgradeCost(b.id, s.level);
    const placed = SPECIES.filter((x) => state.species[x.id]?.biomeId === b.id).length, slots = biomeSpeciesSlots(state, b.id), need = s.evolution === 0 ? 10 : 20;
    return card(b.name, open ? `LV.${s.level}` : `STAGE ${b.unlockStage + 1}`, open ? b.description : 'Planet Evolutionで解放',
      open ? [`${s.evolution ? b.evolutionNames[s.evolution - 1] : 'Base State'}`, `SPECIES ${placed}/${slots}`] : [],
      open ? `<button class="small-button is-accent" data-action="biome-upgrade" data-id="${b.id}">UPGRADE · ${RESOURCES[b.resource].short} ${formatShort(cost)}</button>${s.evolution < 2 ? `<button class="small-button" data-action="biome-evolve" data-id="${b.id}">${s.level >= need ? 'EVOLVE' : `EVOLVE @ LV.${need}`}</button>` : ''}` : '',
      `${open ? '' : 'is-locked'} ${selectedBiome === b.id ? 'is-selected' : ''}`);
  }).join('')}</div>`;
}
function speciesPanel() {
  const found = SPECIES.filter((x) => state.species[x.id]?.discovered).length, evo = SPECIES.filter((x) => state.species[x.id]?.evolved).length;
  ui.dockKicker.textContent = 'LIFE COLLECTION'; ui.dockTitle.textContent = 'Species'; ui.dockStatus.textContent = `${found}/${SPECIES.length} FOUND · ${evo} EVO`;
  ui.panel.innerHTML = `<div class="list-stack">${SPECIES.map((x) => {
    const s = state.species[x.id], available = x.unlockStage <= state.planetStage;
    if (!s.discovered) return card(available ? 'Unknown Life Signal' : 'Undiscovered Species', available ? 'SCAN READY' : `STAGE ${x.unlockStage + 1}`, available ? 'Life Scanで発見できます。' : 'Planet Evolutionで新しい信号が現れます。', [], '', 'is-locked');
    const lv = speciesLevelFromXp(s.xp), prev = speciesXpForLevel(lv), next = speciesXpForLevel(lv + 1), p = Math.max(0, Math.min(1, (s.xp - prev) / Math.max(1, next - prev)));
    const options = Object.values(BIOMES).filter((b) => biomeUnlocked(b.id, state.planetStage)).map((b) => `<option value="${b.id}" ${s.biomeId === b.id ? 'selected' : ''}>${b.name}</option>`).join('');
    const actions = `<select class="inline-select" data-species-biome="${x.id}"><option value="">UNASSIGNED</option>${options}</select>${!s.evolved ? `<button class="small-button is-warn" data-action="species-evolve" data-id="${x.id}" ${lv < 10 ? 'disabled' : ''}>EVOLVE · ${esc(costText(effectiveSpeciesEvolutionCost(state, x.id)))}</button>` : ''}`;
    return `<article class="management-card ${s.biomeId ? 'is-selected' : ''}"><div class="card-top"><h3>${esc(x.name)}</h3><span>LV.${lv}${s.evolved ? ' · EVOLVED' : ''}</span></div><p class="card-copy">${esc(x.description)}</p><div class="card-meta"><span>${esc(x.role.toUpperCase())}</span><span>LIKES ${esc(BIOMES[x.preferredBiome].name.toUpperCase())}</span>${s.mutation !== 'normal' ? `<span class="rare-chip">${esc(s.mutation.toUpperCase())}</span>` : ''}</div><div class="progress-line"><i style="transform:scaleX(${p})"></i></div><div class="card-actions">${actions}</div></article>`;
  }).join('')}</div>`;
  ui.panel.querySelectorAll('[data-species-biome]').forEach((s) => s.addEventListener('change', () => placeSpecies(s.dataset.speciesBiome, s.value)));
}
function researchPanel() {
  ui.dockKicker.textContent = 'LONG-TERM GROWTH'; ui.dockTitle.textContent = 'Research'; ui.dockStatus.textContent = `${state.research.length} / ${RESEARCH.length} COMPLETE`;
  ui.panel.innerHTML = ['planetology', 'biology', 'automation'].map((branch) => {
    const list = RESEARCH.filter((x) => x.branch === branch), done = list.filter((x) => state.research.includes(x.id)).length;
    return `<section><div class="branch-heading"><strong>${BRANCH_LABELS[branch].toUpperCase()}</strong><span>${done}/${list.length}</span></div><div class="list-stack">${list.map((x) => {
      const st = researchStatus(state, x.id), complete = state.research.includes(x.id);
      return card(x.name, complete ? 'COMPLETE' : st.available ? 'AVAILABLE' : `STAGE ${x.unlockStage + 1}`, x.effect, [costText(st.cost || x.cost)],
        complete ? '' : `<button class="small-button is-accent" data-action="research-buy" data-id="${x.id}" ${st.available ? '' : 'disabled'}>RESEARCH</button>`,
        complete ? 'is-selected' : st.available ? '' : 'is-locked');
    }).join('')}</div></section>`;
  }).join('<div style="height:18px"></div>');
}
function expeditionPanel() {
  ui.dockKicker.textContent = 'OFF-WORLD SUPPORT'; ui.dockTitle.textContent = 'Expedition';
  ui.dockStatus.textContent = `${Object.values(state.expeditionHistory || {}).reduce((a, b) => a + Number(b || 0), 0)} MISSIONS`;
  if (state.planetStage < 3) { ui.panel.innerHTML = card('Expedition Network', 'STAGE 04', 'Living Planetへ進化すると外宇宙へSpeciesを送れます。', [], '', 'is-locked'); return; }
  if (state.expedition) {
    const c = state.expedition, x = expeditionById.get(c.id), left = Math.max(0, (Date.parse(c.endsAt) - Date.now()) / 1000);
    ui.panel.innerHTML = card(x?.name || c.id, left <= 0 ? 'RETURNED' : 'IN FLIGHT', `${FOCUS_LABELS[c.focus] || c.focus} · ${speciesById.get(c.speciesId)?.name || c.speciesId}`, [left <= 0 ? 'RESULT READY' : `ETA ${duration(left)}`],
      `<button class="small-button is-accent" data-action="expedition-collect" ${left <= 0 ? '' : 'disabled'}>COLLECT RESULT</button>`, 'is-selected');
    return;
  }
  const available = EXPEDITIONS.filter((x) => x.unlockStage <= state.planetStage), ready = SPECIES.filter((x) => state.species[x.id]?.discovered && state.species[x.id]?.biomeId);
  if (!available.some((x) => x.id === expId)) expId = available[0]?.id || '';
  if (!ready.some((x) => x.id === expSpecies)) expSpecies = ready[0]?.id || '';
  const x = expeditionById.get(expId), sec = x && expSpecies ? expeditionDuration(state, x, expSpecies) : x?.duration || 0;
  ui.panel.innerHTML = `<div class="list-stack">
    ${card('Destination', `${available.length}/${EXPEDITIONS.length} OPEN`, x?.description || '', [], `<select id="exp-dest" class="inline-select">${available.map((e) => `<option value="${e.id}" ${e.id === expId ? 'selected' : ''}>${e.name}</option>`).join('')}</select>`)}
    ${card('Mission Focus', 'CHOOSE ONE', '', [], `<select id="exp-focus" class="inline-select">${Object.entries(FOCUS_LABELS).map(([id, label]) => `<option value="${id}" ${id === expFocus ? 'selected' : ''}>${label}</option>`).join('')}</select>`)}
    ${card('Assigned Species', `${ready.length} READY`, '', [`DURATION ${duration(sec)}`, x?.rare ? `RARE ${rareLabel(x.rare)}` : 'RESOURCE MISSION'], `<select id="exp-species" class="inline-select"><option value="">SELECT</option>${ready.map((e) => `<option value="${e.id}" ${e.id === expSpecies ? 'selected' : ''}>${e.name}</option>`).join('')}</select><button class="small-button is-accent" data-action="expedition-launch" ${ready.length ? '' : 'disabled'}>LAUNCH EXPEDITION</button>`)}
  </div>`;
  $('#exp-dest')?.addEventListener('change', (e) => { expId = e.target.value; expeditionPanel(); });
  $('#exp-focus')?.addEventListener('change', (e) => { expFocus = e.target.value; });
  $('#exp-species')?.addEventListener('change', (e) => { expSpecies = e.target.value; expeditionPanel(); });
}
function card(title, status, copy, meta = [], actions = '', cls = '') {
  return `<article class="management-card ${cls}"><div class="card-top"><h3>${esc(title)}</h3><span>${esc(status)}</span></div>${copy ? `<p class="card-copy">${esc(copy)}</p>` : ''}${meta.length ? `<div class="card-meta">${meta.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}${actions ? `<div class="card-actions">${actions}</div>` : ''}</article>`;
}

function applyOffline(seconds) {
  const cfg = offlineConfig(state), elapsed = Math.min(Math.max(0, Number(seconds || 0)), cfg.maxSeconds); if (elapsed < 1) return;
  const rates = productionRates(state), gains = [];
  RESOURCE_ORDER.forEach((id) => {
    if (!resourceUnlocked(id, state.planetStage)) return;
    const gain = rates[id] * elapsed * cfg.efficiency; state.resources[id] += gain; if (gain > 0) gains.push(`${RESOURCES[id].name} +${formatShort(gain)}`);
  });
  const growth = researchModifiers(state).speciesGrowth;
  SPECIES.forEach((x) => { const s = state.species[x.id]; if (s?.discovered && s.biomeId) s.xp += elapsed * .35 * cfg.efficiency * growth; });
  ui.offlineSummary.textContent = `${duration(elapsed)} / 効率 ${Math.round(cfg.efficiency * 100)}% — ${gains.join(' · ') || '生産設備は待機中でした'}`;
  elapsedSeconds = elapsed; persist(false);
}
async function importSave() {
  const file = ui.import.files?.[0]; ui.import.value = ''; if (!file) return;
  try { state = importSaveText(await file.text()); world.setState(state); world.setReducedMotion(state.settings.reducedMotion); world.setQuality(state.settings.quality); renderAll(); toast('セーブを読み込みました', 'success'); }
  catch (e) { console.error(e); toast('セーブを読み込めませんでした', 'warn'); }
}
function exportSave() {
  const blob = new Blob([exportSaveText(state)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `orbloom-save-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); toast('Orbloomセーブを書き出しました', 'success');
}
function resetProgress() {
  if (!confirm('Orbloomの進行をすべてリセットします。続けますか？')) return;
  if (prompt('確認のため RESET と入力してください。') !== 'RESET') return toast('リセットを中止しました');
  resetSave(); state = createDefaultSave(); world.setState(state); ui.settings.hidden = true; renderAll(); toast('Orbloomを最初から開始しました', 'success');
}
function persist(show = false) {
  try { saveState(state); if (show) toast('セーブしました', 'success'); }
  catch (e) { console.error(e); toast('セーブに失敗しました', 'warn'); }
}
function costText(cost = {}) { return Object.entries(cost).map(([id, n]) => `${RESOURCES[id]?.short || id} ${formatShort(n)}`).join(' · ') || 'FREE'; }
function duration(sec) { const t = Math.max(0, Math.floor(Number(sec || 0))); if (t < 60) return `${t}s`; const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; }
function toast(msg, type = '') { const n = document.createElement('div'); n.className = `toast ${type ? `is-${type}` : ''}`; n.textContent = msg; ui.toasts.append(n); setTimeout(() => n.remove(), 2800); }
function ensureAudio() { if (audio) return; try { audio = new AudioContext(); } catch { audio = null; } }
function tone(freq, dur = .06) { if (!audio || state.settings.volume <= 0) return; try { const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = freq; g.gain.setValueAtTime(.03 * state.settings.volume, audio.currentTime); g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + dur); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur); } catch {} }
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
