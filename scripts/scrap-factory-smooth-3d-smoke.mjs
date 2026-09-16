import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const url = process.env.SCRAP_FACTORY_SMOKE_URL || 'http://127.0.0.1:4173/games/scrap-factory/';
const outputDir = 'artifacts/browser-smoke';
const consoleErrors = [];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
  ],
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
  await page.waitForFunction(() => window.__scrapFactorySmoothVisuals?.version === 1, null, { timeout: 10_000 });

  await page.evaluate(() => {
    const world = window.__scrapFactoryRuntime.world;
    const samples = [
      { id: 'visual-smoke-hopper', type: 'hopper', x: -7.5, z: -1, rotation: 0 },
      { id: 'visual-smoke-crusher', type: 'crusher', x: -3.75, z: -1, rotation: 0 },
      { id: 'visual-smoke-smelter', type: 'smelter', x: 0, z: -1, rotation: 0 },
      { id: 'visual-smoke-storage', type: 'storage', x: 3.75, z: -1, rotation: 0 },
      { id: 'visual-smoke-seller', type: 'seller', x: 7.5, z: -1, rotation: 0 },
      { id: 'visual-smoke-far-proxy', type: 'crusher', x: 9, z: -38, rotation: 0 },
    ];

    for (const building of samples) {
      world.addBuilding({
        ...building,
        input: {},
        output: {},
        progress: 0,
      });
    }

    world.setPlayerState({ x: 0, z: 11, yaw: 0 });
    world.player.pitch = -0.08;
    world.camera.position.set(0, 1.7, 11);
    world.camera.rotation.order = 'YXZ';
    world.camera.rotation.set(-0.08, 0, 0);
    world.phase7Polish?.update(true);
  });

  await page.waitForTimeout(700);

  const visual = await page.evaluate(() => {
    const world = window.__scrapFactoryRuntime.world;
    const marker = window.__scrapFactorySmoothVisuals;
    const machineBatch = world.phase7Polish?.batches?.find((batch) => batch.bucketName === 'machine');
    const crusher = world.buildingMeshes.get('visual-smoke-crusher');
    const cylinderSegments = [];
    crusher?.traverse((node) => {
      if (node?.geometry?.type === 'CylinderGeometry') {
        cylinderSegments.push(Number(node.geometry.parameters?.radialSegments || 0));
      }
    });
    return {
      marker,
      proxyGeometry: machineBatch?.mesh?.geometry?.type || '',
      cylinderSegments,
      rendererErrors: Number(world.renderer?.info?.programs?.filter?.((program) => program.diagnostics?.runnable === false)?.length || 0),
    };
  });

  const expectedDistance = { high: 42, medium: 26, low: 14 }[visual.marker?.quality];
  assert.equal(visual.marker?.version, 1, 'smooth 3D runtime marker must be active');
  assert.equal(visual.marker?.detailDistance, expectedDistance, 'quality tier must use the smooth-detail LOD distance');
  assert.equal(visual.proxyGeometry, 'RoundedBoxGeometry', 'machine LOD proxy must use rounded geometry');
  assert(visual.cylinderSegments.length > 0, 'crusher visual should include cylinder geometry');
  assert(Math.min(...visual.cylinderSegments) >= 8, 'four-sided cylinder silhouettes should be upgraded to at least eight segments');
  assert(visual.cylinderSegments.some((segments) => segments >= 16), 'round crusher components should use at least sixteen radial segments');
  assert.equal(visual.rendererErrors, 0, 'WebGL programs should remain runnable');

  await page.screenshot({ path: `${outputDir}/smooth-3d-showcase-1440.png`, fullPage: true });
  assert.deepEqual(consoleErrors, [], `Browser console errors:\n${consoleErrors.join('\n')}`);
  console.log('Scrap Factory smooth 3D visual smoke passed.');
} finally {
  await browser.close();
}
