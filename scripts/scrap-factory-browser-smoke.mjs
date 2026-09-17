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
    // Headless Chromium does not provide a useful Pointer Lock interaction.
    // The smoke test validates boot/runtime/UI wiring, while real Pointer Lock
    // feel remains an Actual Playtest requirement.
    HTMLCanvasElement.prototype.requestPointerLock = function requestPointerLock() {
      return Promise.resolve();
    };
  });

  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  assert(response?.ok(), `Scrap Factory page failed to load: ${response?.status()}`);

  await page.waitForFunction(() => window.__scrapFactoryBooted === true, null, { timeout: 30_000 });
  await page.waitForFunction(() => document.querySelector('#start-game')?.disabled === false, null, { timeout: 10_000 });
  await page.waitForFunction(() => (
    window.__scrapFactoryRuntime?.getGame?.()?.progression?.unlocks?.includes('onboarding:early-game-v2')
  ), null, { timeout: 10_000 });
  await page.waitForSelector('[data-early-contract-panel]', { state: 'attached', timeout: 10_000 });

  const initial = await page.evaluate(() => {
    const game = window.__scrapFactoryRuntime.getGame();
    const panel = document.querySelector('[data-early-contract-panel]');
    const metalPositions = [...window.__scrapFactoryRuntime.world.scrapMeshes.values()]
      .filter((mesh) => mesh?.userData?.entity?.itemId === 'metal_scrap')
      .map((mesh) => ({ x: Number(mesh.position.x.toFixed(1)), z: Number(mesh.position.z.toFixed(1)) }));
    return {
      money: game.money,
      rank: game.progression?.progressionRank,
      sessionCount: game.sessionCount,
      title: panel?.querySelector('[data-early-contract-title]')?.textContent || '',
      progress: panel?.querySelector('[data-early-contract-progress]')?.textContent || '',
      stagedMetal: metalPositions.filter(({ x }) => x >= 29.1 && x <= 29.8),
    };
  });

  assert.equal(initial.money, 40, 'Fresh browser state should start with $40');
  assert.equal(initial.rank, 1, 'Fresh browser state should start at Rank 1');
  assert.equal(initial.sessionCount, 1, 'Fresh browser state should be first session');
  assert.equal(initial.title, '01 SALVAGE', 'Fresh browser state should expose SALVAGE as the first Contract');
  assert.match(initial.progress, /0 \/ 6/, 'SALVAGE should begin at Metal Scrap 0 / 6');
  assert.equal(initial.stagedMetal.length, 6, 'Six Metal Scrap pieces should be staged at the Scrap Yard entrance');

  await page.click('#start-game');
  await page.waitForSelector('#hud:not([hidden])', { timeout: 5_000 });
  await page.waitForTimeout(750);

  const started = await page.evaluate(() => {
    const contractBody = document.querySelector('[data-early-contract-body]');
    const legacyObjective = document.querySelector('.objective-panel:not([data-early-contract-panel])');
    return {
      bootHidden: document.querySelector('#boot-screen')?.hidden,
      hudHidden: document.querySelector('#hud')?.hidden,
      cash: document.querySelector('#money-value')?.textContent,
      contractTitle: document.querySelector('[data-early-contract-title]')?.textContent,
      contractProgress: document.querySelector('[data-early-contract-progress]')?.textContent,
      contractBody: contractBody?.textContent || '',
      contractBodyVisible: Boolean(contractBody && getComputedStyle(contractBody).display !== 'none' && contractBody.getBoundingClientRect().height > 0),
      legacyObjectiveHidden: Boolean(legacyObjective?.hidden),
      failedBoot: document.querySelector('#boot-status')?.textContent?.includes('FAILED') || false,
    };
  });

  assert.equal(started.bootHidden, true, 'Boot screen should close after starting');
  assert.equal(started.hudHidden, false, 'HUD should become visible after starting');
  assert.equal(started.cash, '$40', 'HUD should show the Fresh Start cash');
  assert.equal(started.contractTitle, '01 SALVAGE');
  assert.match(started.contractProgress, /0 \/ 6/);
  assert.match(started.contractBody, /Scrap Yard.*鉄くず.*6個/, 'Fresh Contract should state the next action');
  assert.equal(started.contractBodyVisible, true, 'Fresh Contract action text should remain visible in the adaptive HUD');
  assert.equal(started.legacyObjectiveHidden, true, 'Generic Main Goal must not compete with the Fresh Contract');
  assert.equal(started.failedBoot, false, 'Boot failure fallback must not trigger');

  await page.screenshot({ path: `${outputDir}/fresh-start-1440.png`, fullPage: true });

  // Reproduce the Rank 2 state that previously fell back to the generic
  // "Rank 2 Main Objective" card. The visible owner must remain the Fresh
  // Contract and tell the player exactly what to build and produce next.
  await page.evaluate(() => {
    const game = window.__scrapFactoryRuntime.getGame();
    game.progression.progressionRank = 2;
    game.tutorialStats.metalScrapCollected = 6;
    game.tutorialStats.crushedMetalAutoSold = 3;
    game.home.tutorial.events.manualSale = true;
  });

  await page.waitForFunction(() => (
    document.querySelector('[data-early-contract-title]')?.textContent === '04 BASIC PRODUCTION'
  ), null, { timeout: 5_000 });

  const rank2 = await page.evaluate(() => {
    const contract = document.querySelector('[data-early-contract-panel]');
    const original = document.querySelector('.objective-panel:not([data-early-contract-panel])');
    const body = contract?.querySelector('[data-early-contract-body]');
    return {
      title: contract?.querySelector('[data-early-contract-title]')?.textContent || '',
      progress: contract?.querySelector('[data-early-contract-progress]')?.textContent || '',
      body: body?.textContent || '',
      bodyVisible: Boolean(body && getComputedStyle(body).display !== 'none' && body.getBoundingClientRect().height > 0),
      legacyObjectiveHidden: Boolean(original?.hidden),
    };
  });

  assert.equal(rank2.title, '04 BASIC PRODUCTION', 'Rank 2 must keep the Fresh Contract as the visible main goal');
  assert.match(rank2.progress, /CONTRACT 4 \/ 5/);
  assert.match(rank2.body, /Crusher.*Smelter.*Seller \/ Storage.*Iron Ingot.*5個/, 'Rank 2 HUD must explain the concrete production task');
  assert.equal(rank2.bodyVisible, true, 'Rank 2 action text must be visible without opening another menu');
  assert.equal(rank2.legacyObjectiveHidden, true, 'The generic legacy Main Goal must stay hidden while Fresh Contract is active');

  await page.screenshot({ path: `${outputDir}/rank2-objective-1440.png`, fullPage: true });

  // Existing saves intentionally remain on the legacy progression contract.
  // Reproduce the user's Rank 1 save by removing the Fresh enrollment marker.
  // The fallback HUD must still explain exactly how to reach Rank 2.
  await page.evaluate(() => {
    const game = window.__scrapFactoryRuntime.getGame();
    game.progression.progressionRank = 1;
    game.sessionCount = Math.max(2, Number(game.sessionCount || 0));
    game.progression.unlocks = (game.progression.unlocks || [])
      .filter((id) => id !== 'onboarding:early-game-v2');
  });

  await page.waitForFunction(() => !document.querySelector('[data-early-contract-panel]'), null, { timeout: 5_000 });
  await page.waitForFunction(() => document.querySelector('#tutorial-title')?.textContent === 'Rank 2 — 最初の自動化', null, { timeout: 5_000 });

  const legacyRank1 = await page.evaluate(() => {
    const panel = document.querySelector('.objective-panel:not([data-early-contract-panel])');
    const body = panel?.querySelector('#tutorial-body');
    return {
      hidden: Boolean(panel?.hidden),
      title: panel?.querySelector('#tutorial-title')?.textContent || '',
      body: body?.textContent || '',
      bodyVisible: Boolean(body && getComputedStyle(body).display !== 'none' && body.getBoundingClientRect().height > 0),
    };
  });

  assert.equal(legacyRank1.hidden, false, 'Legacy Main Goal must remain visible when Fresh Contract is not active');
  assert.equal(legacyRank1.title, 'Rank 2 — 最初の自動化');
  assert.match(legacyRank1.body, /Hopper.*Crusher.*Seller/);
  assert.match(legacyRank1.body, /管理.*RANK/);
  assert.doesNotMatch(legacyRank1.body, /P → RANK/);
  assert.equal(legacyRank1.bodyVisible, true, 'Existing Rank 1 saves must show the concrete Rank 2 instructions without opening another panel');

  await page.screenshot({ path: `${outputDir}/legacy-rank1-objective-1440.png`, fullPage: true });

  // Loop Engineering visual verifier: the regular smoke camera starts very close
  // to a wall, which is useful for runtime checks but useless for judging whether
  // the machine art still reads as stacked boxes. Build a deterministic showroom
  // using the actual runtime meshes and capture all representative early machines
  // from one gameplay-distance camera.
  const visualVerifier = await page.evaluate(() => {
    const runtime = window.__scrapFactoryRuntime;
    const world = runtime.world;
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
    world.camera.position.set(0, 2.45, 10.5);
    world.camera.rotation.order = 'YXZ';
    world.camera.rotation.y = 0;
    world.camera.rotation.x = -0.10;
    world.camera.updateProjectionMatrix();

    let detailGroups = 0;
    let visibleLargeLegacyBoxes = 0;
    const perType = {};
    for (const root of world.buildingMeshes.values()) {
      const type = root.userData?.entity?.type || 'unknown';
      let detail = 0;
      let largeBoxes = 0;
      root.traverse((node) => {
        if (node.userData?.sfVisualOverhaulV3Detail) {
          detail += 1;
          detailGroups += 1;
        }
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

    return { detailGroups, visibleLargeLegacyBoxes, perType };
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

  // Hide HUD during the art capture so visual judgment is about the 3D silhouettes.
  await page.evaluate(() => {
    const hud = document.querySelector('#hud');
    if (hud) hud.hidden = true;
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outputDir}/machine-silhouette-lineup-1440.png`, fullPage: true });

  assert.deepEqual(consoleErrors, [], `Browser console errors:\n${consoleErrors.join('\n')}`);
  console.log('Scrap Factory browser smoke passed.');
} finally {
  await browser.close();
}
