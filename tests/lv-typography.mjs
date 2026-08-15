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

async function textBounds(locator) {
  return locator.evaluate((element) => {
    const viewportWidth = document.documentElement.clientWidth;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const rects = [];
    let node = walker.nextNode();
    while (node) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width > 1 && rect.height > 1) {
          rects.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
        }
      }
      node = walker.nextNode();
    }
    return {
      text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      viewportWidth,
      left: rects.length ? Math.min(...rects.map((rect) => rect.left)) : null,
      right: rects.length ? Math.max(...rects.map((rect) => rect.right)) : null,
      top: rects.length ? Math.min(...rects.map((rect) => rect.top)) : null,
      bottom: rects.length ? Math.max(...rects.map((rect) => rect.bottom)) : null,
    };
  });
}

async function assertTextWithinViewport(page, selector, label, tolerance = 2) {
  const locators = page.locator(selector);
  const count = await locators.count();
  assert(count > 0, `${label} is missing`);
  for (let index = 0; index < count; index += 1) {
    const locator = locators.nth(index);
    await locator.scrollIntoViewIfNeeded();
    const box = await textBounds(locator);
    assert(box.left !== null && box.right !== null, `${label} has no measurable text in “${box.text}”`);
    assert(box.left >= -tolerance, `${label} escapes left (${box.left.toFixed(1)}px) in “${box.text}”`);
    assert(box.right <= box.viewportWidth + tolerance, `${label} escapes right (${box.right.toFixed(1)}px > ${box.viewportWidth}px) in “${box.text}”`);
  }
}

async function assertNoDetachedShortLines(page, selector, label, maxWidthRatio = 0.42, maxStartRatio = 0.58) {
  const locators = page.locator(selector);
  const count = await locators.count();
  for (let index = 0; index < count; index += 1) {
    const box = await textBounds(locators.nth(index));
    if (box.left === null || box.right === null) continue;
    const widthRatio = (box.right - box.left) / box.viewportWidth;
    const startRatio = box.left / box.viewportWidth;
    if (widthRatio <= maxWidthRatio) {
      assert(startRatio <= maxStartRatio, `${label}: detached short line “${box.text}” starts at ${(startRatio * 100).toFixed(1)}% while occupying ${(widthRatio * 100).toFixed(1)}%`);
    }
  }
}

async function assertLineHeight(page, selector, floor, label) {
  const locators = page.locator(selector);
  const count = await locators.count();
  assert(count > 0, `${label} is missing`);
  for (let index = 0; index < count; index += 1) {
    const result = await locators.nth(index).evaluate((element) => {
      const style = getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize);
      const lineHeight = Number.parseFloat(style.lineHeight);
      return { text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '', ratio: lineHeight / fontSize };
    });
    assert(result.ratio + 0.005 >= floor, `${label} line-height is too tight (${result.ratio.toFixed(3)}) in “${result.text}”`);
  }
}

async function assertServiceSeparation(page, mobile, label) {
  const rows = page.locator('.service-row');
  const count = await rows.count();
  assert(count > 0, `${label} service rows are missing`);
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const title = await textBounds(row.locator('h3'));
    const copy = await textBounds(row.locator('p'));
    assert(title.left !== null && title.right !== null && title.top !== null && title.bottom !== null, `${label} service title cannot be measured`);
    assert(copy.left !== null && copy.right !== null && copy.top !== null && copy.bottom !== null, `${label} service copy cannot be measured`);
    if (mobile) {
      assert(copy.top >= title.bottom + 4, `${label} service copy collides vertically with “${title.text}”`);
    } else {
      assert(copy.left >= title.right + 12, `${label} service copy collides horizontally with “${title.text}”`);
    }
  }
}

async function screenshotSection(page, selector, filename) {
  const locator = page.locator(selector).first();
  assert(await locator.count(), `${selector} is missing for screenshot`);
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(60);
  await locator.screenshot({ path: `${outDir}/${filename}` });
}

const profiles = [
  { name: 'lv-typography-desktop', viewport: { width: 1366, height: 768 } },
  { name: 'lv-typography-tablet', viewport: { width: 768, height: 1024 } },
  { name: 'lv-typography-mobile', viewport: { width: 393, height: 852 } },
];

for (const profile of profiles) {
  const mobile = profile.viewport.width <= 760;
  const context = await browser.newContext({ viewport: profile.viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await openReadyPage(page, '/lv/');
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 9000 });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 3000 }).catch(() => {});

  const heroText = (await page.locator('[data-intro-line]').allTextContents()).map((line) => line.trim()).join(' ');
  assert(heroText === 'Es redzu lietas citādi.', `${profile.name} lost Latvian hero spelling: ${heroText}`);
  assert(await page.evaluate(() => document.fonts.check('790 72px Onest', 'Ā Ē Ī Ņ Ķ Ļ Š Ž ā ē ī ņ ķ ļ š ž')), `${profile.name} lacks loaded Latvian glyph coverage`);

  const citadi = await textBounds(page.locator('.hero__line-inner').nth(2));
  assert(citadi.left !== null, `${profile.name} cannot measure CITĀDI`);
  const citadiStart = citadi.left / citadi.viewportWidth;
  if (mobile) {
    assert(citadiStart <= 0.16, `${profile.name} CITĀDI detached on mobile: ${(citadiStart * 100).toFixed(1)}%`);
  } else {
    assert(citadiStart >= 0.34 && citadiStart <= 0.58, `${profile.name} CITĀDI optical start is wrong: ${(citadiStart * 100).toFixed(1)}%`);
  }

  if (profile.viewport.width === 768) {
    assert(await page.locator('[data-menu-toggle]').isVisible(), `${profile.name} should use compact navigation`);
    assert(!(await page.locator('.site-nav--desktop').isVisible()), `${profile.name} still shows desktop navigation`);
    assert(!(await page.locator('.site-status').isVisible()), `${profile.name} still shows long availability status`);
  }

  await assertLineHeight(page, '.work-heading .display-title', 1.02, `${profile.name} selected-work title`);
  await assertLineHeight(page, '.disruption__line', 1.03, `${profile.name} disruption title`);
  await assertLineHeight(page, '.about .display-title, .about__statement', 1.05, `${profile.name} about typography`);
  await assertLineHeight(page, '.approach__steps strong', 1.05, `${profile.name} process typography`);
  await assertLineHeight(page, '.anti-sales__title', 1.05, `${profile.name} anti-sales typography`);
  await assertLineHeight(page, '.contact__title', 1.05, `${profile.name} contact typography`);

  for (const [selector, label] of [
    ['.hero__line-inner', 'hero'],
    ['.work-heading .display-title', 'selected-work title'],
    ['.disruption__line', 'disruption title'],
    ['.about .display-title span, .about__statement span', 'about typography'],
    ['.approach__steps strong', 'process title'],
    ['.service-row h3, .service-row p', 'services'],
    ['.xo-section h2 span', 'X/O title'],
    ['.anti-sales__title span', 'anti-sales title'],
    ['.contact__title span', 'contact title'],
  ]) {
    await assertTextWithinViewport(page, selector, `${profile.name} ${label}`);
  }

  await assertNoDetachedShortLines(page, '.hero__line-inner', `${profile.name} hero composition`);
  await assertNoDetachedShortLines(page, '.about__statement span', `${profile.name} about composition`);
  await assertNoDetachedShortLines(page, '.anti-sales__title span', `${profile.name} anti-sales composition`);
  await assertNoDetachedShortLines(page, '.contact__title span', `${profile.name} contact composition`);
  await assertServiceSeparation(page, mobile, profile.name);

  for (const [selector, suffix] of [
    ['.hero', 'hero'], ['#work', 'work'], ['#about', 'about'], ['#approach', 'approach'],
    ['#services', 'services'], ['[data-anti-sales]', 'anti-sales'], ['#contact', 'contact'],
  ]) {
    await screenshotSection(page, selector, `${profile.name}-${suffix}.png`);
  }

  for (const project of ['catrin', 'anelika']) {
    await openReadyPage(page, `/lv/darbi/${project}/`);
    await assertLineHeight(page, '.case-narrative__row h2', 1.04, `${profile.name} ${project} narrative headings`);
    await assertLineHeight(page, '.case-result p', 1.04, `${profile.name} ${project} result`);
    await assertLineHeight(page, '.case-contact h2', 1.05, `${profile.name} ${project} contact heading`);
    await assertTextWithinViewport(page, '.case-hero__subtitle, .case-narrative__row h2, .case-result p, .case-contact h2 span', `${profile.name} ${project} case typography`);
    await assertNoDetachedShortLines(page, '.case-contact h2 span', `${profile.name} ${project} contact composition`);
    await screenshotSection(page, '.case-hero', `${profile.name}-${project}-hero.png`);
    await screenshotSection(page, '.case-narrative', `${profile.name}-${project}-narrative.png`);
    await screenshotSection(page, '.case-contact', `${profile.name}-${project}-contact.png`);
  }

  await context.close();
}

await browser.close();
console.log('Latvian typography QA passed: desktop/tablet/mobile LV composition, service separation, viewport bounds, diacritics and both case studies are safe.');
