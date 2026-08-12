import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? {
    executablePath,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  } : {}),
});

async function opacity(locator) {
  return Number(await locator.evaluate((element) => getComputedStyle(element).opacity));
}

async function assertEditorialIntro(name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  const started = Date.now();
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-editorial-intro]', { state: 'attached', timeout: 1500 });

  const shellState = await page.locator('[data-home-intro]').getAttribute('data-home-intro');
  if (shellState !== 'pending') throw new Error(`${name} hero started before the editorial intro (${shellState})`);

  const locked = await page.evaluate(() => document.documentElement.classList.contains('is-editorial-intro'));
  if (!locked) throw new Error(`${name} page is not scroll-locked during the editorial intro`);

  const introBox = await page.locator('[data-editorial-intro]').boundingBox();
  if (!introBox || Math.abs(introBox.width - viewport.width) > 2 || Math.abs(introBox.height - viewport.height) > 2) {
    throw new Error(`${name} editorial intro does not cover the viewport`);
  }

  await page.waitForTimeout(420);
  const o = page.locator('[data-editorial-o]');
  const x = page.locator('[data-editorial-x]');
  const brand = page.locator('[data-editorial-brand]');
  if (await opacity(brand) < 0.7) throw new Error(`${name} VICTOR opening wordmark is not readable`);
  if (await opacity(o) < 0.8 || await opacity(x) > 0.15) throw new Error(`${name} opening state is not clearly VICTOR before the fault`);
  await page.screenshot({ path: `${outDir}/${name}-editorial-victor.png`, fullPage: false });

  await page.waitForFunction(() => document.querySelector('[data-editorial-intro]')?.getAttribute('data-editorial-phase') === 'wrong', undefined, { timeout: 1600 });
  await page.waitForTimeout(150);
  if (await opacity(page.locator('[data-editorial-wrong]')) < 0.55) throw new Error(`${name} WRONG prompt is not readable`);
  await page.screenshot({ path: `${outDir}/${name}-editorial-wrong.png`, fullPage: false });

  await page.waitForFunction(() => document.querySelector('[data-editorial-intro]')?.getAttribute('data-editorial-phase') === 'good', undefined, { timeout: 1600 });
  await page.waitForTimeout(100);
  if (await opacity(page.locator('[data-editorial-good]')) < 0.55) throw new Error(`${name} GOOD response is not readable`);
  await page.screenshot({ path: `${outDir}/${name}-editorial-good.png`, fullPage: false });

  await page.waitForFunction(() => document.querySelector('[data-editorial-intro]')?.getAttribute('data-editorial-phase') === 'break', undefined, { timeout: 1600 });
  await page.waitForTimeout(310);
  if (await opacity(o) > 0.35) throw new Error(`${name} O did not leave the wordmark during the break`);
  if (await opacity(x) < 0.65) throw new Error(`${name} red X did not take the O slot during the break`);
  const xColor = await x.evaluate((element) => getComputedStyle(element).color);
  const accentColor = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--accent)';
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  if (xColor !== accentColor) throw new Error(`${name} replacement X does not use the site accent (${xColor} vs ${accentColor})`);
  await page.screenshot({ path: `${outDir}/${name}-editorial-break.png`, fullPage: false });

  await page.waitForFunction(() => document.querySelector('[data-editorial-intro]')?.getAttribute('data-editorial-phase') === 'different', undefined, { timeout: 1600 });
  await page.waitForTimeout(190);
  const different = page.locator('[data-editorial-different]');
  if ((await different.textContent())?.trim() !== 'DIFFERENTLY.') throw new Error(`${name} DIFFERENTLY beat is malformed`);
  if (await opacity(different) < 0.65) throw new Error(`${name} DIFFERENTLY beat is not visually dominant`);
  await page.screenshot({ path: `${outDir}/${name}-editorial-differently.png`, fullPage: false });

  await page.waitForFunction(() => document.querySelector('[data-editorial-intro]')?.getAttribute('data-editorial-phase') === 'reveal', undefined, { timeout: 1600 });
  await page.waitForTimeout(180);
  await page.screenshot({ path: `${outDir}/${name}-editorial-reveal.png`, fullPage: false });

  await page.waitForSelector('[data-editorial-intro]', { state: 'detached', timeout: 1800 });
  await page.waitForFunction(() => !document.documentElement.classList.contains('is-editorial-intro'), undefined, { timeout: 1800 });
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 1800 });

  const elapsed = Date.now() - started;
  const maxDuration = viewport.width <= 760 ? 3300 : 3500;
  if (elapsed > maxDuration) throw new Error(`${name} intro takes too long (${elapsed}ms > ${maxDuration}ms)`);

  await page.waitForTimeout(420);
  const heroLine = page.locator('[data-intro-line]').first();
  const heroOpacity = Number(await heroLine.evaluate((element) => getComputedStyle(element).opacity));
  if (heroOpacity < 0.75) throw new Error(`${name} hero did not take over after the editorial reveal (${heroOpacity})`);
  await page.screenshot({ path: `${outDir}/${name}-editorial-landed.png`, fullPage: false });

  if (errors.length) throw new Error(`${name} runtime errors:\n${errors.join('\n')}`);
  await context.close();
}

await assertEditorialIntro('desktop-1366', { width: 1366, height: 768 });
await assertEditorialIntro('mobile-393', { width: 393, height: 852 });

const reduced = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
const reducedPage = await reduced.newPage();
await reducedPage.goto(baseURL, { waitUntil: 'domcontentloaded' });
await reducedPage.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 1500 });
if (await reducedPage.locator('[data-editorial-intro]').count()) throw new Error('Reduced-motion mode should skip the editorial intro');
await reduced.close();

await browser.close();
console.log('Editorial NORMAL → WRONG → VICTXR intro passes desktop/mobile choreography and reduced-motion fallback.');
