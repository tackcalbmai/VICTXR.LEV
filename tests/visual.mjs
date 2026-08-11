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

  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

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
  if (!isMobile) {
    const scrollCue = page.locator('.hero__scroll');
    if (!(await scrollCue.isVisible())) {
      throw new Error(`${name} scroll cue is not visible on the opening screen`);
    }
  }

  const disruptionTop = await documentTop(page, '[data-disruption]');
  const viewport = page.viewportSize();
  const vh = viewport?.height ?? 900;

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
    await assertMostlyVisible(page, '[data-disruption-one]', `${name} first disruption statement`, 0.98);
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
    { y: catrinTop + vh * 0.18 },
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/${name}-catrin-mid.png`, fullPage: false });

  if (!isMobile) {
    await assertMostlyVisible(page, '[data-catrin-title]', `${name} CATRIN title`);
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
