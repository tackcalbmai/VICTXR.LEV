import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openReadyPage(page, path) {
  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
  assert(response?.ok(), `${path} returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
}

async function lineGeometry(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize);
    const lineHeight = Number.parseFloat(style.lineHeight);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const fragments = [];
    let textNode = walker.nextNode();
    while (textNode) {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      for (const rect of range.getClientRects()) {
        if (rect.width > 1 && rect.height > 1) {
          fragments.push({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
        }
      }
      textNode = walker.nextNode();
    }

    const rows = [];
    for (const fragment of fragments.sort((a, b) => a.top - b.top || a.left - b.left)) {
      const row = rows.find((candidate) => Math.abs(candidate.top - fragment.top) <= 2);
      if (row) {
        row.top = Math.min(row.top, fragment.top);
        row.bottom = Math.max(row.bottom, fragment.bottom);
        row.left = Math.min(row.left, fragment.left);
        row.right = Math.max(row.right, fragment.right);
      } else {
        rows.push({ ...fragment });
      }
    }

    let maxOverlap = 0;
    for (let index = 0; index < rows.length - 1; index += 1) {
      maxOverlap = Math.max(maxOverlap, rows[index].bottom - rows[index + 1].top);
    }

    return {
      text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      fontSize,
      lineHeight,
      ratio: lineHeight / fontSize,
      rows,
      maxOverlap,
      overflow: style.overflow,
      overflowY: style.overflowY,
    };
  });
}

async function assertNoCollisions(page, selector, label) {
  const locators = page.locator(selector);
  const count = await locators.count();
  assert(count > 0, `${label} is missing`);
  for (let index = 0; index < count; index += 1) {
    const geometry = await lineGeometry(locators.nth(index));
    if (geometry.rows.length > 1 && geometry.maxOverlap > 1.5) {
      throw new Error(`${label} line collision: ${geometry.maxOverlap.toFixed(1)}px in “${geometry.text}”`);
    }
  }
}

async function assertLineHeightFloor(page, selector, floor, label) {
  const locators = page.locator(selector);
  const count = await locators.count();
  assert(count > 0, `${label} is missing`);
  for (let index = 0; index < count; index += 1) {
    const geometry = await lineGeometry(locators.nth(index));
    assert(geometry.ratio >= floor, `${label} line-height is too tight (${geometry.ratio.toFixed(2)}) in “${geometry.text}”`);
  }
}

for (const profile of [
  { name: 'lv-typography-desktop', viewport: { width: 1366, height: 768 } },
  { name: 'lv-typography-mobile', viewport: { width: 393, height: 852 } },
]) {
  const context = await browser.newContext({ viewport: profile.viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await openReadyPage(page, '/lv/');
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 9000 });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 3000 }).catch(() => {});

  const sourceHeroLines = (await page.locator('[data-intro-line]').allTextContents()).map((line) => line.trim());
  const sourceHero = sourceHeroLines.join(' ');
  assert(sourceHero === 'Es redzu lietas citādi.', `${profile.name} lost the Latvian hero spelling: ${sourceHero}`);

  const fontCoverage = await page.evaluate(() => document.fonts.check('790 72px Onest', 'Ā Ē Ī Ņ Ķ Ļ Š Ž ā ē ī ņ ķ ļ š ž'));
  assert(fontCoverage, `${profile.name} does not have loaded Onest coverage for Latvian diacritics`);

  const heroLines = page.locator('.hero__line');
  assert(await heroLines.count() === 3, `${profile.name} hero line structure changed`);
  const lastLine = await lineGeometry(heroLines.nth(2));
  assert(lastLine.overflowY === 'visible' || lastLine.overflow === 'visible', `${profile.name} can still clip CITĀDI diacritics after intro`);

  // Natural wrapping must not produce overlapping rendered line boxes.
  await assertNoCollisions(page, '.work-heading .display-title', `${profile.name} selected-work title`);
  await assertNoCollisions(page, '.disruption__line', `${profile.name} disruption title`);

  // These art-directed headings use explicit block lines. Range rectangles include
  // line-box metrics rather than literal ink, so guard their spacing directly.
  await assertLineHeightFloor(page, '.about .display-title, .about__statement', 1.05, `${profile.name} about typography`);
  await assertLineHeightFloor(page, '.approach__steps strong', 1.05, `${profile.name} process typography`);
  await assertLineHeightFloor(page, '.anti-sales__title', 1.05, `${profile.name} anti-sales typography`);
  await assertLineHeightFloor(page, '.contact__title', 1.05, `${profile.name} contact typography`);

  await page.locator('#work').scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  await page.screenshot({ path: `${outDir}/${profile.name}-work.png`, fullPage: false });

  for (const project of ['catrin', 'anelika']) {
    await openReadyPage(page, `/lv/darbi/${project}/`);
    await assertNoCollisions(page, '.case-narrative__row h2', `${profile.name} ${project} narrative headings`);
    await assertNoCollisions(page, '.case-result p', `${profile.name} ${project} result`);
    await assertLineHeightFloor(page, '.case-contact h2', 1.05, `${profile.name} ${project} contact heading`);
  }

  await context.close();
}

await browser.close();
console.log('Latvian typography QA passed: diacritics remain visible and oversized lines keep safe spacing on desktop and mobile.');
