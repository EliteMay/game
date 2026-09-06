import assert from 'node:assert/strict';
import { access, mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const BASELINE_DRAW_CALLS = 6054;
const BASELINE_TRIANGLES = 134084;

async function executablePath() {
  for (const candidate of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
    try { await access(candidate); return candidate; } catch { /* next */ }
  }
  throw new Error('Chrome/Chromium executable not found');
}

await mkdir('artifacts/phase7-visual-baseline', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: await executablePath(),
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));

async function waitFrames(count = 4) {
  await page.evaluate(async (frames) => {
    for (let i = 0; i < frames; i += 1) await new Promise(requestAnimationFrame);
  }, count);
}

try {
  await page.goto('http://127.0.0.1:4173/games/scrap-factory/', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(() => window.__scrapFactoryBooted === true && !document.querySelector('#start-game')?.disabled, { timeout: 30000 });
  await page.click('#start-game');
  await page.waitForSelector('#hud:not([hidden])');
  await page.waitForFunction(() => typeof window.__scrapFactoryRuntime?.world?.getVisualPerformanceSnapshot === 'function', { timeout: 30000 });
  await waitFrames(4);

  const bootState = await page.evaluate(() => {
    const world = window.__scrapFactoryRuntime.world;
    return {
      patched: Boolean(world.userData?.phase7ProductionPatched),
      snapshot: world.getVisualPerformanceSnapshot(),
      renderer: { ...world.renderer.info.render },
    };
  });
  assert.equal(bootState.patched, true, 'Phase 7 production world patch must be active');
  assert.ok(bootState.snapshot && bootState.snapshot.quality === 'high', 'fresh High quality must initialize the High visual budget');

  const hero = await page.evaluate(async () => {
    const runtime = window.__scrapFactoryRuntime;
    const world = runtime.world;
    const game = runtime.getGame();
    const buildings = [
      { id: 'hero-mk3', type: 'conveyor_mk3', x: -6, z: 6, rotation: 0, input: {}, output: {}, progress: 0 },
      { id: 'hero-priority', type: 'priority_splitter', x: -3, z: 6, rotation: Math.PI / 2, input: {}, output: {}, progress: 0 },
      { id: 'hero-assembler', type: 'assembler', x: 0, z: 5, rotation: 0, input: {}, output: {}, progress: 0 },
      { id: 'hero-drone', type: 'advanced_drone_port', x: 3, z: 5, rotation: 0, input: {}, output: {}, progress: 0 },
      { id: 'hero-generator', type: 'industrial_generator', x: 6, z: 5, rotation: 0, input: {}, output: {}, progress: 0 },
      { id: 'hero-fabricator', type: 'fabricator_core', x: -2.5, z: 0, rotation: 0, input: {}, output: {}, progress: 0 },
      { id: 'hero-power', type: 'experimental_power_system', x: 2.5, z: 0, rotation: 0, input: {}, output: {}, progress: 0 },
    ];
    game.buildings = buildings;
    world.loadBuildings(buildings);
    world.player.x = 0;
    world.player.z = 14;
    world.player.yaw = 0;
    world.player.pitch = -0.08;
    for (const building of buildings) world.updateBuildingState(building.id, { active: true, progress: 0.72 });
    world.phase7Polish.update(true);
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    const roots = [...world.buildingMeshes.values()];
    const phase5VisualCount = roots.filter((mesh) => (
      mesh.userData?.advancedLogisticsVisual
      || mesh.userData?.infrastructureVisual
      || mesh.userData?.advancedProductionVisual
      || mesh.userData?.automationVisual
    )).length;
    const lateVisualCount = roots.filter((mesh) => mesh.userData?.phase6cVisual).length;

    world.startBuild('conveyor_mk3');
    const previewEnhanced = Boolean(world.buildPreview?.userData?.advancedLogisticsVisual);
    const previewTransparent = (() => {
      let found = false;
      let valid = true;
      world.buildPreview?.traverse?.((node) => {
        if (!node.isMesh || !node.visible) return;
        found = true;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        if (materials.some((material) => !material?.transparent || Number(material.opacity) > 0.6)) valid = false;
      });
      return found && valid;
    })();
    world.cancelBuild();

    const beforeRotation = world.buildingMeshes.get('hero-priority').rotation.y;
    const rotateOk = world.setBuildingRotation('hero-priority', Math.PI);
    const afterRotation = world.buildingMeshes.get('hero-priority').rotation.y;

    return {
      phase5VisualCount,
      lateVisualCount,
      previewEnhanced,
      previewTransparent,
      rotateOk,
      beforeRotation,
      afterRotation,
      snapshot: world.getVisualPerformanceSnapshot(),
    };
  });

  assert.ok(hero.phase5VisualCount >= 3, `expected Phase 5-B advanced visuals, got ${hero.phase5VisualCount}`);
  assert.ok(hero.lateVisualCount >= 3, `expected Phase 6-C advanced visuals, got ${hero.lateVisualCount}`);
  assert.equal(hero.previewEnhanced, true, 'advanced logistics build preview must use the enhanced visual');
  assert.equal(hero.previewTransparent, true, 'enhanced build preview must remain a transparent placement ghost');
  assert.equal(hero.rotateOk, true, 'post-placement logistics rotation must be supported');
  assert.notEqual(hero.beforeRotation, hero.afterRotation, 'rotation must update the actual building visual');
  await page.screenshot({ path: 'artifacts/phase7-visual-baseline/hero-high-1440.png' });

  const stress = await page.evaluate(async () => {
    const runtime = window.__scrapFactoryRuntime;
    const world = runtime.world;
    const game = runtime.getGame();
    const buildings = [];
    let id = 0;
    for (let x = -20; x <= 20; x += 2.5) {
      for (let z = -20; z <= 20; z += 2.5) {
        if (Math.abs(x) < 7 && Math.abs(z) < 7) continue;
        const type = id % 29 === 0 ? 'experimental_power_system'
          : id % 23 === 0 ? 'advanced_drone_port'
            : id % 19 === 0 ? 'fabricator_core'
              : id % 17 === 0 ? 'assembler'
                : id % 13 === 0 ? 'smelter'
                  : id % 9 === 0 ? 'crusher'
                    : id % 7 === 0 ? 'industrial_storage'
                      : id % 5 === 0 ? 'conveyor_mk3'
                        : 'conveyor';
        buildings.push({ id: `phase7-stress-${id}`, type, x, z, rotation: (id % 4) * Math.PI / 2, input: {}, output: {}, progress: 0, powerFuelSeconds: 0, powerStored: 0, logisticsCursor: 0, permanent: false });
        id += 1;
      }
    }
    game.buildings = buildings;
    world.loadBuildings(buildings);
    world.player.x = 0;
    world.player.z = 0;
    world.player.yaw = Math.PI / 4;
    for (const building of buildings) {
      if (['crusher', 'smelter', 'assembler', 'advanced_drone_port', 'fabricator_core', 'experimental_power_system'].includes(building.type)) {
        world.updateBuildingState(building.id, { active: true, progress: 0.5 });
      }
    }
    world.phase7Polish.update(true);
    for (let frame = 0; frame < 6; frame += 1) await new Promise(requestAnimationFrame);
    return {
      snapshot: world.getVisualPerformanceSnapshot(),
      advancedVisualCount: [...world.buildingMeshes.values()].filter((mesh) => (
        mesh.userData?.phase6cVisual
        || mesh.userData?.advancedLogisticsVisual
        || mesh.userData?.advancedProductionVisual
        || mesh.userData?.infrastructureVisual
      )).length,
    };
  });

  assert.equal(stress.snapshot.buildings, 264, 'stress fixture should use the same 264-grid-building scale as baseline');
  assert.ok(stress.snapshot.proxy >= 150, `Mega Factory must move most distant buildings to instanced proxies, got ${stress.snapshot.proxy}`);
  assert.ok(stress.snapshot.detail <= 100, `High quality detail set must remain bounded in Mega Factory, got ${stress.snapshot.detail}`);
  assert.ok(stress.snapshot.drawCalls < BASELINE_DRAW_CALLS * 0.62, `draw calls must materially improve from ${BASELINE_DRAW_CALLS}, got ${stress.snapshot.drawCalls}`);
  assert.ok(stress.snapshot.triangles < BASELINE_TRIANGLES, `visible triangle count must improve from ${BASELINE_TRIANGLES}, got ${stress.snapshot.triangles}`);
  assert.ok(stress.advancedVisualCount > 20, 'stress scene must still retain advanced visual identities in the detailed set');
  await page.screenshot({ path: 'artifacts/phase7-visual-baseline/stress-high-1440.png' });

  const packetBudget = await page.evaluate(() => {
    const world = window.__scrapFactoryRuntime.world;
    const path = [{ x: 0, z: 0 }, { x: 10, z: 0 }];
    for (let i = 0; i < 220; i += 1) world.animateTransfer(path, 'metal_scrap', 6);
    return { packets: world.packets.length, max: world.getVisualPerformanceSnapshot().budgets.maxPackets };
  });
  assert.ok(packetBudget.packets <= packetBudget.max, `visual packets must be capped at ${packetBudget.max}, got ${packetBudget.packets}`);

  const performanceMode = await page.evaluate(async () => {
    const input = document.querySelector('#setting-performance-mode');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const world = window.__scrapFactoryRuntime.world;
    world.phase7Polish.update(true);
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return {
      enabled: window.__scrapFactoryRuntime.getGame().settings.performanceMode,
      shadows: world.renderer.shadowMap.enabled,
      sparkVisible: world.phase7Polish.sparkPool.points.visible,
      heatVisible: world.phase7Polish.heatPool.points.visible,
      energyVisible: world.phase7Polish.energyPool.points.visible,
      snapshot: world.getVisualPerformanceSnapshot(),
    };
  });
  assert.equal(performanceMode.enabled, true, 'Performance Mode setting must remain connected');
  assert.equal(performanceMode.snapshot.quality, 'low', 'Performance Mode must use the Low visual budget');
  assert.equal(performanceMode.shadows, false, 'Performance Mode must disable realtime shadows');
  assert.equal(performanceMode.sparkVisible, false, 'Performance Mode must disable bounded spark particles');
  assert.equal(performanceMode.heatVisible, false, 'Performance Mode must disable heat particles');
  assert.equal(performanceMode.energyVisible, false, 'Performance Mode must disable energy particles');
  assert.ok(performanceMode.snapshot.detail < stress.snapshot.detail, 'Performance Mode must reduce detailed building count further');
  assert.ok(performanceMode.snapshot.drawCalls <= stress.snapshot.drawCalls, 'Performance Mode must not increase draw calls');
  await page.screenshot({ path: 'artifacts/phase7-visual-baseline/stress-performance-1440.png' });

  const layout = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    pageErrors: 0,
  }));
  assert.equal(layout.horizontalOverflow, false, 'Phase 7 visual work must not introduce page-level horizontal overflow');

  if (errors.length) throw new Error(`Browser page errors:\n${errors.join('\n')}`);
  console.log(JSON.stringify({
    baseline: { drawCalls: BASELINE_DRAW_CALLS, triangles: BASELINE_TRIANGLES },
    bootState,
    hero,
    stress,
    packetBudget,
    performanceMode,
    layout,
  }, null, 2));
} finally {
  await browser.close();
}
