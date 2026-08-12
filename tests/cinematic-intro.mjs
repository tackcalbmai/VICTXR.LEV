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

async function waitPhase(page, phase, timeout = 7000) {
  await page.waitForFunction((expected) => document.querySelector('[data-cinematic-intro]')?.getAttribute('data-cinematic-phase') === expected, phase, { timeout });
}

function center(box) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
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
  if (shellState !== 'pending') throw new Error(`${name} hero started before the logo intro (${shellState})`);

  const locked = await page.evaluate(() => document.documentElement.classList.contains('is-cinematic-intro'));
  if (!locked) throw new Error(`${name} page is not scroll-locked during the logo intro`);

  const introBox = await page.locator('[data-cinematic-intro]').boundingBox();
  if (!introBox || Math.abs(introBox.width - viewport.width) > 2 || Math.abs(introBox.height - viewport.height) > 2) {
    throw new Error(`${name} logo intro does not cover the viewport`);
  }

  const backdropColor = await page.locator('[data-cinematic-backdrop]').evaluate((element) => getComputedStyle(element).backgroundColor);
  if (!backdropColor.includes('8, 8, 8')) throw new Error(`${name} intro does not open on the intended black field (${backdropColor})`);

  await waitPhase(page, 'logo');
  stamp('logo');
  await page.waitForTimeout(620);
  const descriptor = (await page.locator('[data-cinematic-descriptor]').textContent())?.trim();
  if (descriptor !== 'WEB DESIGN') throw new Error(`${name} descriptor is malformed: ${descriptor}`);
  const initialLogo = (await page.locator('[data-cinematic-wordmark]').textContent())?.replace(/\s+/g, '') ?? '';
  if (initialLogo !== 'VICTXR.LEV') throw new Error(`${name} initial logo is malformed: ${initialLogo}`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-logo.png`, fullPage: false });

  await waitPhase(page, 'x-to-o');
  stamp('x-to-o');
  await page.waitForFunction(() => document.querySelector('[data-cinematic-letter]')?.textContent === 'O', undefined, { timeout: 1400 });

  await waitPhase(page, 'o-rest');
  stamp('o-rest');
  await page.waitForTimeout(120);
  const oText = (await page.locator('[data-cinematic-wordmark]').textContent())?.replace(/\s+/g, '') ?? '';
  if (oText !== 'VICTOR.LEV') throw new Error(`${name} X→O cycle did not settle on VICTOR.LEV: ${oText}`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-o-rest.png`, fullPage: false });

  await waitPhase(page, 'o-to-x');
  stamp('o-to-x');
  await page.waitForFunction(() => document.querySelector('[data-cinematic-letter]')?.textContent === 'X', undefined, { timeout: 1400 });

  await waitPhase(page, 'x-rest');
  stamp('x-rest');
  await page.waitForTimeout(120);
  const xText = (await page.locator('[data-cinematic-wordmark]').textContent())?.replace(/\s+/g, '') ?? '';
  if (xText !== 'VICTXR.LEV') throw new Error(`${name} full X/O cycle did not resolve on VICTXR.LEV: ${xText}`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-x-rest.png`, fullPage: false });

  const headerBrandBox = await page.locator('.site-brand').boundingBox();
  if (!headerBrandBox) throw new Error(`${name} header brand has no geometry`);

  await waitPhase(page, 'handoff');
  stamp('handoff');
  await page.waitForTimeout(760);
  const flyingBox = await page.locator('[data-cinematic-wordmark]').boundingBox();
  if (!flyingBox) throw new Error(`${name} flying wordmark has no geometry`);
  const handoffDistance = distance(center(flyingBox), center(headerBrandBox));
  if (handoffDistance > Math.max(16, viewport.width * 0.025)) {
    throw new Error(`${name} wordmark is not converging on the real header brand (${handoffDistance.toFixed(1)}px)`);
  }
  await page.screenshot({ path: `${outDir}/${name}-cinematic-handoff.png`, fullPage: false });

  await waitPhase(page, 'reveal');
  stamp('reveal');
  await page.waitForFunction(() => {
    const header = document.querySelector('[data-site-header]');
    return header && Number.parseFloat(getComputedStyle(header).opacity) >= 0.9;
  }, undefined, { timeout: 1100 });
  const headerOpacity = Number(await page.locator('[data-site-header]').evaluate((element) => getComputedStyle(element).opacity));
  if (headerOpacity < 0.9) throw new Error(`${name} real header did not take over after the flying logo (${headerOpacity})`);
  const backdrop = page.locator('[data-cinematic-backdrop]');
  if (!await backdrop.count()) throw new Error(`${name} cinematic field disappeared before the header handoff could be seen`);
  const backdropOpacity = Number(await backdrop.evaluate((element) => getComputedStyle(element).opacity));
  if (backdropOpacity > 0.6) throw new Error(`${name} black field is not fading during hero reveal (${backdropOpacity})`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-reveal.png`, fullPage: false });

  const minimumBeatSpacing = [
    ['logo', 'x-to-o', 850],
    ['x-to-o', 'o-rest', 850],
    ['o-rest', 'o-to-x', 350],
    ['o-to-x', 'x-rest', 850],
    ['x-rest', 'handoff', 150],
  ];
  for (const [from, to, minimum] of minimumBeatSpacing) {
    const spacing = phases[to] - phases[from];
    if (spacing < minimum) throw new Error(`${name} ${from}→${to} beat is rushed (${spacing}ms < ${minimum}ms)`);
  }

  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 7000 });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 2500 });

  const duration = Date.now() - startedAt;
  if (duration < 4600 || duration > 6200) throw new Error(`${name} intro duration ${duration}ms is outside the intended premium hook window`);

  const stillLocked = await page.evaluate(() => document.documentElement.classList.contains('is-cinematic-intro'));
  if (stillLocked) throw new Error(`${name} page stayed scroll-locked after the intro`);

  await page.waitForTimeout(500);
  const heroLine = page.locator('[data-intro-line]').first();
  const heroOpacity = Number(await heroLine.evaluate((element) => getComputedStyle(element).opacity));
  if (heroOpacity < 0.7) throw new Error(`${name} hero did not progressively take over after the logo handoff (${heroOpacity})`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-landed.png`, fullPage: false });

  if (errors.length) throw new Error(`${name} runtime errors:\n${errors.join('\n')}`);
  await context.close();
  return { duration, phases };
}

const desktop = await assertCinematicIntro('desktop-1366', { width: 1366, height: 768 });
const mobile = await assertCinematicIntro('mobile-393', { width: 393, height: 852 });
if (Math.abs(desktop.duration - mobile.duration) > 350) {
  throw new Error(`Desktop/mobile premium intro timing diverged too far (${desktop.duration}ms vs ${mobile.duration}ms)`);
}

const reduced = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
const reducedPage = await reduced.newPage();
await reducedPage.goto(baseURL, { waitUntil: 'domcontentloaded' });
await reducedPage.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 1500 });
if (await reducedPage.locator('[data-cinematic-intro]').count()) throw new Error('Reduced-motion mode should skip the cinematic intro');
await reduced.close();

await browser.close();
console.log(`Premium logo intro completes one X/O cycle and hands off into the real header (${desktop.duration}ms / ${mobile.duration}ms).`);