import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.env.SCRAP_FACTORY_SMOKE_URL || 'http://127.0.0.1:4173/games/scrap-factory/';
const consoleErrors = [];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});

async function sample(page, getter, { count = 12, delay = 220 } = {}) {
  const values = [];
  for (let index = 0; index < count; index += 1) {
    values.push(await page.evaluate(getter));
    await page.waitForTimeout(delay);
  }
  return values;
}

async function sampleStructure(page, selector, { count = 8, delay = 180 } = {}) {
  const values = [];
  for (let index = 0; index < count; index += 1) {
    values.push(await page.evaluate((surfaceSelector) => {
      const root = document.querySelector(surfaceSelector);
      if (!root || root.hidden) return null;
      return [...root.querySelectorAll('*')].map((node) => [
        node.tagName,
        node.id || '',
        node.className || '',
        [...node.attributes]
          .filter((attribute) => attribute.name.startsWith('data-'))
          .map((attribute) => `${attribute.name}=${attribute.value}`)
          .sort()
          .join('|'),
      ]);
    }, selector));
    await page.waitForTimeout(delay);
  }
  return values;
}

function allEqual(values) {
  return values.every((value) => JSON.stringify(value) === JSON.stringify(values[0]));
}

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
  await page.waitForTimeout(800);

  // Factory Management used to have two independent 1-second renderers. Sample
  // across several refresh cycles so an alternating layout cannot pass by chance.
  await page.evaluate(() => document.querySelector('#factory-management-hud')?.click());
  await page.waitForSelector('#factory-management-panel:not([hidden])', { timeout: 5_000 });
  await page.waitForTimeout(250);

  const managementSamples = await sample(page, () => {
    const content = document.querySelector('#factory-management-content');
    const grid = content?.querySelector('.management-stat-grid--overview');
    return {
      labels: [...(grid?.querySelectorAll(':scope > .management-stat > span') || [])]
        .map((node) => node.textContent?.trim()),
      legacyPatchNodes: content?.querySelectorAll('[data-phase4b-ops="true"]').length || 0,
      overviewGridCount: content?.querySelectorAll('.management-stat-grid--overview').length || 0,
    };
  });

  const expectedManagementLabels = ['MACHINES', 'PROBLEMS', 'PRODUCTION', 'POWER', 'STORAGE', 'CASH'];
  for (const state of managementSamples) {
    assert.deepEqual(state.labels, expectedManagementLabels, 'Factory Management Overview must keep one canonical six-card layout');
    assert.equal(state.legacyPatchNodes, 0, 'Retired Phase 4-B renderer must never append a second layout');
    assert.equal(state.overviewGridCount, 1, 'Factory Management Overview must have one render owner');
  }
  assert.equal(allEqual(managementSamples), true, 'Factory Management structure must stay stable across timer refreshes');

  await page.click('#close-factory-management');
  await page.waitForSelector('#factory-management-panel', { state: 'hidden', timeout: 5_000 });

  // Check the other frequently updated player-facing surfaces for structural
  // oscillation. Dynamic values may change, so compare structure rather than text.
  await page.keyboard.press('Tab');
  await page.waitForSelector('#inventory-panel:not([hidden])', { timeout: 5_000 });
  await page.waitForTimeout(500);
  const inventorySamples = await sampleStructure(page, '#inventory-panel');
  assert.equal(allEqual(inventorySamples), true, 'Inventory surface must not alternate between competing layouts');
  await page.keyboard.press('Tab');
  await page.waitForSelector('#inventory-panel', { state: 'hidden', timeout: 5_000 });

  await page.keyboard.press('KeyB');
  await page.waitForSelector('#build-panel:not([hidden])', { timeout: 5_000 });
  await page.waitForTimeout(500);
  const buildSamples = await sampleStructure(page, '#build-panel');
  assert.equal(allEqual(buildSamples), true, 'Build surface must not alternate between competing layouts');
  await page.keyboard.press('KeyB');
  await page.waitForSelector('#build-panel', { state: 'hidden', timeout: 5_000 });

  // Open Settings through the existing pause-menu action handler without relying
  // on headless Pointer Lock behavior.
  await page.evaluate(() => document.querySelector('#open-settings-pause')?.click());
  await page.waitForSelector('#settings-panel:not([hidden])', { timeout: 5_000 });
  await page.waitForTimeout(500);
  const settingsSamples = await sampleStructure(page, '#settings-panel');
  assert.equal(allEqual(settingsSamples), true, 'Settings surface must not alternate between competing layouts');

  assert.deepEqual(consoleErrors, [], `Browser console errors:\n${consoleErrors.join('\n')}`);
  console.log('Scrap Factory UI stability smoke passed.');
} finally {
  await browser.close();
}
