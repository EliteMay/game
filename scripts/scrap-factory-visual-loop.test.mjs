import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const url = process.env.SCRAP_FACTORY_SMOKE_URL || 'http://127.0.0.1:4173/games/scrap-factory/';
const outputDir = 'artifacts/browser-smoke';
const consoleErrors = [];
const machineTypes = ['seller', 'crusher', 'smelter', 'storage', 'assembler'];

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
  await page.waitForFunction(() => window.__scrapFactoryRuntime?.world?.scene, null, { timeout: 10_000 });

  const metrics = await page.evaluate(async (types) => {
    const runtime = window.__scrapFactoryRuntime;
    const world = runtime.world;
    const positions = [-8, -4, 0, 4, 8];

    for (let i = 0; i < types.length; i += 1) {
      const type = types[i];
      const id = `visual-loop-${type}`;
      if (!world.buildingMeshes.has(id)) {
        world.addBuilding({ id, type, x: positions[i], z: 0, rotation: 0 });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    const curvedTypes = new Set([
      'CylinderGeometry',
      'TorusGeometry',
      'SphereGeometry',
      'TubeGeometry',
      'CapsuleGeometry',
      'LatheGeometry',
    ]);
    const boxTypes = new Set(['BoxGeometry', 'RoundedBoxGeometry']);

    const summarize = (root) => {
      const summary = {
        meshCount: 0,
        boxLike: 0,
        curved: 0,
        roundedBoxes: 0,
        hardBoxes: 0,
        geometryTypes: {},
      };

      root.traverse((node) => {
        if (!node.isMesh || !node.geometry) return;
        const type = node.geometry.type || 'UnknownGeometry';
        if (type === 'PlaneGeometry') return;
        summary.meshCount += 1;
        summary.geometryTypes[type] = (summary.geometryTypes[type] || 0) + 1;
        if (boxTypes.has(type)) summary.boxLike += 1;
        if (curvedTypes.has(type)) summary.curved += 1;
        if (type === 'RoundedBoxGeometry') summary.roundedBoxes += 1;
        if (type === 'BoxGeometry') summary.hardBoxes += 1;
      });

      summary.curvedShare = summary.meshCount ? summary.curved / summary.meshCount : 0;
      summary.boxLikeShare = summary.meshCount ? summary.boxLike / summary.meshCount : 1;
      summary.shapeFamilies = Object.keys(summary.geometryTypes).length;
      return summary;
    };

    const result = {};
    for (const type of types) {
      const root = world.buildingMeshes.get(`visual-loop-${type}`);
      result[type] = root ? summarize(root) : null;
    }

    world.player.x = 0;
    world.player.z = 13.5;
    world.player.yaw = 0;
    world.player.pitch = -0.08;
    const hud = document.querySelector('#hud');
    if (hud) hud.hidden = true;

    return result;
  }, machineTypes);

  await page.waitForTimeout(350);
  await page.screenshot({ path: `${outputDir}/visual-loop-lineup-1440.png`, fullPage: true });
  await writeFile(`${outputDir}/visual-loop-metrics.json`, `${JSON.stringify(metrics, null, 2)}\n`);

  for (const type of machineTypes) {
    const metric = metrics[type];
    assert(metric, `${type}: audit building was not created`);
    assert(metric.curved >= 3, `${type}: expected at least 3 curved meshes, got ${metric.curved}`);
    assert(metric.shapeFamilies >= 3, `${type}: expected at least 3 geometry families, got ${metric.shapeFamilies}`);
    assert(
      metric.boxLikeShare <= 0.55,
      `${type}: blocky silhouette proxy too high (${(metric.boxLikeShare * 100).toFixed(1)}% box-like meshes)`,
    );
  }

  assert.deepEqual(consoleErrors, [], `Browser console errors:\n${consoleErrors.join('\n')}`);
  console.log('Scrap Factory visual loop verifier passed.');
  console.log(JSON.stringify(metrics, null, 2));
} finally {
  await browser.close();
}
