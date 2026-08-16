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
  if (path === '/lv/') {
    await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 9000 });
    await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 3000 }).catch(() => {});
  }
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
        if (rect.width > 1 && rect.height > 1) rects.push({ left: rect.left, right: rect.right });
      }
      node = walker.nextNode();
    }
    return {
      text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      viewportWidth,
      left: rects.length ? Math.min(...rects.map((rect) => rect.left)) : null,
      right: rects.length ? Math.max(...rects.map((rect) => rect.right)) : null,
    };
  });
}

async function assertTextWithinViewport(page, selector, label, tolerance = 3) {
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

async function screenshotSection(page, selector, filename) {
  const locator = page.locator(selector).first();
  assert(await locator.count(), `${selector} is missing for screenshot`);
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(70);
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
  const heroText = (await page.locator('[data-intro-line]').allTextContents()).map((line) => line.trim()).join(' ');
  assert(heroText === 'Es redzu lietas citādi.', `${profile.name} lost Latvian hero spelling: ${heroText}`);
  assert(await page.evaluate(() => document.fonts.check('790 72px Onest', 'Ā Ē Ī Ņ Ķ Ļ Š Ž ā ē ī ņ ķ ļ š ž')), `${profile.name} lacks loaded Latvian glyph coverage`);

  const citadi = await textBounds(page.locator('.hero__line-inner').nth(2));
  assert(citadi.left !== null, `${profile.name} cannot measure CITĀDI`);
  const citadiStart = citadi.left / citadi.viewportWidth;
  if (mobile) assert(citadiStart <= 0.16, `${profile.name} CITĀDI detached on mobile: ${(citadiStart * 100).toFixed(1)}%`);
  else assert(citadiStart >= 0.34 && citadiStart <= 0.58, `${profile.name} CITĀDI optical start is wrong: ${(citadiStart * 100).toFixed(1)}%`);

  if (profile.viewport.width === 768) {
    assert(await page.locator('[data-menu-toggle]').isVisible(), `${profile.name} should use compact navigation`);
    assert(!(await page.locator('.site-nav--desktop').isVisible()), `${profile.name} still shows desktop navigation`);
  }

  await assertLineHeight(page, '.disruption__line', 1.03, `${profile.name} disruption title`);
  await assertLineHeight(page, '.home-v2-work__title', 0.78, `${profile.name} takeover title`);
  await assertLineHeight(page, '.home-v2-perspective h2', 0.77, `${profile.name} perspective title`);
  await assertLineHeight(page, '.home-v2-close h2', 0.76, `${profile.name} close title`);
  for (const [selector, label] of [
    ['.hero__line-inner', 'hero'],
    ['.disruption__line', 'disruption'],
    ['.home-v2-work__title span', 'takeover title'],
    ['.home-v2-perspective h2 span', 'perspective title'],
    ['.home-v2-close h2 span', 'closing title'],
  ]) await assertTextWithinViewport(page, selector, `${profile.name} ${label}`);

  for (const [selector, suffix] of [
    ['.hero', 'hero'],
    ['.home-v2-work', 'work'],
    ['.home-v2-perspective', 'perspective'],
    ['.home-v2-close', 'close'],
  ]) await screenshotSection(page, selector, `${profile.name}-${suffix}.png`);

  await openReadyPage(page, '/lv/pakalpojumi/');
  await assertLineHeight(page, '.service-decision h2', 0.82, `${profile.name} service headings`);
  await assertLineHeight(page, '.services-anti h2', 0.77, `${profile.name} anti-sales services statement`);
  await assertLineHeight(page, '.services-process h2', 0.82, `${profile.name} services process`);
  await assertTextWithinViewport(page, '.service-decision h2, .services-anti h2 span, .services-process h2', `${profile.name} Services typography`);
  assert(await page.locator('.service-decision').count() === 6, `${profile.name} Latvian Services lost a decision row`);
  await screenshotSection(page, '.services-decision', `${profile.name}-services.png`);

  await openReadyPage(page, '/lv/kontakti/');
  await assertLineHeight(page, '.contact-hero h1', 0.74, `${profile.name} Contact hero`);
  await assertLineHeight(page, '.contact-intent__title', 0.82, `${profile.name} Contact intents`);
  await assertLineHeight(page, '.contact-direct h2', 0.78, `${profile.name} Contact direct heading`);
  await assertTextWithinViewport(page, '.contact-hero h1 span, .contact-intent__title, .contact-direct h2', `${profile.name} Contact typography`);
  await screenshotSection(page, '.contact-hero', `${profile.name}-contact-hero.png`);
  await screenshotSection(page, '.contact-intents', `${profile.name}-contact-intents.png`);

  for (const project of ['catrin', 'anelika']) {
    await openReadyPage(page, `/lv/darbi/${project}/`);
    await assertLineHeight(page, '.case-narrative__row h2', 1.04, `${profile.name} ${project} narrative headings`);
    await assertLineHeight(page, '.case-result p', 1.04, `${profile.name} ${project} result`);
    await assertLineHeight(page, '.page-contact-cta h2', 0.78, `${profile.name} ${project} Contact transition`);
    await assertTextWithinViewport(page, '.case-hero__subtitle, .case-narrative__row h2, .case-result p, .page-contact-cta h2 span', `${profile.name} ${project} case typography`);
    await screenshotSection(page, '.case-hero', `${profile.name}-${project}-hero.png`);
    await screenshotSection(page, '.case-narrative', `${profile.name}-${project}-narrative.png`);
    await screenshotSection(page, '.page-contact-cta', `${profile.name}-${project}-contact.png`);
  }

  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  assert(overflow <= 2, `${profile.name} final Latvian route has ${overflow}px horizontal overflow`);
  await context.close();
}

await browser.close();
console.log('Latvian typography QA passed across the Home trailer, Services, Contact and both case studies on desktop, tablet and mobile.');
