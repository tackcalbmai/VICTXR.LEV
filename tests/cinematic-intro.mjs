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

async function assertCinematicIntro(name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'attached', timeout: 1500 });

  const shellState = await page.locator('[data-home-intro]').getAttribute('data-home-intro');
  if (shellState !== 'pending') throw new Error(`${name} hero started before the cinematic intro (${shellState})`);

  const locked = await page.evaluate(() => document.documentElement.classList.contains('is-cinematic-intro'));
  if (!locked) throw new Error(`${name} page is not scroll-locked during the cinematic intro`);

  const introBox = await page.locator('[data-cinematic-intro]').boundingBox();
  if (!introBox || Math.abs(introBox.width - viewport.width) > 2 || Math.abs(introBox.height - viewport.height) > 2) {
    throw new Error(`${name} cinematic intro does not cover the viewport`);
  }

  await page.waitForFunction(() => document.querySelector('[data-cinematic-intro]')?.getAttribute('data-cinematic-phase') === 'x', undefined, { timeout: 1800 });
  await page.waitForTimeout(220);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-x.png`, fullPage: false });

  await page.waitForFunction(() => document.querySelector('[data-cinematic-intro]')?.getAttribute('data-cinematic-phase') === 'o', undefined, { timeout: 1800 });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-o.png`, fullPage: false });

  await page.waitForFunction(() => document.querySelector('[data-cinematic-intro]')?.getAttribute('data-cinematic-phase') === 'wordmark', undefined, { timeout: 1800 });
  await page.waitForTimeout(250);
  const wordmarkText = (await page.locator('[data-cinematic-wordmark]').textContent())?.replace(/\s+/g, '') ?? '';
  if (wordmarkText !== 'VICTXR.LEV') throw new Error(`${name} intro wordmark is malformed: ${wordmarkText}`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-wordmark.png`, fullPage: false });

  await page.waitForFunction(() => document.querySelector('[data-cinematic-intro]')?.getAttribute('data-cinematic-phase') === 'reveal', undefined, { timeout: 1800 });
  await page.waitForTimeout(160);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-reveal.png`, fullPage: false });

  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 4000 });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 1800 });

  const stillLocked = await page.evaluate(() => document.documentElement.classList.contains('is-cinematic-intro'));
  if (stillLocked) throw new Error(`${name} page stayed scroll-locked after the intro`);

  await page.waitForTimeout(650);
  const heroLine = page.locator('[data-intro-line]').first();
  const heroOpacity = Number(await heroLine.evaluate((element) => getComputedStyle(element).opacity));
  if (heroOpacity < 0.75) throw new Error(`${name} hero did not take over after the cinematic reveal (${heroOpacity})`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-landed.png`, fullPage: false });

  if (errors.length) throw new Error(`${name} runtime errors:\n${errors.join('\n')}`);
  await context.close();
}

await assertCinematicIntro('desktop-1366', { width: 1366, height: 768 });
await assertCinematicIntro('mobile-393', { width: 393, height: 852 });

const reduced = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
const reducedPage = await reduced.newPage();
await reducedPage.goto(baseURL, { waitUntil: 'domcontentloaded' });
await reducedPage.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 1500 });
if (await reducedPage.locator('[data-cinematic-intro]').count()) throw new Error('Reduced-motion mode should skip the cinematic intro');
await reduced.close();

await browser.close();
console.log('Cinematic X/O intro passes staged desktop/mobile choreography and reduced-motion fallback.');
