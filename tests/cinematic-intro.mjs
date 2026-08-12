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

async function waitPhase(page, phase, timeout = 9000) {
  await page.waitForFunction((expected) => document.querySelector('[data-cinematic-intro]')?.getAttribute('data-cinematic-phase') === expected, phase, { timeout });
}

async function assertCinematicIntro(name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  const phases = {};
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  const startedAt = Date.now();
  const stamp = (phase) => { phases[phase] = Date.now() - startedAt; };

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
  stamp('normal');
  await page.waitForTimeout(520);
  const normalText = (await page.locator('[data-cinematic-wordmark]').textContent())?.replace(/\s+/g, '') ?? '';
  if (!normalText.includes('VICTO') || !normalText.endsWith('R.LEV')) throw new Error(`${name} normal state does not read as VICTOR.LEV`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-normal.png`, fullPage: false });

  await waitPhase(page, 'wrong');
  stamp('wrong');
  await page.waitForTimeout(380);
  const wrongText = (await page.locator('[data-cinematic-wrong]').textContent())?.trim();
  if (wrongText !== 'SOMETHING LOOKS WRONG.') throw new Error(`${name} wrong cue is malformed: ${wrongText}`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-wrong.png`, fullPage: false });

  await waitPhase(page, 'good');
  stamp('good');
  await page.waitForTimeout(320);
  const goodText = (await page.locator('[data-cinematic-good]').textContent())?.trim();
  if (goodText !== 'GOOD.') throw new Error(`${name} GOOD cue is malformed: ${goodText}`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-good.png`, fullPage: false });

  await waitPhase(page, 'x');
  stamp('x');
  await page.waitForTimeout(210);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-x-impact.png`, fullPage: false });

  await waitPhase(page, 'victxr');
  stamp('victxr');
  await page.waitForTimeout(330);
  const oOpacity = Number(await page.locator('[data-cinematic-o]').evaluate((element) => getComputedStyle(element).opacity));
  const xOpacity = Number(await page.locator('[data-cinematic-x]').evaluate((element) => getComputedStyle(element).opacity));
  if (oOpacity > 0.15 || xOpacity < 0.75) throw new Error(`${name} O→X replacement did not settle cleanly (O ${oOpacity}, X ${xOpacity})`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-victxr.png`, fullPage: false });

  await waitPhase(page, 'differently');
  stamp('differently');
  await page.waitForTimeout(360);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-differently.png`, fullPage: false });

  await waitPhase(page, 'reveal');
  stamp('reveal');
  await page.waitForTimeout(190);
  const handoffOpacity = Number(await page.locator('[data-cinematic-differently]').evaluate((element) => getComputedStyle(element).opacity));
  const handoffVisibility = await page.locator('[data-cinematic-differently]').evaluate((element) => getComputedStyle(element).visibility);
  if (handoffOpacity < 0.25 || handoffVisibility === 'hidden') {
    throw new Error(`${name} reveal fell into a blank paper frame (DIFFERENTLY opacity ${handoffOpacity}, visibility ${handoffVisibility})`);
  }
  await page.screenshot({ path: `${outDir}/${name}-cinematic-reveal.png`, fullPage: false });

  const minimumBeatSpacing = [
    ['normal', 'wrong', 1300],
    ['wrong', 'good', 800],
    ['good', 'x', 700],
    ['x', 'victxr', 500],
    ['victxr', 'differently', 550],
    ['differently', 'reveal', 700],
  ];
  for (const [from, to, minimum] of minimumBeatSpacing) {
    const spacing = phases[to] - phases[from];
    if (spacing < minimum) throw new Error(`${name} ${from}→${to} beat is rushed (${spacing}ms < ${minimum}ms)`);
  }

  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 9000 });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 2500 });

  const duration = Date.now() - startedAt;
  if (duration < 6800 || duration > 8500) throw new Error(`${name} intro duration ${duration}ms is outside the intended cinematic window`);

  const stillLocked = await page.evaluate(() => document.documentElement.classList.contains('is-cinematic-intro'));
  if (stillLocked) throw new Error(`${name} page stayed scroll-locked after the intro`);

  await page.waitForTimeout(650);
  const heroLine = page.locator('[data-intro-line]').first();
  const heroOpacity = Number(await heroLine.evaluate((element) => getComputedStyle(element).opacity));
  if (heroOpacity < 0.75) throw new Error(`${name} hero did not take over after the cinematic reveal (${heroOpacity})`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-landed.png`, fullPage: false });

  if (errors.length) throw new Error(`${name} runtime errors:\n${errors.join('\n')}`);
  await context.close();
  return { duration, phases };
}

const desktop = await assertCinematicIntro('desktop-1366', { width: 1366, height: 768 });
const mobile = await assertCinematicIntro('mobile-393', { width: 393, height: 852 });
if (Math.abs(desktop.duration - mobile.duration) > 350) {
  throw new Error(`Desktop/mobile cinematic timing diverged too far (${desktop.duration}ms vs ${mobile.duration}ms)`);
}

const reduced = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
const reducedPage = await reduced.newPage();
await reducedPage.goto(baseURL, { waitUntil: 'domcontentloaded' });
await reducedPage.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 1500 });
if (await reducedPage.locator('[data-cinematic-intro]').count()) throw new Error('Reduced-motion mode should skip the cinematic intro');
await reduced.close();

await browser.close();
console.log(`Cinematic intro keeps readable breathing room on desktop/mobile (${desktop.duration}ms / ${mobile.duration}ms).`);
