import assert from 'node:assert/strict';
import { access, mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

async function executablePath() {
  for (const candidate of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
    try { await access(candidate); return candidate; } catch { /* try next */ }
  }
  throw new Error('Chrome/Chromium executable not found');
}

await mkdir('artifacts/phase7-settings-review', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: await executablePath(),
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error)));

async function setRange(selector, value) {
  await page.$eval(selector, (input, next) => {
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function setCheck(selector, checked) {
  await page.$eval(selector, (input, next) => {
    input.checked = Boolean(next);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, checked);
}

async function setSelect(selector, value) {
  await page.select(selector, value);
}

try {
  await page.goto('http://127.0.0.1:4173/games/scrap-factory/', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(() => window.__scrapFactoryBooted === true && !document.querySelector('#start-game')?.disabled, { timeout: 30000 });
  await page.waitForSelector('#setting-fov', { timeout: 30000 });

  await page.evaluate(() => document.querySelector('#open-settings-pause')?.click());
  await page.waitForSelector('#settings-panel:not([hidden])');

  const initial = await page.evaluate(() => ({
    qualityOptions: [...document.querySelectorAll('#setting-quality option')].map((node) => node.value),
    fov: document.querySelector('#setting-fov')?.value,
    customHidden: document.querySelector('[data-phase7-custom]')?.hidden,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  }));
  assert.deepEqual(initial.qualityOptions, ['high', 'medium', 'low', 'custom']);
  assert.equal(initial.fov, '76');
  assert.equal(initial.customHidden, true);
  assert.equal(initial.horizontalOverflow, false);

  await setRange('#setting-fov', 90);
  await setRange('#setting-head-bob', 0);
  await setRange('#setting-sprint-fov', 0);
  await setRange('#setting-hud-scale', 125);
  await setRange('#setting-text-scale', 125);
  await setRange('#setting-crosshair-scale', 160);
  await setCheck('#setting-reduce-motion', true);
  await setCheck('#setting-invert-y', true);

  const accessibility = await page.evaluate(() => ({
    settings: { ...window.__scrapFactoryRuntime.getGame().settings },
    hudScale: getComputedStyle(document.documentElement).getPropertyValue('--phase7-hud-scale').trim(),
    textScale: getComputedStyle(document.documentElement).getPropertyValue('--phase7-text-scale').trim(),
    crosshairScale: getComputedStyle(document.documentElement).getPropertyValue('--phase7-crosshair-scale').trim(),
    reduceMotion: document.body.dataset.reduceMotion,
  }));
  assert.equal(accessibility.settings.fieldOfView, 90);
  assert.equal(accessibility.settings.headBob, 0);
  assert.equal(accessibility.settings.sprintFovEffect, 0);
  assert.equal(accessibility.settings.invertY, true);
  assert.equal(accessibility.settings.reduceMotion, true);
  assert.equal(accessibility.hudScale, '1.25');
  assert.equal(accessibility.textScale, '1.25');
  assert.equal(accessibility.crosshairScale, '1.6');
  assert.equal(accessibility.reduceMotion, 'true');

  await setSelect('#setting-quality', 'custom');
  await page.waitForFunction(() => document.querySelector('[data-phase7-custom]')?.hidden === false);
  await setRange('#setting-render-scale', 70);
  await setCheck('#setting-custom-shadows', false);
  await setCheck('#setting-custom-atmosphere', false);

  const custom = await page.evaluate(() => ({
    quality: window.__scrapFactoryRuntime.getGame().settings.quality,
    renderScale: window.__scrapFactoryRuntime.getGame().settings.customRenderScale,
    shadows: window.__scrapFactoryRuntime.world.renderer.shadowMap.enabled,
    pixelRatio: window.__scrapFactoryRuntime.world.renderer.getPixelRatio(),
    dustVisible: window.__scrapFactoryRuntime.world.visualFx?.dust?.visible ?? false,
    far: window.__scrapFactoryRuntime.world.camera.far,
  }));
  assert.equal(custom.quality, 'custom');
  assert.equal(custom.renderScale, 70);
  assert.equal(custom.shadows, false);
  assert.ok(custom.pixelRatio >= 0.75 && custom.pixelRatio <= 1.26, `unexpected Custom pixel ratio: ${custom.pixelRatio}`);
  assert.equal(custom.dustVisible, false);
  assert.equal(custom.far, 190);

  await setCheck('#setting-performance-mode', true);
  const performanceMode = await page.evaluate(() => ({
    enabled: window.__scrapFactoryRuntime.getGame().settings.performanceMode,
    shadows: window.__scrapFactoryRuntime.world.renderer.shadowMap.enabled,
    pixelRatio: window.__scrapFactoryRuntime.world.renderer.getPixelRatio(),
    dustVisible: window.__scrapFactoryRuntime.world.visualFx?.dust?.visible ?? false,
    far: window.__scrapFactoryRuntime.world.camera.far,
  }));
  assert.equal(performanceMode.enabled, true);
  assert.equal(performanceMode.shadows, false);
  assert.ok(performanceMode.pixelRatio <= 1, `Performance Mode pixel ratio must stay lightweight: ${performanceMode.pixelRatio}`);
  assert.equal(performanceMode.dustVisible, false);
  assert.equal(performanceMode.far, 145);

  const saved = await page.evaluate(() => {
    const root = JSON.parse(localStorage.getItem('elitemay-game-hub-v1'));
    return root.games['scrap-factory'].settings;
  });
  assert.equal(saved.fieldOfView, 90);
  assert.equal(saved.headBob, 0);
  assert.equal(saved.performanceMode, true);
  assert.equal(saved.quality, 'custom');

  await page.screenshot({ path: 'artifacts/phase7-settings-review/settings-1440.png', fullPage: false });
  await page.setViewport({ width: 1024, height: 720, deviceScaleFactor: 1 });
  await new Promise((resolve) => setTimeout(resolve, 150));
  const compact = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    panel: (() => {
      const r = document.querySelector('#settings-panel .panel-card')?.getBoundingClientRect();
      return r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom } : null;
    })(),
  }));
  assert.equal(compact.horizontalOverflow, false);
  assert.ok(compact.panel && compact.panel.left >= 0 && compact.panel.right <= 1024, 'settings panel must fit 1024px viewport');
  await page.screenshot({ path: 'artifacts/phase7-settings-review/settings-1024.png', fullPage: false });

  if (pageErrors.length) throw new Error(`Browser page errors:\n${pageErrors.join('\n')}`);
  console.log(JSON.stringify({ initial, accessibility, custom, performanceMode, compact }, null, 2));
} finally {
  await browser.close();
}
