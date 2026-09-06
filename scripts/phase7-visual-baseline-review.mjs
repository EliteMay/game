import assert from 'node:assert/strict';
import { access, mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

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

try {
  await page.goto('http://127.0.0.1:4173/games/scrap-factory/', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(() => window.__scrapFactoryBooted === true && !document.querySelector('#start-game')?.disabled, { timeout: 30000 });
  await page.click('#start-game');
  await page.waitForSelector('#hud:not([hidden])');
  await page.waitForFunction(() => Boolean(window.__scrapFactoryRuntime?.world?.renderer), { timeout: 30000 });
  await new Promise((resolve) => setTimeout(resolve, 800));

  const runtimeState = await page.evaluate(() => {
    const runtime = window.__scrapFactoryRuntime;
    const world = runtime.world;
    return {
      worldClass: world.constructor.name,
      buildingCount: world.buildingMeshes?.size ?? 0,
      render: world.renderer?.info?.render ? { ...world.renderer.info.render } : null,
      hasPhase6cVisual: [...(world.buildingMeshes?.values?.() || [])].some((mesh) => mesh.userData?.phase6cVisual),
      camera: { x: world.camera.position.x, y: world.camera.position.y, z: world.camera.position.z },
    };
  });

  assert.ok(runtimeState.render, 'renderer info must be available');
  await page.screenshot({ path: 'artifacts/phase7-visual-baseline/fresh-1440.png' });

  const stress = await page.evaluate(async () => {
    const runtime = window.__scrapFactoryRuntime;
    const world = runtime.world;
    const game = runtime.getGame();
    const buildings = [...game.buildings];
    let id = 0;
    for (let x = -20; x <= 20; x += 2.5) {
      for (let z = -20; z <= 20; z += 2.5) {
        if (Math.abs(x) < 7 && Math.abs(z) < 7) continue;
        const type = id % 9 === 0 ? 'crusher'
          : id % 13 === 0 ? 'smelter'
            : id % 17 === 0 ? 'assembler'
              : id % 23 === 0 ? 'industrial_storage'
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
    const samples = [];
    let previous = performance.now();
    for (let frame = 0; frame < 120; frame += 1) {
      await new Promise(requestAnimationFrame);
      const now = performance.now();
      samples.push(now - previous);
      previous = now;
    }
    samples.sort((a, b) => a - b);
    const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    return {
      buildingCount: world.buildingMeshes?.size ?? 0,
      calls: world.renderer.info.render.calls,
      triangles: world.renderer.info.render.triangles,
      avgFrameMs: avg,
      p95FrameMs: samples[Math.floor(samples.length * 0.95)],
      hasPhase6cVisual: [...world.buildingMeshes.values()].some((mesh) => mesh.userData?.phase6cVisual),
    };
  });

  await page.screenshot({ path: 'artifacts/phase7-visual-baseline/stress-1440.png' });
  if (errors.length) throw new Error(`Browser page errors:\n${errors.join('\n')}`);
  console.log(JSON.stringify({ runtimeState, stress }, null, 2));
} finally {
  await browser.close();
}
