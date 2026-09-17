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

    // Screenshot verification must show only the audit machines. Existing starter
    // buildings can otherwise overlap the lineup and make the visual receipt lie.
    for (const [id, root] of world.buildingMeshes.entries()) {
      if (!String(id).startsWith('visual-loop-')) root.visible = false;
    }

    for (let i = 0; i < types.length; i += 1) {
      const type = types[i];
      const id = `visual-loop-${type}`;
      if (!world.buildingMeshes.has(id)) {
        world.addBuilding({ id, type, x: positions[i], z: 0, rotation: 0 });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 650));

    const curvedTypes = new Set([
      'CylinderGeometry',
      'TorusGeometry',
      'SphereGeometry',
      'TubeGeometry',
      'CapsuleGeometry',
      'LatheGeometry',
    ]);
    const boxTypes = new Set(['BoxGeometry', 'RoundedBoxGeometry']);

    const isActuallyVisible = (node, root) => {
      let current = node;
      while (current) {
        if (current.visible === false) return false;
        if (current === root) break;
        current = current.parent;
      }
      return true;
    };

    const meshWeight = (node) => {
      node.geometry.computeBoundingBox?.();
      const box = node.geometry.boundingBox;
      if (!box) return 0;

      let sx = 1;
      let sy = 1;
      let sz = 1;
      let current = node;
      while (current) {
        sx *= Math.abs(Number(current.scale?.x ?? 1));
        sy *= Math.abs(Number(current.scale?.y ?? 1));
        sz *= Math.abs(Number(current.scale?.z ?? 1));
        current = current.parent;
      }

      const x = Math.abs((box.max.x - box.min.x) * sx);
      const y = Math.abs((box.max.y - box.min.y) * sy);
      const z = Math.abs((box.max.z - box.min.z) * sz);
      return Math.max(0.0001, x * y + y * z + z * x);
    };

    const summarize = (root) => {
      root.updateMatrixWorld(true);
      const summary = {
        meshCount: 0,
        boxLike: 0,
        curved: 0,
        roundedBoxes: 0,
        hardBoxes: 0,
        visibleWeight: 0,
        boxLikeWeight: 0,
        curvedWeight: 0,
        geometryTypes: {},
      };

      root.traverse((node) => {
        if (!node.isMesh || !node.geometry || !isActuallyVisible(node, root)) return;
        const type = node.geometry.type || 'UnknownGeometry';
        if (type === 'PlaneGeometry') return;
        const weight = meshWeight(node);
        summary.meshCount += 1;
        summary.visibleWeight += weight;
        summary.geometryTypes[type] = (summary.geometryTypes[type] || 0) + 1;
        if (boxTypes.has(type)) {
          summary.boxLike += 1;
          summary.boxLikeWeight += weight;
        }
        if (curvedTypes.has(type)) {
          summary.curved += 1;
          summary.curvedWeight += weight;
        }
        if (type === 'RoundedBoxGeometry') summary.roundedBoxes += 1;
        if (type === 'BoxGeometry') summary.hardBoxes += 1;
      });

      summary.curvedShare = summary.meshCount ? summary.curved / summary.meshCount : 0;
      summary.boxLikeShare = summary.meshCount ? summary.boxLike / summary.meshCount : 1;
      summary.curvedWeightShare = summary.visibleWeight ? summary.curvedWeight / summary.visibleWeight : 0;
      summary.boxLikeWeightShare = summary.visibleWeight ? summary.boxLikeWeight / summary.visibleWeight : 1;
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
    assert(metric.curved >= 3, `${type}: expected at least 3 visible curved meshes, got ${metric.curved}`);
    assert(metric.shapeFamilies >= 3, `${type}: expected at least 3 visible geometry families, got ${metric.shapeFamilies}`);
    assert(
      metric.boxLikeWeightShare <= 0.55,
      `${type}: blocky silhouette weight too high (${(metric.boxLikeWeightShare * 100).toFixed(1)}% box-like visible weight)`,
    );
    assert(
      metric.curvedWeightShare >= 0.25,
      `${type}: curved silhouette weight too low (${(metric.curvedWeightShare * 100).toFixed(1)}% curved visible weight)`,
    );
  }

  assert.deepEqual(consoleErrors, [], `Browser console errors:\n${consoleErrors.join('\n')}`);
  console.log('Scrap Factory visual loop verifier passed.');
  console.log(JSON.stringify(metrics, null, 2));
} finally {
  await browser.close();
}
