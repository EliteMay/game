import assert from 'node:assert/strict';
import { access, mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

async function executablePath() {
  for (const candidate of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
    try { await access(candidate); return candidate; } catch { /* try next */ }
  }
  throw new Error('Chrome/Chromium executable not found');
}

await mkdir('artifacts/bilingual-ui-review', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: await executablePath(),
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error)));

try {
  await page.goto('http://127.0.0.1:4173/games/scrap-factory/', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(() => window.__scrapFactoryBilingualUi && window.__scrapFactoryBooted === true && !document.querySelector('#start-game')?.disabled, { timeout: 30000 });

  const boot = await page.evaluate(() => ({
    eyebrow: document.querySelector('.eyebrow')?.textContent?.trim(),
    contract: document.querySelector('.boot-screen__mission span')?.textContent?.trim(),
    status: document.querySelector('#boot-status')?.textContent?.trim(),
    quality: [...document.querySelectorAll('#setting-quality option')].map((option) => option.textContent.trim()),
  }));
  assert.match(boot.eyebrow, /ゲーム01/);
  assert.equal(boot.contract, 'INITIAL CONTRACT（初期目標）');
  assert.equal(boot.status, 'SYSTEM READY（準備完了）');
  assert.deepEqual(boot.quality, ['High（高）', 'Medium（中）', 'Low（低）']);
  await page.screenshot({ path: 'artifacts/bilingual-ui-review/boot.png' });

  await page.click('#start-game');
  await page.waitForSelector('#hud:not([hidden])');
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const gameplay = await page.evaluate(() => ({
    cash: document.querySelector('.hud-stat--cash span, .economy-strip > div:first-child span')?.textContent?.trim(),
    keys: [...document.querySelectorAll('.hud__bottom-left .hud-key span')]
      .filter((node) => getComputedStyle(node).display !== 'none')
      .map((node) => node.textContent.trim()),
    objective: document.querySelector('.objective-panel__header span')?.textContent?.trim(),
    homeMarker: document.querySelector('#home-marker-chip')?.textContent?.trim() || '',
  }));
  assert.match(gameplay.cash || '', /CASH（所持金）/);
  assert.ok(gameplay.keys.some((value) => value.includes('BUILD（建築）')));
  assert.ok(gameplay.keys.some((value) => value.includes('GUIDE（ガイド）')));
  assert.ok(gameplay.keys.some((value) => value.includes('TERMINAL（端末）')));
  assert.equal(gameplay.objective, 'CONTRACT（目標）');
  assert.match(gameplay.homeMarker, /HOME（ホーム）/);

  const translations = await page.evaluate(() => {
    const translate = window.__scrapFactoryBilingualUi.bilingualizeText;
    return {
      longTerm: translate('Advanced Drone Port / Advanced Drone / Resource Point / Recipe / Power'),
      tutorial: translate('MAIN: Home Bed / CURRENT TUTORIAL / RANK 2'),
      home: translate('Backpack II / Home Storage III / 20 SLOTS / Quick Deposit'),
      idempotent: translate(translate('Advanced Drone Port / Resource Point')),
    };
  });
  assert.equal(
    translations.longTerm,
    'Advanced Drone Port（上位ドローンポート） / Advanced Drone（上位ドローン） / Resource Point（資源回収地点） / Recipe（レシピ） / Power（電力）',
  );
  assert.match(translations.tutorial, /MAIN（メイン）: Home Bed（ホームのベッド）/);
  assert.match(translations.tutorial, /CURRENT（現在） TUTORIAL（チュートリアル）/);
  assert.match(translations.tutorial, /RANK（ランク） 2/);
  assert.match(translations.home, /Backpack（バッグ） II/);
  assert.match(translations.home, /Home Storage（ホーム保管庫） III/);
  assert.match(translations.home, /SLOTS（枠）/);
  assert.match(translations.home, /Quick Deposit（一括預け入れ）/);
  assert.equal(translations.idempotent, 'Advanced Drone Port（上位ドローンポート） / Resource Point（資源回収地点）');

  await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.id = 'bilingual-dynamic-probe';
    probe.textContent = 'Automation Console / Advanced Drone Port / Resource Point / Recipe / Power';
    document.body.append(probe);
  });
  await page.waitForFunction(() => document.querySelector('#bilingual-dynamic-probe')?.textContent?.includes('自動化コンソール'));
  const dynamic = await page.$eval('#bilingual-dynamic-probe', (node) => node.textContent);
  assert.equal(
    dynamic,
    'Automation Console（自動化コンソール） / Advanced Drone Port（上位ドローンポート） / Resource Point（資源回収地点） / Recipe（レシピ） / Power（電力）',
  );
  await page.evaluate(() => document.querySelector('#bilingual-dynamic-probe')?.remove());

  await page.keyboard.press('KeyB');
  await page.waitForSelector('#build-panel:not([hidden])');
  await new Promise((resolve) => setTimeout(resolve, 250));
  const build = await page.evaluate(() => ({
    kicker: document.querySelector('#build-panel .panel-kicker')?.textContent?.trim(),
    tutorialMeta: document.querySelector('#build-panel .panel-tutorial-reminder__meta span')?.textContent?.trim() || '',
    tutorialTitle: document.querySelector('#build-panel .panel-tutorial-reminder h3')?.textContent?.trim() || '',
    hasHorizontalOverflow: document.querySelector('#build-panel .panel-card')?.scrollWidth > document.querySelector('#build-panel .panel-card')?.clientWidth,
  }));
  assert.equal(build.kicker, 'FACTORY CONSTRUCTION（工場建築）');
  assert.equal(build.tutorialMeta, 'CURRENT TUTORIAL（現在のチュートリアル）');
  assert.match(build.tutorialTitle, /MAIN（メイン）:/);
  assert.match(build.tutorialTitle, /Home Bed（ホームのベッド）/);
  assert.equal(build.hasHorizontalOverflow, false, 'bilingual build panel must not horizontally overflow');
  await page.screenshot({ path: 'artifacts/bilingual-ui-review/build-panel.png' });

  if (pageErrors.length) throw new Error(`Browser page errors:\n${pageErrors.join('\n')}`);
  console.log(JSON.stringify({ boot, gameplay, translations, dynamic, build }, null, 2));
} finally {
  await browser.close();
}
