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
        if (rect.width > 1 && rect.height > 1) rects.push({ left: rect.left, right: rect.right });
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
      '.hero__title, .disruption__line, .home-v2-work__title, .home-v2-perspective h2, .home-v2-close h2',
      `${locale} ${viewport.width}px Home display type`,
    );

    if (locale === 'en') {
      await assertLineHeightFloor(page, '.hero__title', 0.82, `en ${viewport.width}px hero`);
      await assertLineHeightFloor(page, '.disruption__line', 0.92, `en ${viewport.width}px disruption`);
      await assertLineHeightFloor(page, '.home-v2-work__title', 0.78, `en ${viewport.width}px takeover`);
      await assertLineHeightFloor(page, '.home-v2-perspective h2', 0.77, `en ${viewport.width}px perspective`);
      await assertLineHeightFloor(page, '.home-v2-close h2', 0.76, `en ${viewport.width}px close`);
    }

    const contactPath = locale === 'lv' ? '/lv/kontakti/' : '/contact/';
    await openReadyPage(page, contactPath);
    await assertNoHorizontalClipping(page, '.contact-hero h1, .contact-intent__title, .contact-direct h2', `${locale} ${viewport.width}px Contact display type`);
    if (locale === 'en') {
      await assertLineHeightFloor(page, '.contact-hero h1', 0.74, `en ${viewport.width}px Contact hero`);
      await assertLineHeightFloor(page, '.contact-intent__title', 0.82, `en ${viewport.width}px Contact intent`);
      await assertLineHeightFloor(page, '.contact-direct h2', 0.78, `en ${viewport.width}px Contact direct`);
    }

    for (const project of ['catrin', 'anelika']) {
      const path = locale === 'lv' ? `/lv/darbi/${project}/` : `/work/${project}/`;
      await openReadyPage(page, path);
      await assertNoHorizontalClipping(page, '.case-hero h1, .case-narrative__row h2, .case-result p, .page-contact-cta h2', `${locale} ${viewport.width}px ${project} display type`);
      if (locale === 'en') {
        await assertLineHeightFloor(page, '.case-hero h1', 0.78, `en ${viewport.width}px ${project} hero`);
        await assertLineHeightFloor(page, '.case-narrative__row h2', 1.0, `en ${viewport.width}px ${project} narrative`);
        await assertLineHeightFloor(page, '.case-result p', 1.01, `en ${viewport.width}px ${project} result`);
        await assertLineHeightFloor(page, '.page-contact-cta h2', 0.78, `en ${viewport.width}px ${project} Contact transition`);
      }
    }

    await context.close();
  }
}

await browser.close();
console.log('Desktop display typography QA passed across the new Home trailer, dedicated Contact and EN/LV case-study exits.');
