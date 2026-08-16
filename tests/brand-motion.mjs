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

function center(box) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function glyphRect(locator) {
  return locator.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rect = range.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

async function assertCrispRest(slot, glyph, name, phase) {
  const state = await slot.evaluate((element) => ({
    transform: getComputedStyle(element).transform,
    willChange: getComputedStyle(element).willChange,
  }));
  const glyphTransform = await glyph.evaluate((element) => getComputedStyle(element).transform);
  if (state.transform !== 'none') throw new Error(`${name} ${phase} keeps a composited transform at rest (${state.transform})`);
  if (state.willChange.includes('transform')) throw new Error(`${name} ${phase} keeps transform will-change at rest (${state.willChange})`);
  if (glyphTransform !== 'none') throw new Error(`${name} ${phase} glyph keeps a transform at rest (${glyphTransform})`);
}

async function waitForBrandRest(page, letter, timeout = 1800) {
  await page.waitForFunction((expected) => {
    const glyph = document.querySelector('[data-brand-letter]');
    const slot = glyph?.closest('.site-brand__letter-wrap');
    if (!glyph || !slot || glyph.textContent !== expected) return false;
    return getComputedStyle(slot).transform === 'none' && getComputedStyle(glyph).transform === 'none';
  }, letter, { timeout });
}

async function assertBrandMotion(name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 9000 });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 3000 });
  await page.waitForTimeout(80);

  const primaryBrand = page.locator('.site-brand');
  const byline = page.locator('[data-xo-submark]');
  const slot = page.locator('.site-brand__letter-wrap');
  const glyph = page.locator('[data-brand-letter]');
  const reference = page.locator('.site-brand-submark__core > span').first();

  const hierarchy = await page.evaluate(() => ({
    primary: document.querySelector('.site-brand')?.textContent?.replace(/\s+/g, ' ').trim(),
    byline: document.querySelector('[data-xo-submark]')?.textContent?.replace(/\s+/g, ' ').trim(),
  }));
  if (hierarchy.primary !== 'XO WEB') throw new Error(`${name} primary wordmark should be XO WEB, got ${hierarchy.primary}`);
  if (!hierarchy.byline?.includes('BY VICTXR.LEV')) throw new Error(`${name} author signature should expose BY VICTXR.LEV, got ${hierarchy.byline}`);

  const primaryBox = await primaryBrand.boundingBox();
  const bylineBox = await byline.boundingBox();
  if (!primaryBox || !bylineBox) throw new Error(`${name} brand hierarchy has missing geometry`);
  if (primaryBox.height <= bylineBox.height) throw new Error(`${name} XO WEB no longer has stronger visual hierarchy than the author signature`);

  const baselineBox = await slot.boundingBox();
  if (!baselineBox) throw new Error(`${name} author X/O slot has no geometry`);
  const baselineCenter = center(baselineBox);
  const referenceGlyph = await glyphRect(reference);
  const referenceColor = await reference.evaluate((element) => getComputedStyle(element).color);
  const accentColor = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--accent)';
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });

  let maxFlight = 0;
  let sawO = false;
  for (let i = 0; i < 300; i += 1) {
    const box = await slot.boundingBox();
    if (box) maxFlight = Math.max(maxFlight, distance(center(box), baselineCenter));
    if ((await glyph.textContent()) === 'O') {
      sawO = true;
      break;
    }
    await page.waitForTimeout(40);
  }

  if (!sawO) throw new Error(`${name} author signature never changed from X to O after its intentional idle hold`);
  if (maxFlight < (viewport.width <= 760 ? 2.5 : 4)) throw new Error(`${name} X/O motion no longer has an intentional flight (${maxFlight.toFixed(1)}px)`);

  await waitForBrandRest(page, 'O');
  const oBox = await slot.boundingBox();
  if (!oBox) throw new Error(`${name} O landing has no geometry`);
  const oOffset = distance(center(oBox), baselineCenter);
  if (oOffset > 1.5) throw new Error(`${name} O landed ${oOffset.toFixed(1)}px away from its author slot`);
  const oInk = await glyphRect(glyph);
  const oBaselineDelta = Math.abs(center(oInk).y - center(referenceGlyph).y);
  if (oBaselineDelta > 1.5) throw new Error(`${name} O sits ${oBaselineDelta.toFixed(1)}px off the author line`);
  const oColor = await glyph.evaluate((element) => getComputedStyle(element).color);
  if (oColor !== referenceColor) throw new Error(`${name} O should inherit the author-signature color (${oColor} vs ${referenceColor})`);
  await assertCrispRest(slot, glyph, name, 'O landing');
  await page.screenshot({ path: `${outDir}/${name}-brand-o-landed.png`, fullPage: false });

  await page.waitForFunction(() => document.querySelector('[data-brand-letter]')?.textContent === 'X', undefined, { timeout: 6500 });
  await waitForBrandRest(page, 'X');
  const xBox = await slot.boundingBox();
  if (!xBox) throw new Error(`${name} X return has no geometry`);
  const xOffset = distance(center(xBox), baselineCenter);
  if (xOffset > 1.5) throw new Error(`${name} X returned ${xOffset.toFixed(1)}px away from its author slot`);
  const xInk = await glyphRect(glyph);
  const xBaselineDelta = Math.abs(center(xInk).y - center(referenceGlyph).y);
  if (xBaselineDelta > 1.5) throw new Error(`${name} X sits ${xBaselineDelta.toFixed(1)}px off the author line`);
  const xColor = await glyph.evaluate((element) => getComputedStyle(element).color);
  if (xColor !== accentColor) throw new Error(`${name} author X does not use the site accent (${xColor} vs ${accentColor})`);
  await assertCrispRest(slot, glyph, name, 'X landing');
  await page.screenshot({ path: `${outDir}/${name}-brand-x-restored.png`, fullPage: false });

  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`${name} brand motion creates ${overflow}px horizontal overflow`);
  if (errors.length) throw new Error(`${name} runtime errors:\n${errors.join('\n')}`);

  await context.close();
}

await assertBrandMotion('desktop-1366', { width: 1366, height: 768 });
await assertBrandMotion('mobile-393', { width: 393, height: 852 });

await browser.close();
console.log('XO WEB stays primary while the VICTXR.LEV author signature keeps its X/O motion, precise landing and crisp rest state.');
