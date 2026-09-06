import assert from 'node:assert/strict';
import { access, mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

async function executablePath() {
  for (const candidate of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
    try { await access(candidate); return candidate; } catch { /* try next */ }
  }
  throw new Error('Chrome/Chromium executable not found');
}

function rectGap(a, b) {
  return Math.round((b.top - a.bottom) * 100) / 100;
}

async function activateManagement(page) {
  await page.evaluate(() => document.querySelector('[data-hud-management-toggle]')?.click());
  await new Promise((resolve) => setTimeout(resolve, 120));
}

await mkdir('artifacts/hud-hierarchy-review', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: await executablePath(),
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error)));

async function inspectHud(label) {
  const result = await page.evaluate(() => {
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const visible = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return false;
      const r = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return !node.hidden && style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      objective: rect('.objective-panel'),
      management: rect('[data-hud-management-toggle]'),
      tray: rect('[data-hud-management-tray]'),
      stack: rect('[data-hud-context-stack]'),
      progressionVisible: visible('#progression-hud'),
      factoryVisible: visible('#factory-management-hud'),
      automationVisible: visible('#automation-hud'),
      trayVisible: visible('[data-hud-management-tray]'),
      managementText: document.querySelector('[data-hud-management-toggle]')?.textContent?.replace(/\s+/g, ' ').trim(),
      objectiveText: document.querySelector('.objective-panel')?.textContent?.replace(/\s+/g, ' ').trim(),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth || document.querySelector('.game-shell')?.scrollWidth > innerWidth,
      trayParentIds: [...document.querySelectorAll('[data-hud-management-tray] > button')].map((node) => node.id),
    };
  });
  assert.ok(result.objective, `${label}: objective must exist`);
  assert.ok(result.management, `${label}: management launcher must exist`);
  assert.ok(result.stack, `${label}: HUD context stack must exist`);
  assert.ok(rectGap(result.objective, result.management) >= 0, `${label}: objective and management launcher must not overlap`);
  assert.equal(result.horizontalOverflow, false, `${label}: HUD must not create horizontal overflow`);
  return result;
}

try {
  await page.goto('http://127.0.0.1:4173/games/scrap-factory/', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(() => window.__scrapFactoryBooted === true && !document.querySelector('#start-game')?.disabled, { timeout: 30000 });
  await page.click('#start-game');
  await page.waitForSelector('#hud:not([hidden])');
  await page.waitForFunction(() => (
    document.querySelector('[data-hud-context-stack]')
    && document.querySelector('#progression-hud')
    && document.querySelector('#factory-management-hud')
    && document.querySelector('#automation-hud')
  ), { timeout: 30000 });

  // Reproduce the user's dense bilingual objective rather than validating only
  // the shorter first tutorial step.
  await page.evaluate(() => {
    document.querySelector('#tutorial-progress').textContent = '14 / 15';
    document.querySelector('#tutorial-title').textContent = 'MAIN（メイン）: Seller（販売ターミナル）まで接続';
    document.querySelector('#tutorial-body').textContent = 'Hopper（投入ホッパー） → Crusher（粉砕機） → Seller（販売ターミナル）をDirectional Logistics（方向付き物流）で接続します。';
  });
  await new Promise((resolve) => setTimeout(resolve, 500));

  const collapsed1440 = await inspectHud('1440 collapsed');
  assert.match(collapsed1440.managementText || '', /MANAGEMENT/);
  assert.equal(collapsed1440.trayVisible, false, 'management tray should be disclosed on request');
  assert.equal(collapsed1440.progressionVisible, false, 'Rank must not remain as a separate permanent HUD card');
  assert.equal(collapsed1440.factoryVisible, false, 'Factory must not remain as a separate permanent HUD card');
  assert.equal(collapsed1440.automationVisible, false, 'Automation must not remain as a separate permanent HUD card');
  await page.screenshot({ path: 'artifacts/hud-hierarchy-review/collapsed-1440.png' });

  // Pointer Lock intentionally owns physical mouse movement during gameplay.
  // Invoke the launcher element directly here because this check validates HUD
  // disclosure/layout, while the existing P keyboard path covers in-game access.
  await activateManagement(page);
  const expanded1440 = await inspectHud('1440 expanded');
  assert.equal(expanded1440.trayVisible, true, 'management tray must open from the single launcher');
  assert.deepEqual(expanded1440.trayParentIds.sort(), ['automation-hud', 'factory-management-hud', 'progression-hud'].sort());
  assert.equal(expanded1440.progressionVisible, true);
  assert.equal(expanded1440.factoryVisible, true);
  assert.equal(expanded1440.automationVisible, true);
  assert.ok(expanded1440.tray.top >= expanded1440.management.bottom, 'expanded tray must flow below the launcher');
  await page.screenshot({ path: 'artifacts/hud-hierarchy-review/expanded-1440.png' });

  await activateManagement(page);
  await page.setViewport({ width: 1024, height: 720, deviceScaleFactor: 1 });
  await new Promise((resolve) => setTimeout(resolve, 180));
  const collapsed1024 = await inspectHud('1024 collapsed');
  assert.equal(collapsed1024.trayVisible, false);
  await page.screenshot({ path: 'artifacts/hud-hierarchy-review/collapsed-1024.png' });

  await page.setViewport({ width: 600, height: 700, deviceScaleFactor: 1 });
  await new Promise((resolve) => setTimeout(resolve, 180));
  const collapsed600 = await inspectHud('600 collapsed');
  assert.equal(collapsed600.trayVisible, false);
  await page.screenshot({ path: 'artifacts/hud-hierarchy-review/collapsed-600.png' });

  if (pageErrors.length) throw new Error(`Browser page errors:\n${pageErrors.join('\n')}`);
  console.log(JSON.stringify({ collapsed1440, expanded1440, collapsed1024, collapsed600 }, null, 2));
} finally {
  await browser.close();
}
