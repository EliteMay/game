import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const url = process.env.SCRAP_FACTORY_SMOKE_URL || 'http://127.0.0.1:4173/games/scrap-factory/';
const outputDir = 'artifacts/browser-smoke';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
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
  await page.waitForFunction(() => window.__scrapFactoryRuntime?.world?.addBuilding, null, { timeout: 10_000 });

  const evidence = await page.evaluate(() => {
    const runtime = window.__scrapFactoryRuntime;
    const world = runtime.world;

    // Use the existing gameplay runtime so the evidence represents the exact
    // production rendering path rather than a separate mock scene.
    world.loadBuildings([]);
    const lineup = [
      ['crusher', -6.25, -1.5],
      ['smelter', -3.15, -1.5],
      ['storage', 0, -1.5],
      ['assembler', 3.15, -1.5],
      ['drone_port', 6.25, -1.5],
    ];
    const roots = [];
    for (const [type, x, z] of lineup) {
      const root = world.addBuilding({ id: `visual-${type}`, type, x, z, rotation: 0 });
      if (root) roots.push(root);
    }

    world.player.x = 0;
    world.player.z = 9.6;
    world.player.yaw = 0;
    world.player.pitch = -0.08;
    world.player.vy = 0;
    world.player.grounded = true;

    return roots.map((root) => ({
      type: root.userData?.entity?.type || '',
      visualV3: Boolean(root.userData?.sfVisualOverhaulV3),
      visibleMeshCount: root.children
        .flatMap((child) => {
          const nodes = [];
          child.traverse((node) => { if (node.isMesh && node.visible) nodes.push(node); });
          return nodes;
        }).length,
    }));
  });

  assert.equal(evidence.length, 5, 'visual evidence lineup must contain five representative machines');
  assert(evidence.every((item) => item.visualV3), `all representative machines must use v3 visuals: ${JSON.stringify(evidence)}`);
  assert(evidence.every((item) => item.visibleMeshCount > 0), `representative machines must contain visible meshes: ${JSON.stringify(evidence)}`);

  // Let the render loop update the camera after the deterministic player move.
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outputDir}/visual-v3-machine-lineup-1600.png`, fullPage: true });

  const cameraEvidence = await page.evaluate(() => {
    const world = window.__scrapFactoryRuntime.world;
    return {
      camera: [world.camera.position.x, world.camera.position.y, world.camera.position.z],
      player: [world.player.x, world.player.y, world.player.z],
      visibleBuildings: [...world.buildingMeshes.values()].map((root) => root.userData?.entity?.type),
    };
  });
  assert(cameraEvidence.visibleBuildings.length >= 5, 'representative lineup must remain in the live world for screenshot capture');
  assert.deepEqual(errors, [], `Browser console errors:\n${errors.join('\n')}`);
  console.log('Scrap Factory visual evidence captured.', JSON.stringify({ evidence, cameraEvidence }));
} finally {
  await browser.close();
}
