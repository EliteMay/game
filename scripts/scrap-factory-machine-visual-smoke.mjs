import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const url = process.env.SCRAP_FACTORY_SMOKE_URL || 'http://127.0.0.1:4173/games/scrap-factory/';
const outputDir = 'artifacts/browser-smoke';
const consoleErrors = [];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`console: ${message.text()}`);
  });
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = function requestPointerLock() {
      return Promise.resolve();
    };
  });

  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  assert(response?.ok(), `Scrap Factory page failed to load: ${response?.status()}`);
  await page.waitForFunction(() => window.__scrapFactoryBooted === true, null, { timeout: 30_000 });
  await page.waitForFunction(() => document.querySelector('#start-game')?.disabled === false, null, { timeout: 10_000 });
  await page.click('#start-game');
  await page.waitForSelector('#hud:not([hidden])', { timeout: 5_000 });

  await page.evaluate(() => {
    const world = window.__scrapFactoryRuntime.world;
    const lineup = [
      ['hopper', -6.25, 0],
      ['crusher', -3.75, 0],
      ['smelter', -1.25, 0],
      ['storage', 1.25, 0],
      ['seller', 3.75, 0],
      ['conveyor', 6.25, 0],
    ].map(([type, x, z], index) => ({ id: `visual-${index}-${type}`, type, x, z, rotation: 0 }));

    world.loadBuildings(lineup);
    world.setPlayerState({ x: 0, z: 10.5, yaw: 0 });
    world.player.pitch = -0.10;
    const hud = document.querySelector('#hud');
    if (hud) hud.hidden = true;
  });

  // v3 decorates scene.add in a queued microtask. Wait for that lifecycle to
  // finish before checking geometry so the verifier measures settled runtime.
  await page.waitForTimeout(350);

  const visualVerifier = await page.evaluate(() => {
    const world = window.__scrapFactoryRuntime.world;
    const perType = {};
    let visibleLargeLegacyBoxes = 0;

    for (const root of world.buildingMeshes.values()) {
      const type = root.userData?.entity?.type || 'unknown';
      let detail = 0;
      let largeBoxes = 0;
      root.traverse((node) => {
        if (node.userData?.sfVisualOverhaulV3Detail) detail += 1;
        if (!node.isMesh || node.visible === false || node.userData?.sfVisualOverhaulV3Detail) return;
        const g = node.geometry;
        if (!['BoxGeometry', 'RoundedBoxGeometry'].includes(g?.type)) return;
        const p = g.parameters || {};
        const w = Number(p.width || 0);
        const h = Number(p.height || 0);
        const d = Number(p.depth || 0);
        if (Math.max(w, h, d) >= 1.2 && w * h * d >= 0.48) {
          largeBoxes += 1;
          visibleLargeLegacyBoxes += 1;
        }
      });
      perType[type] = { detail, largeBoxes };
    }

    return { perType, visibleLargeLegacyBoxes };
  });

  assert.equal(Object.keys(visualVerifier.perType).length, 6, 'Visual verifier should load six representative machine types');
  for (const [type, stats] of Object.entries(visualVerifier.perType)) {
    assert.ok(stats.detail >= 1, `${type} should have a v3 silhouette detail group`);
  }
  assert.equal(
    visualVerifier.visibleLargeLegacyBoxes,
    0,
    `Representative machines should not expose dominant legacy box cores: ${JSON.stringify(visualVerifier.perType)}`,
  );

  await page.screenshot({ path: `${outputDir}/machine-silhouette-lineup-1440.png`, fullPage: true });
  assert.deepEqual(consoleErrors, [], `Browser console errors:\n${consoleErrors.join('\n')}`);
  console.log(`Scrap Factory machine visual smoke passed: ${JSON.stringify(visualVerifier.perType)}`);
} finally {
  await browser.close();
}
