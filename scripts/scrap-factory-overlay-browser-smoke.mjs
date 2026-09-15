import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.env.SCRAP_FACTORY_SMOKE_URL || 'http://127.0.0.1:4173/games/scrap-factory/';
const consoleErrors = [];

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
    let lockedElement = null;

    Object.defineProperty(document, 'pointerLockElement', {
      configurable: true,
      get: () => lockedElement,
    });

    HTMLCanvasElement.prototype.requestPointerLock = function requestPointerLock() {
      lockedElement = this;
      document.dispatchEvent(new Event('pointerlockchange'));
      return Promise.resolve();
    };

    document.exitPointerLock = function exitPointerLock() {
      lockedElement = null;
      document.dispatchEvent(new Event('pointerlockchange'));
    };

    window.__testReleasePointerLock = () => {
      lockedElement = null;
      document.dispatchEvent(new Event('pointerlockchange'));
    };
  });

  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  assert(response?.ok(), `Scrap Factory page failed to load: ${response?.status()}`);

  await page.waitForFunction(() => window.__scrapFactoryBooted === true, null, { timeout: 30_000 });
  await page.waitForFunction(() => document.querySelector('#start-game')?.disabled === false, null, { timeout: 10_000 });
  await page.waitForSelector('#factory-management-panel', { state: 'attached', timeout: 10_000 });
  await page.waitForFunction(() => (
    window.__scrapFactoryRuntime?.world?.userData?.overlayCarrierRuntime?.mode === 'programmatic-pointer-unlock-guard'
  ), null, { timeout: 10_000 });

  await page.click('#start-game');
  await page.waitForSelector('#hud:not([hidden])', { timeout: 5_000 });
  await page.waitForFunction(() => document.pointerLockElement === document.querySelector('#game-canvas'), null, { timeout: 5_000 });

  await page.keyboard.press('p');
  await page.waitForTimeout(400);

  const factoryOpen = await page.evaluate(() => ({
    factoryVisible: document.querySelector('#factory-management-panel')?.hidden === false,
    pauseHidden: document.querySelector('#pause-panel')?.hidden === true,
    guideHidden: document.querySelector('#guide-panel')?.hidden === true,
    progressionHidden: document.querySelector('#progression-panel')?.hidden !== false,
    pointerLocked: document.pointerLockElement === document.querySelector('#game-canvas'),
    visibleOverlays: [...document.querySelectorAll('.overlay-panel, .factory-management-panel, .progression-panel')]
      .filter((panel) => !panel.hidden)
      .map((panel) => panel.id || panel.className),
  }));

  console.log('P shortcut state:', JSON.stringify(factoryOpen));
  assert.equal(factoryOpen.factoryVisible, true, `P must open Factory Management: ${JSON.stringify(factoryOpen)}`);
  assert.equal(factoryOpen.pauseHidden, true, 'P must not open Pause while Factory Management is opening');
  assert.equal(factoryOpen.guideHidden, true, 'The hidden Guide carrier must not become visible');

  await page.keyboard.press('p');
  await page.waitForFunction(() => document.querySelector('#factory-management-panel')?.hidden === true, null, { timeout: 5_000 });
  await page.waitForFunction(() => document.pointerLockElement === document.querySelector('#game-canvas'), null, { timeout: 5_000 });

  // Emulate the user pressing Escape at the browser Pointer Lock level. This is
  // intentionally not document.exitPointerLock(), so it must still open Pause.
  await page.evaluate(() => window.__testReleasePointerLock());
  await page.waitForFunction(() => document.querySelector('#pause-panel')?.hidden === false, null, { timeout: 5_000 });

  assert.deepEqual(consoleErrors, [], `Browser console errors:\n${consoleErrors.join('\n')}`);
  console.log('Scrap Factory overlay keyboard smoke passed.');
} finally {
  await browser.close();
}
