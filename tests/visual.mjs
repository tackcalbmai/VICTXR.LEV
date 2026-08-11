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
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
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
  if (ratio < minimumRatio) throw new Error(`${name} is only ${(ratio * 100).toFixed(1)}% visible in the viewport`);
}

async function assertNoTextOverlap(page, firstSelector, secondSelector, name) {
  const first = await textBox(page, firstSelector);
  const second = await textBox(page, secondSelector);
  const overlapX = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x));
  const overlapY = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y));
  if (overlapX > 0 && overlapY > 0) throw new Error(`${name} text overlap detected (${overlapX.toFixed(1)}×${overlapY.toFixed(1)}px)`);
}

async function assertXDirection(page, name) {
  const glyph = page.locator('.hero__scroll-track span').nth(3);
  const ys = [];
  for (let i = 0; i < 6; i += 1) {
    const box = await glyph.boundingBox();
    if (box) ys.push(box.y);
    await page.waitForTimeout(90);
  }
  let downwardSteps = 0;
  let upwardSteps = 0;
  for (let i = 1; i < ys.length; i += 1) {
    const delta = ys[i] - ys[i - 1];
    if (delta > 0.35) downwardSteps += 1;
    if (delta < -0.35) upwardSteps += 1;
  }
  if (downwardSteps < 3 || upwardSteps > 1) {
    throw new Error(`${name} X cue does not read as continuous downward motion (${ys.map((y) => y.toFixed(1)).join(' → ')})`);
  }
}

async function assertRailSpacing(page, name) {
  const glyphs = await page.locator('.hero__scroll-track span').evaluateAll((spans) =>
    spans
      .map((span) => {
        const style = getComputedStyle(span);
        const rect = span.getBoundingClientRect();
        return { opacity: Number.parseFloat(style.opacity), y: rect.y, h: rect.height };
      })
      .filter((glyph) => glyph.opacity > 0.24)
      .sort((a, b) => a.y - b.y),
  );

  for (let i = 1; i < glyphs.length; i += 1) {
    const gap = glyphs[i].y - (glyphs[i - 1].y + glyphs[i - 1].h);
    if (gap < -1.5) throw new Error(`${name} X rail glyphs overlap by ${Math.abs(gap).toFixed(1)}px`);
  }
}

async function capture(name, contextOptions) {
  const context = await browser.newContext({ ...contextOptions, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

  if (name === 'desktop-laptop') {
    await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 4500 });
    await page.evaluate(() => window.scrollTo(0, 640));
    await page.waitForTimeout(80);
    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  await page.waitForTimeout(90);
  const reloadY = await page.evaluate(() => window.scrollY);
  if (reloadY > 2) throw new Error(`${name} did not reset to the top on load/reload (scrollY=${reloadY})`);

  const introState = await page.locator('[data-home-intro]').getAttribute('data-home-intro');
  if (introState !== 'pending') throw new Error(`${name} hero intro did not expose a real opening state`);

  const openingLines = await page.locator('[data-intro-line]').evaluateAll((lines) =>
    lines.map((line) => ({ opacity: Number.parseFloat(getComputedStyle(line).opacity), transform: getComputedStyle(line).transform })),
  );
  if (!openingLines.some((line) => line.opacity > 0.02) || !openingLines.some((line) => line.opacity < 0.95)) {
    throw new Error(`${name} hero lines are not visibly sequencing during opening animation`);
  }

  const openingSideOpacity = await page.locator('[data-side-note]').evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
  if (openingSideOpacity > 0.92) throw new Error(`${name} vertical/side note is already fully visible during intro`);
  await page.screenshot({ path: `${outDir}/${name}-intro-opening.png`, fullPage: false });

  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 4500 });
  await page.waitForTimeout(160);
  await page.screenshot({ path: `${outDir}/${name}-hero.png`, fullPage: false });
  await page.screenshot({ path: `${outDir}/${name}-full.png`, fullPage: true });

  for (const line of await page.locator('[data-intro-line]').all()) {
    if (!(await line.isVisible())) throw new Error(`${name} hero line is hidden after intro completes`);
  }

  const suffix = page.locator('.hero__suffix');
  if (await suffix.count()) {
    const suffixBox = await suffix.boundingBox();
    const viewport = page.viewportSize();
    if (suffixBox && viewport && suffixBox.x + suffixBox.width > viewport.width - 6) throw new Error(`${name} hero suffix is clipped outside the viewport`);
    if (name === 'mobile') {
      const suffixSize = await suffix.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
      const wordSize = await page.locator('.hero__line--different .hero__line-inner').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
      if (suffixSize < wordSize * 0.9) throw new Error(`mobile LY. suffix is still visually undersized (${suffixSize}px vs ${wordSize}px)`);
    }
  }

  const actionText = await page.locator('.hero__actions').innerText();
  if (/[↗↘➡⬇]/u.test(actionText)) throw new Error(`${name} hero actions still contain Unicode/emoji arrows`);

  const brand = page.locator('.site-header__brand');
  const brandSize = await brand.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  if (brandSize < (name === 'mobile' ? 14 : 15)) throw new Error(`${name} brand is still too small (${brandSize}px)`);

  const brandLetter = page.locator('[data-brand-letter]');
  await page.waitForFunction(() => document.querySelector('[data-brand-letter]')?.textContent === 'O', undefined, { timeout: 3000 });
  await page.screenshot({ path: `${outDir}/${name}-brand-victor.png`, fullPage: false });
  await page.waitForFunction(() => document.querySelector('[data-brand-letter]')?.textContent === 'X', undefined, { timeout: 3200 });
  if ((await brandLetter.textContent()) !== 'X') throw new Error(`${name} brand letter did not return to X`);

  const scrollCue = page.locator('.hero__scroll');
  const sideNote = page.locator('.hero__side-note');
  if (!(await scrollCue.isVisible())) throw new Error(`${name} scroll cue is not visible on the opening screen`);
  if (!(await sideNote.isVisible())) throw new Error(`${name} side note is not visible on the opening screen`);

  const viewport = page.viewportSize();
  const cueBox = await scrollCue.boundingBox();
  if (cueBox && viewport) {
    const offset = Math.abs(cueBox.x + cueBox.width / 2 - viewport.width / 2);
    if (offset > 3) throw new Error(`${name} scroll cue is ${offset.toFixed(1)}px off center`);
    if (name === 'mobile' && cueBox.height > 78) throw new Error(`mobile scroll cue is still too tall (${cueBox.height.toFixed(1)}px)`);
  }

  const glyphCount = await page.locator('.hero__scroll-track span').count();
  if (glyphCount !== 8) throw new Error(`${name} X rail should contain 8 glyphs, found ${glyphCount}`);
  const visibleXs = await page.locator('.hero__scroll-track span').evaluateAll((spans) => spans.filter((span) => Number.parseFloat(getComputedStyle(span).opacity) > 0.18).length);
  if (visibleXs < 2) throw new Error(`${name} X rail does not have enough visible glyphs (${visibleXs})`);
  await assertXDirection(page, name);
  await assertRailSpacing(page, name);

  const isMobile = name === 'mobile';
  const vh = viewport?.height ?? 900;
  const disruptionTop = await documentTop(page, '[data-disruption]');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(100);
  const beforeY = await page.evaluate(() => window.scrollY);

  if (isMobile) await scrollCue.tap();
  else await scrollCue.click();
  await page.waitForTimeout(isMobile ? 520 : 650);

  const intermediateY = await page.evaluate(() => window.scrollY);
  if (intermediateY < beforeY + 24) throw new Error(`${name} scroll control did not start moving the page`);
  if (intermediateY > disruptionTop + vh * (isMobile ? 0.72 : 0.68)) throw new Error(`${name} scroll control jumped too far instead of animating progressively`);

  await page.screenshot({ path: `${outDir}/${name}-scroll-journey.png`, fullPage: false });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(250);

  await page.evaluate(({ y }) => window.scrollTo({ top: y, behavior: 'instant' }), { y: disruptionTop + vh * (isMobile ? 0.35 : 0.85) });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/${name}-disruption-mid.png`, fullPage: false });
  let mobileMidOne;
  let mobileMidTwo;
  if (isMobile) {
    await assertMostlyVisible(page, '[data-disruption-one]', 'mobile first disruption statement hold', 0.88);
    await assertMostlyVisible(page, '[data-disruption-two]', 'mobile second disruption statement hold', 0.88);
    mobileMidOne = await textBox(page, '[data-disruption-one]');
    mobileMidTwo = await textBox(page, '[data-disruption-two]');
  }

  const firstStatement = (await page.locator('[data-disruption-one]').innerText()).toLowerCase();
  const secondStatement = (await page.locator('[data-disruption-two]').innerText()).toLowerCase();
  if (!firstStatement.includes('isn’t') || !secondStatement.includes('shouldn’t')) throw new Error(`${name} disruption contractions are not using the intended typographic apostrophes`);

  await page.evaluate(({ y }) => window.scrollTo({ top: y, behavior: 'instant' }), { y: disruptionTop + vh * (isMobile ? 1.03 : 1.4) });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/${name}-disruption-late.png`, fullPage: false });

  if (isMobile && mobileMidOne && mobileMidTwo) {
    const lateOne = await textBox(page, '[data-disruption-one]');
    const lateTwo = await textBox(page, '[data-disruption-two]');
    const moveOne = Math.hypot(lateOne.x - mobileMidOne.x, lateOne.y - mobileMidOne.y);
    const moveTwo = Math.hypot(lateTwo.x - mobileMidTwo.x, lateTwo.y - mobileMidTwo.y);
    if (moveOne < 10 || moveTwo < 10) throw new Error(`mobile disruption text is not breaking frame strongly enough (${moveOne.toFixed(1)}px / ${moveTwo.toFixed(1)}px)`);
  } else if (!isMobile) {
    await assertNoTextOverlap(page, '[data-disruption-caption]', '[data-disruption-two]', `${name} disruption caption/headline`);
    await assertMostlyVisible(page, '[data-disruption-one]', `${name} first disruption statement`, 0.88);
  }

  const catrinTop = await documentTop(page, '[data-catrin]');
  await page.evaluate(({ y }) => window.scrollTo({ top: y, behavior: 'instant' }), { y: Math.max(0, catrinTop - vh * 0.32) });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/${name}-catrin-entry.png`, fullPage: false });
  await page.evaluate(({ y }) => window.scrollTo({ top: y, behavior: 'instant' }), { y: Math.max(0, catrinTop - vh * 0.28) });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/${name}-catrin-mid.png`, fullPage: false });
  await assertMostlyVisible(page, '[data-catrin-title]', `${name} CATRIN readable phase`, isMobile ? 0.9 : 0.98);
  await page.evaluate(({ y }) => window.scrollTo({ top: y, behavior: 'instant' }), { y: catrinTop + vh * 0.08 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/${name}-catrin-break.png`, fullPage: false });

  if (consoleErrors.length) throw new Error(`${name} browser errors:\n${consoleErrors.join('\n')}`);
  await context.close();
}

await capture('desktop-laptop', { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
await capture('desktop', { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await capture('mobile', { ...devices['iPhone 15 Pro'], viewport: { width: 393, height: 852 } });

await browser.close();
console.log(`Visual QA captured from ${baseURL}`);
