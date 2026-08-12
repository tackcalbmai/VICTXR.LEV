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

async function assertBrandMotion(name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 5000 });

  const slot = page.locator('.site-brand__letter-wrap');
  const glyph = page.locator('[data-brand-letter]');
  const reference = page.locator('.site-brand > span').first();
  const baselineBox = await slot.boundingBox();
  if (!baselineBox) throw new Error(`${name} brand slot has no geometry`);
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
  for (let i = 0; i < 55; i += 1) {
    const box = await slot.boundingBox();
    if (box) maxFlight = Math.max(maxFlight, distance(center(box), baselineCenter));
    if ((await glyph.textContent()) === 'O') {
      sawO = true;
      break;
    }
    await page.waitForTimeout(40);
  }

  if (!sawO) throw new Error(`${name} brand never changed from X to O`);
  if (maxFlight < (viewport.width <= 760 ? 2.5 : 4)) throw new Error(`${name} X/O motion no longer has an intentional flight (${maxFlight.toFixed(1)}px)`);

  await page.waitForTimeout(520);
  if ((await glyph.textContent()) !== 'O') throw new Error(`${name} O did not remain readable after landing`);
  const oBox = await slot.boundingBox();
  const oGlyphBox = await glyph.boundingBox();
  if (!oBox || !oGlyphBox) throw new Error(`${name} O landing has no geometry`);
  const oOffset = distance(center(oBox), baselineCenter);
  if (oOffset > 1.5) throw new Error(`${name} O landed ${oOffset.toFixed(1)}px away from its brand slot`);
  const oGlyphOffset = distance(center(oGlyphBox), center(oBox));
  if (oGlyphOffset > 1.5) throw new Error(`${name} O is not centered inside its slot (${oGlyphOffset.toFixed(1)}px)`);
  const oInk = await glyphRect(glyph);
  const oBaselineDelta = Math.abs(center(oInk).y - center(referenceGlyph).y);
  if (oBaselineDelta > 1.5) throw new Error(`${name} O sits ${oBaselineDelta.toFixed(1)}px off the wordmark line`);
  const oColor = await glyph.evaluate((element) => getComputedStyle(element).color);
  if (oColor !== referenceColor) throw new Error(`${name} O should inherit the wordmark color (${oColor} vs ${referenceColor})`);
  await page.screenshot({ path: `${outDir}/${name}-brand-o-landed.png`, fullPage: false });

  await page.waitForFunction(() => document.querySelector('[data-brand-letter]')?.textContent === 'X', undefined, { timeout: 4200 });
  await page.waitForTimeout(520);
  const xBox = await slot.boundingBox();
  const xGlyphBox = await glyph.boundingBox();
  if (!xBox || !xGlyphBox) throw new Error(`${name} X return has no geometry`);
  const xOffset = distance(center(xBox), baselineCenter);
  if (xOffset > 1.5) throw new Error(`${name} X returned ${xOffset.toFixed(1)}px away from its brand slot`);
  const xGlyphOffset = distance(center(xGlyphBox), center(xBox));
  if (xGlyphOffset > 1.5) throw new Error(`${name} X is not centered inside its slot (${xGlyphOffset.toFixed(1)}px)`);
  const xInk = await glyphRect(glyph);
  const xBaselineDelta = Math.abs(center(xInk).y - center(referenceGlyph).y);
  if (xBaselineDelta > 1.5) throw new Error(`${name} X sits ${xBaselineDelta.toFixed(1)}px off the wordmark line`);
  const xColor = await glyph.evaluate((element) => getComputedStyle(element).color);
  if (xColor !== accentColor) throw new Error(`${name} X does not use the site accent (${xColor} vs ${accentColor})`);
  await page.screenshot({ path: `${outDir}/${name}-brand-x-restored.png`, fullPage: false });

  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`${name} brand motion creates ${overflow}px horizontal overflow`);
  if (errors.length) throw new Error(`${name} runtime errors:\n${errors.join('\n')}`);

  await context.close();
}

await assertBrandMotion('desktop-1366', { width: 1366, height: 768 });
await assertBrandMotion('mobile-393', { width: 393, height: 852 });

await browser.close();
console.log('Brand X/O flight lands on the wordmark baseline with the correct X accent on desktop and mobile.');
