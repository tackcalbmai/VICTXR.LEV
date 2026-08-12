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

async function waitPhase(page, phase, timeout = 2500) {
  await page.waitForFunction((expected) => document.querySelector('[data-cinematic-intro]')?.getAttribute('data-cinematic-phase') === expected, phase, { timeout });
}

async function assertCinematicIntro(name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  const startedAt = Date.now();
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

  await waitPhase(page, 'normal');
  await page.waitForTimeout(260);
  const normalText = (await page.locator('[data-cinematic-wordmark]').textContent())?.replace(/\s+/g, '') ?? '';
  if (!normalText.includes('VICTO') || !normalText.endsWith('R.LEV')) throw new Error(`${name} normal state does not read as VICTOR.LEV`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-normal.png`, fullPage: false });

  await waitPhase(page, 'wrong');
  await page.waitForTimeout(190);
  const wrongText = (await page.locator('[data-cinematic-wrong]').textContent())?.trim();
  if (wrongText !== 'SOMETHING LOOKS WRONG.') throw new Error(`${name} wrong cue is malformed: ${wrongText}`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-wrong.png`, fullPage: false });

  await waitPhase(page, 'good');
  await page.waitForTimeout(150);
  const goodText = (await page.locator('[data-cinematic-good]').textContent())?.trim();
  if (goodText !== 'GOOD.') throw new Error(`${name} GOOD cue is malformed: ${goodText}`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-good.png`, fullPage: false });

  await waitPhase(page, 'x');
  await page.waitForTimeout(170);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-x-impact.png`, fullPage: false });

  await waitPhase(page, 'victxr');
  await page.waitForTimeout(150);
  const oOpacity = Number(await page.locator('[data-cinematic-o]').evaluate((element) => getComputedStyle(element).opacity));
  const xOpacity = Number(await page.locator('[data-cinematic-x]').evaluate((element) => getComputedStyle(element).opacity));
  if (oOpacity > 0.15 || xOpacity < 0.75) throw new Error(`${name} O→X replacement did not settle cleanly (O ${oOpacity}, X ${xOpacity})`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-victxr.png`, fullPage: false });

  await waitPhase(page, 'differently');
  await page.waitForTimeout(190);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-differently.png`, fullPage: false });

  await waitPhase(page, 'reveal');
  await page.waitForTimeout(170);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-reveal.png`, fullPage: false });

  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 5000 });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 1800 });

  const duration = Date.now() - startedAt;
  if (duration < 3600 || duration > 5000) throw new Error(`${name} intro duration ${duration}ms is outside the intended cinematic window`);

  const stillLocked = await page.evaluate(() => document.documentElement.classList.contains('is-cinematic-intro'));
  if (stillLocked) throw new Error(`${name} page stayed scroll-locked after the intro`);

  await page.waitForTimeout(650);
  const heroLine = page.locator('[data-intro-line]').first();
  const heroOpacity = Number(await heroLine.evaluate((element) => getComputedStyle(element).opacity));
  if (heroOpacity < 0.75) throw new Error(`${name} hero did not take over after the cinematic reveal (${heroOpacity})`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-landed.png`, fullPage: false });

  if (errors.length) throw new Error(`${name} runtime errors:\n${errors.join('\n')}`);
  await context.close();
  return duration;
}

const desktopDuration = await assertCinematicIntro('desktop-1366', { width: 1366, height: 768 });
const mobileDuration = await assertCinematicIntro('mobile-393', { width: 393, height: 852 });
if (Math.abs(desktopDuration - mobileDuration) > 300) {
  throw new Error(`Desktop/mobile cinematic timing diverged too far (${desktopDuration}ms vs ${mobileDuration}ms)`);
}

const reduced = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
const reducedPage = await reduced.newPage();
await reducedPage.goto(baseURL, { waitUntil: 'domcontentloaded' });
await reducedPage.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 1500 });
if (await reducedPage.locator('[data-cinematic-intro]').count()) throw new Error('Reduced-motion mode should skip the cinematic intro');
await reduced.close();

await browser.close();
console.log(`NORMAL → WRONG → VICTXR cinematic intro passes with matched desktop/mobile timing (${desktopDuration}ms / ${mobileDuration}ms).`);
