import { chromium } from 'playwright';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true });
const viewports = [
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];
const viewportTolerance = 3;
const ratioEpsilon = 0.005;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openReadyPage(page, path) {
  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
  assert(response?.ok(), `${path} returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
  if (path === '/' || path === '/lv/') {
    await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 9000 });
  }
}

async function textGeometry(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize);
    const lineHeight = Number.parseFloat(style.lineHeight);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const rects = [];
    let textNode = walker.nextNode();
    while (textNode) {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      for (const rect of range.getClientRects()) {
        if (rect.width > 1 && rect.height > 1) rects.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
      }
      textNode = walker.nextNode();
    }
    return {
      text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      ratio: lineHeight / fontSize,
      rects,
      overflow: style.overflow,
      overflowY: style.overflowY,
      viewportWidth: window.innerWidth,
    };
  });
}

async function assertNoHorizontalClipping(page, selector, label) {
  const locators = page.locator(selector);
  const count = await locators.count();
  assert(count > 0, `${label} is missing`);
  for (let index = 0; index < count; index += 1) {
    const geometry = await textGeometry(locators.nth(index));
    for (const rect of geometry.rects) {
      assert(rect.left >= -viewportTolerance, `${label} clips on the left (${rect.left.toFixed(1)}px): “${geometry.text}”`);
      assert(rect.right <= geometry.viewportWidth + viewportTolerance, `${label} clips on the right (${rect.right.toFixed(1)}px > ${geometry.viewportWidth}px): “${geometry.text}”`);
    }
  }
}

async function assertLineHeightFloor(page, selector, floor, label) {
  const locators = page.locator(selector);
  const count = await locators.count();
  assert(count > 0, `${label} is missing`);
  for (let index = 0; index < count; index += 1) {
    const geometry = await textGeometry(locators.nth(index));
    assert(geometry.ratio + ratioEpsilon >= floor, `${label} line-height is too tight (${geometry.ratio.toFixed(3)}): “${geometry.text}”`);
  }
}

for (const viewport of viewports) {
  for (const locale of ['en', 'lv']) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const homePath = locale === 'lv' ? '/lv/' : '/';
    await openReadyPage(page, homePath);

    const heroMask = await textGeometry(page.locator('.hero__line').first());
    assert(heroMask.overflowY === 'visible' || heroMask.overflow === 'visible', `${locale} ${viewport.width}px hero mask can still crop settled glyphs`);

    await assertNoHorizontalClipping(
      page,
      '.hero__title, .disruption__line, .display-title, .project-feature__title, .about__statement, .approach__steps strong, .xo-section h2, .anti-sales__title, .contact__title',
      `${locale} ${viewport.width}px home display type`,
    );

    if (locale === 'en') {
      await assertLineHeightFloor(page, '.hero__title', 0.82, `en ${viewport.width}px hero`);
      await assertLineHeightFloor(page, '.display-title', 0.90, `en ${viewport.width}px display title`);
      await assertLineHeightFloor(page, '.disruption__line', 0.92, `en ${viewport.width}px disruption`);
      await assertLineHeightFloor(page, '.about__statement', 0.92, `en ${viewport.width}px about statement`);
      await assertLineHeightFloor(page, '.approach__steps strong', 0.94, `en ${viewport.width}px approach`);
      await assertLineHeightFloor(page, '.anti-sales__title', 0.86, `en ${viewport.width}px anti-sales`);
      await assertLineHeightFloor(page, '.contact__title', 0.84, `en ${viewport.width}px contact`);
    }

    for (const project of ['catrin', 'anelika']) {
      const path = locale === 'lv' ? `/lv/darbi/${project}/` : `/work/${project}/`;
      await openReadyPage(page, path);
      await assertNoHorizontalClipping(page, '.case-hero h1, .case-narrative__row h2, .case-result p, .case-contact > h2', `${locale} ${viewport.width}px ${project} display type`);
      if (locale === 'en') {
        await assertLineHeightFloor(page, '.case-hero h1', 0.78, `en ${viewport.width}px ${project} hero`);
        await assertLineHeightFloor(page, '.case-narrative__row h2', 1.0, `en ${viewport.width}px ${project} narrative`);
        await assertLineHeightFloor(page, '.case-result p', 1.01, `en ${viewport.width}px ${project} result`);
        await assertLineHeightFloor(page, '.case-contact > h2', 0.84, `en ${viewport.width}px ${project} contact`);
      }
    }

    await context.close();
  }
}

await browser.close();
console.log('Desktop display typography QA passed: EN/LV oversized text stays inside the viewport and settled masks cannot crop glyphs.');
