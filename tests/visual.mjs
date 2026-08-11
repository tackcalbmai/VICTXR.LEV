import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function documentTop(page, selector) {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top + window.scrollY;
  });
}

async function textBox(page, selector) {
  return page.locator(selector).evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rect = range.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });
}

async function assertMostlyVisible(page, selector, name, minimumRatio = 0.92) {
  const box = await textBox(page, selector);
  const viewport = page.viewportSize();
  if (!box || !viewport || box.width === 0) return;

  const visibleLeft = Math.max(0, box.x);
  const visibleRight = Math.min(viewport.width, box.x + box.width);
  const visibleWidth = Math.max(0, visibleRight - visibleLeft);
  const ratio = visibleWidth / box.width;

  if (ratio < minimumRatio) {
    throw new Error(`${name} is only ${(ratio * 100).toFixed(1)}% visible in the viewport`);
  }
}

async function assertNoTextOverlap(page, firstSelector, secondSelector, name) {
  const first = await textBox(page, firstSelector);
  const second = await textBox(page, secondSelector);

  const overlapX = Math.max(
    0,
    Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x),
  );
  const overlapY = Math.max(
    0,
    Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y),
  );

  if (overlapX > 0 && overlapY > 0) {
    throw new Error(`${name} text overlap detected (${overlapX.toFixed(1)}×${overlapY.toFixed(1)}px)`);
  }
}

async function trackY(page) {
  return page.locator('[data-x-track]').evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    if (!transform || transform === 'none') return 0;
    const match = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
    if (!match) return 0;
    const values = match[1].split(',').map(Number);
    return values.length === 6 ? values[5] : values[13];
  });
}

async function capture(name, contextOptions) {
  const context = await browser.newContext({
    ...contextOptions,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(220);

  const introPending = await page.evaluate(() => document.documentElement.classList.contains('intro-pending'));
  if (!introPending) {
    throw new Error(`${name} opening choreography completed too early to be perceptible`);
  }

  await page.screenshot({ path: `${outDir}/${name}-intro.png`, fullPage: false });
  await page.waitForTimeout(1750);

  const introStillPending = await page.evaluate(() => document.documentElement.classList.contains('intro-pending'));
  if (introStillPending) {
    throw new Error(`${name} opening choreography did not settle`);
  }

  await page.screenshot({ path: `${outDir}/${name}-hero.png`, fullPage: false });
  await page.screenshot({ path: `${outDir}/${name}-full.png`, fullPage: true });

  const suffix = page.locator('.hero__suffix');
  if (await suffix.count()) {
    const suffixBox = await suffix.boundingBox();
    const viewport = page.viewportSize();
    if (suffixBox && viewport && suffixBox.x + suffixBox.width > viewport.width - 6) {
      throw new Error(`${name} hero suffix is clipped outside the viewport`);
    }
  }

  const isMobile = name === 'mobile';
  const viewport = page.viewportSize();
  const vh = viewport?.height ?? 900;
  const disruptionTop = await documentTop(page, '[data-disruption]');
  const scrollCue = page.locator('.hero__scroll');
  const sideNote = page.locator('.hero__side-note');

  if (!(await scrollCue.isVisible())) {
    throw new Error(`${name} scroll cue is not visible on the opening screen`);
  }

  if (!(await sideNote.isVisible())) {
    throw new Error(`${name} side note is not visible on the opening screen`);
  }

  const cueBox = await scrollCue.boundingBox();
  if (cueBox && viewport) {
    const cueCenter = cueBox.x + cueBox.width / 2;
    const viewportCenter = viewport.width / 2;
    if (Math.abs(cueCenter - viewportCenter) > 3) {
      throw new Error(`${name} scroll cue is ${Math.abs(cueCenter - viewportCenter).toFixed(1)}px off center`);
    }
  }

  const visibleXs = await page.locator('.hero__scroll-track span').evaluateAll((spans) =>
    spans.filter((span) => Number.parseFloat(getComputedStyle(span).opacity) > 0.3).length,
  );

  if (visibleXs < 5) {
    throw new Error(`${name} X rail does not have enough visible glyphs (${visibleXs})`);
  }

  const firstTrackY = await trackY(page);
  await page.waitForTimeout(180);
  const secondTrackY = await trackY(page);
  const wrappedDownward = firstTrackY > 35 && secondTrackY < firstTrackY - 25;
  if (secondTrackY <= firstTrackY && !wrappedDownward) {
    throw new Error(`${name} X stream is not moving continuously downward (${firstTrackY} -> ${secondTrackY})`);
  }

  await scrollCue.click();
  await page.waitForTimeout(650);

  const intermediateY = await page.evaluate(() => window.scrollY);
  if (intermediateY < 24) {
    throw new Error(`${name} scroll control did not start moving the page`);
  }

  if (intermediateY > disruptionTop + vh * 0.68) {
    throw new Error(`${name} scroll control jumped too far instead of animating progressively`);
  }

  await page.screenshot({ path: `${outDir}/${name}-scroll-journey.png`, fullPage: false });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(250);

  await page.evaluate(
    ({ y }) => window.scrollTo({ top: y, behavior: 'instant' }),
    { y: disruptionTop + vh * (isMobile ? 0.35 : 0.85) },
  );
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/${name}-disruption-mid.png`, fullPage: false });

  await page.evaluate(
    ({ y }) => window.scrollTo({ top: y, behavior: 'instant' }),
    { y: disruptionTop + vh * (isMobile ? 0.72 : 1.4) },
  );
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/${name}-disruption-late.png`, fullPage: false });

  if (!isMobile) {
    await assertNoTextOverlap(
      page,
      '[data-disruption-caption]',
      '[data-disruption-two]',
      `${name} disruption caption/headline`,
    );
    await assertMostlyVisible(page, '[data-disruption-one]', `${name} first disruption statement`, 0.88);
  }

  const catrinTop = await documentTop(page, '[data-catrin]');
  await page.evaluate(
    ({ y }) => window.scrollTo({ top: y, behavior: 'instant' }),
    { y: Math.max(0, catrinTop - vh * 0.32) },
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/${name}-catrin-entry.png`, fullPage: false });

  await page.evaluate(
    ({ y }) => window.scrollTo({ top: y, behavior: 'instant' }),
    { y: Math.max(0, catrinTop - vh * 0.14) },
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/${name}-catrin-mid.png`, fullPage: false });

  if (!isMobile) {
    await assertMostlyVisible(page, '[data-catrin-title]', `${name} CATRIN readable phase`, 0.98);

    await page.evaluate(
      ({ y }) => window.scrollTo({ top: y, behavior: 'instant' }),
      { y: catrinTop + vh * 0.08 },
    );
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${outDir}/${name}-catrin-break.png`, fullPage: false });
  }

  if (consoleErrors.length) {
    throw new Error(`${name} browser errors:\n${consoleErrors.join('\n')}`);
  }

  await context.close();
}

await capture('desktop-laptop', { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
await capture('desktop', { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await capture('mobile', { ...devices['iPhone 15 Pro'], viewport: { width: 393, height: 852 } });

await browser.close();
console.log(`Visual QA captured from ${baseURL}`);
