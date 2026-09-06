import assert from 'node:assert/strict';
import { access, mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

async function executablePath() {
  for (const candidate of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
    try {
      await access(candidate);
      return candidate;
    } catch { /* try next */ }
  }
  throw new Error('Chrome/Chromium executable not found');
}

await mkdir('artifacts/ui-review', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: await executablePath(),
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--window-size=1440,900',
  ],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') console.error('[browser]', message.text());
});

try {
  await page.goto('http://127.0.0.1:4173/games/scrap-factory/', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(() => window.__scrapFactoryBooted === true && !document.querySelector('#start-game')?.disabled, { timeout: 30000 });
  await page.click('#start-game');
  await page.waitForSelector('#hud:not([hidden])');
  await new Promise((resolve) => setTimeout(resolve, 2800));

  const normal = await page.evaluate(() => {
    const visible = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return false;
      const style = getComputedStyle(node);
      return !node.hidden && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
    };
    const commandKeys = [...document.querySelectorAll('.hud__bottom-left .hud-key')]
      .filter((node) => getComputedStyle(node).display !== 'none')
      .map((node) => node.querySelector('kbd')?.textContent?.trim());
    return {
      shortcutVisible: visible('#shortcut-bar'),
      revenueVisible: visible('.hud-stat--revenue'),
      cashVisible: visible('.hud-stat--cash'),
      packVisible: visible('.hud-stat--capacity'),
      areaVisible: visible('.area-plate'),
      commandKeys,
      bodyOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

  assert.equal(normal.shortcutVisible, false, 'duplicate shortcut bar must not be visible');
  assert.equal(normal.revenueVisible, false, 'lifetime revenue must not occupy the normal HUD');
  assert.equal(normal.cashVisible, true, 'cash should remain available during normal factory work');
  assert.equal(normal.packVisible, false, 'fresh low-fill backpack should not occupy normal factory HUD');
  assert.equal(normal.areaVisible, false, 'zone label should disappear after the transient area banner');
  assert.deepEqual(normal.commandKeys, ['B', 'Tab', 'O'], 'normal command rail should contain only B / Tab / O');
  assert.equal(normal.bodyOverflowX, false, '1440px gameplay viewport must not horizontally overflow');

  await page.screenshot({ path: 'artifacts/ui-review/normal-hud.png' });

  await page.keyboard.press('KeyB');
  await page.waitForSelector('#build-panel:not([hidden])');
  const buildButton = await page.$('#build-list .build-option:not([disabled])');
  assert.ok(buildButton, 'an enabled build option should be available');
  await buildButton.click();
  await page.waitForSelector('#build-hint:not([hidden])');
  await new Promise((resolve) => setTimeout(resolve, 500));

  const build = await page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.textContent?.trim() || '';
    const rail = document.querySelector('.hud__bottom-left');
    return {
      cost: text('[data-build-cost]'),
      grid: text('[data-build-grid]'),
      flow: text('[data-build-flow]'),
      status: text('[data-build-status]'),
      commandRailHidden: Boolean(rail?.hidden || getComputedStyle(rail).display === 'none'),
      buildHintRect: (() => {
        const rect = document.querySelector('#build-hint')?.getBoundingClientRect();
        return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width } : null;
      })(),
      viewport: { width: innerWidth, height: innerHeight },
    };
  });

  assert.notEqual(build.cost, '—', 'build cost should be populated');
  assert.equal(build.grid, '2.5m SNAP', 'build grid context should be explicit');
  assert.ok(build.flow && build.flow !== '—', 'build flow should be populated');
  assert.ok(build.status && build.status !== '—', 'build placement status should be populated');
  assert.equal(build.commandRailHidden, true, 'normal command rail must hide in build mode');
  assert.ok(build.buildHintRect && build.buildHintRect.left >= 0 && build.buildHintRect.right <= build.viewport.width, 'build hint must fit viewport width');
  assert.ok(build.buildHintRect.bottom <= build.viewport.height, 'build hint must fit viewport height');

  await page.screenshot({ path: 'artifacts/ui-review/build-mode.png' });

  if (pageErrors.length) throw new Error(`Browser page errors:\n${pageErrors.join('\n')}`);
  console.log(JSON.stringify({ normal, build }, null, 2));
} finally {
  await browser.close();
}
