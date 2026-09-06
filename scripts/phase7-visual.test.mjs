import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const entry = await readFile(new URL('../games/scrap-factory/progression-ui.js', import.meta.url), 'utf8');
const runtime = await readFile(new URL('../games/scrap-factory/phase7-world-runtime.js', import.meta.url), 'utf8');
const polish = await readFile(new URL('../games/scrap-factory/phase7-world-polish.js', import.meta.url), 'utf8');
const lateVisuals = await readFile(new URL('../games/scrap-factory/world-runtime.js', import.meta.url), 'utf8');
const phase5Visuals = await readFile(new URL('../games/scrap-factory/world-runtime-phase5b.js', import.meta.url), 'utf8');

assert.match(entry, /import '\.\/phase7-world-runtime\.js';/, 'stable production entrypoint must load final visual runtime');
assert.match(runtime, /EnhancedScrapWorld/, 'production visual layer must reuse the existing advanced visual runtime');
assert.match(runtime, /EnhancedScrapWorld\.prototype\.addBuilding\.call/, 'advanced visuals must be generated from the existing visual implementation rather than a second gameplay simulation');

for (const type of [
  'conveyor_mk2', 'conveyor_mk3', 'splitter', 'merger', 'smart_sorter', 'priority_splitter', 'overflow_splitter',
  'battery', 'industrial_storage', 'assembler', 'drone_port', 'industrial_generator', 'logistics_warehouse',
  'advanced_drone_port', 'fabricator', 'fabricator_core', 'experimental_power_system',
]) {
  assert.match(runtime, new RegExp(`['\"]${type}['\"]`), `production enhanced visual coverage must include ${type}`);
}

assert.match(phase5Visuals, /addAdvancedLogisticsVisual/, 'Phase 5-B logistics visuals must remain available');
assert.match(phase5Visuals, /addInfrastructureVisual/, 'Phase 5-B infrastructure visuals must remain available');
assert.match(phase5Visuals, /addAdvancedProductionVisual/, 'Phase 5-B production visuals must remain available');
assert.match(phase5Visuals, /addAutomationVisual/, 'Phase 5-B automation visuals must remain available');
assert.match(lateVisuals, /addDroneRouteVisual/, 'late-game Drone visuals must remain available');
assert.match(lateVisuals, /addExperimentalPowerVisual/, 'Experimental Power hero visual must remain available');
assert.match(lateVisuals, /addFabricatorVisual/, 'Fabricator hero visual must remain available');

assert.match(polish, /new THREE\.InstancedMesh/, 'far factory proxies must use GPU instancing');
assert.match(polish, /detailDistance/, 'distance-based detail LOD must exist');
assert.match(polish, /shadowDistance/, 'distance-based shadow budget must exist');
assert.match(polish, /animationDistance/, 'distance-based animation budget must exist');
assert.match(polish, /packetDistance/, 'transfer packet visual distance budget must exist');
assert.match(polish, /maxPackets/, 'transfer packet pool pressure must be bounded');
assert.match(polish, /particleCap/, 'machine VFX must have an explicit particle budget');
assert.match(polish, /SPARK_TYPES/, 'production machines must have bounded spark feedback');
assert.match(polish, /HEAT_TYPES/, 'heat-producing machines must have bounded heat/exhaust feedback');
assert.match(polish, /ENERGY_TYPES/, 'experimental/automation machines must have bounded energy feedback');
assert.match(polish, /quality === 'high'/, 'visual budgets must react to quality tiers');
assert.match(runtime, /performanceMode[\s\S]*\? 'low'/, 'saved Performance Mode must initialize the low visual budget');
assert.match(runtime, /setBuildingRotation/, 'production visual runtime must support post-placement logistics rotation');
assert.match(runtime, /replaceBuildPreview/, 'advanced equipment must have readable build previews');
assert.match(runtime, /shouldVisualizeTransfer/, 'render packet reduction must not alter logistics simulation calls');

for (const forbidden of ['RECIPES', 'computePowerSnapshot', 'findDirectionalRoutes', 'lifetimeRevenue', 'progressionRank']) {
  assert.doesNotMatch(polish, new RegExp(`\\b${forbidden}\\b`), `visual polish must not own gameplay simulation state: ${forbidden}`);
}

console.log('Phase 7 visual/runtime regression checks passed.');
