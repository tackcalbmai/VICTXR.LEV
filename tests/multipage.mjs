import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const routes = [
  { key: 'work-en', path: '/work/', lang: 'en', alternate: '/lv/darbi/', nav: ['/work/', '/about/', '/services/'], section: '.work-exhibition' },
  { key: 'about-en', path: '/about/', lang: 'en', alternate: '/lv/par-mani/', nav: ['/work/', '/about/', '/services/'], section: '.about-principles' },
  { key: 'services-en', path: '/services/', lang: 'en', alternate: '/lv/pakalpojumi/', nav: ['/work/', '/about/', '/services/'], section: '.services-decision' },
  { key: 'work-lv', path: '/lv/darbi/', lang: 'lv', alternate: '/work/', nav: ['/lv/darbi/', '/lv/par-mani/', '/lv/pakalpojumi/'], section: '.work-exhibition' },
  { key: 'about-lv', path: '/lv/par-mani/', lang: 'lv', alternate: '/about/', nav: ['/lv/darbi/', '/lv/par-mani/', '/lv/pakalpojumi/'], section: '.about-principles' },
  { key: 'services-lv', path: '/lv/pakalpojumi/', lang: 'lv', alternate: '/services/', nav: ['/lv/darbi/', '/lv/par-mani/', '/lv/pakalpojumi/'], section: '.services-decision' },
];

const profiles = [
  { name: 'desktop', viewport: { width: 1366, height: 768 } },
  { name: 'tablet', viewport: { width: 768, height: 1024 } },
  { name: 'mobile', viewport: { width: 393, height: 852 } },
];

function collectErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  return errors;
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  const overflow = Math.max(dimensions.document, dimensions.body) - dimensions.viewport;
  assert(overflow <= 2, `${label} has ${overflow}px horizontal overflow`);
}

async function textBounds(locator) {
  return locator.evaluate((element) => {
    const viewport = document.documentElement.clientWidth;
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
      viewport,
      left: rects.length ? Math.min(...rects.map((rect) => rect.left)) : null,
      right: rects.length ? Math.max(...rects.map((rect) => rect.right)) : null,
      text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    };
  });
}

async function assertTextInside(page, selector, label, tolerance = 2) {
  const locators = page.locator(selector);
  const count = await locators.count();
  assert(count > 0, `${label} is missing`);
  for (let i = 0; i < count; i += 1) {
    const locator = locators.nth(i);
    await locator.scrollIntoViewIfNeeded();
    const bounds = await textBounds(locator);
    assert(bounds.left !== null && bounds.right !== null, `${label} has no measurable text`);
    assert(bounds.left >= -tolerance, `${label} escapes left: “${bounds.text}” (${bounds.left}px)`);
    assert(bounds.right <= bounds.viewport + tolerance, `${label} escapes right: “${bounds.text}” (${bounds.right}px > ${bounds.viewport}px)`);
  }
}

async function assertServiceGeometry(page, label) {
  const rows = page.locator('.service-decision');
  const count = await rows.count();
  assert(count === 6, `${label} should expose six service decisions, got ${count}`);
  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    const heading = row.locator('h2');
    const body = row.locator('.service-decision__body');
    const [headingBox, bodyBox] = await Promise.all([heading.boundingBox(), body.boundingBox()]);
    assert(headingBox && bodyBox, `${label} service ${i + 1} cannot be measured`);
    const verticallySeparate = bodyBox.y >= headingBox.y + headingBox.height - 2;
    const horizontallySeparate = bodyBox.x >= headingBox.x + headingBox.width - 2 || headingBox.x >= bodyBox.x + bodyBox.width - 2;
    assert(verticallySeparate || horizontallySeparate, `${label} service ${i + 1} title overlaps its descriptive body`);
  }
}

async function captureElement(page, selector, fileName) {
  const locator = page.locator(selector).first();
  assert(await locator.count(), `${selector} is missing for screenshot`);
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(50);
  await locator.screenshot({ path: `${outDir}/${fileName}` });
}

async function captureViewport(page, selector, fileName) {
  const locator = page.locator(selector).first();
  assert(await locator.count(), `${selector} is missing for screenshot`);
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(50);
  await page.screenshot({ path: `${outDir}/${fileName}`, fullPage: false });
}

for (const profile of profiles) {
  const context = await browser.newContext({ viewport: profile.viewport, reducedMotion: 'reduce' });
  for (const route of routes) {
    const page = await context.newPage();
    const runtimeErrors = collectErrors(page);
    const response = await page.goto(new URL(route.path, baseURL).toString(), { waitUntil: 'load' });
    assert(response?.ok(), `${profile.name} ${route.path} returned ${response?.status()}`);
    await page.evaluate(() => document.fonts.ready);

    const label = `${profile.name} ${route.key}`;
    assert(await page.locator('html').getAttribute('lang') === route.lang, `${label} has wrong document language`);
    assert(await page.locator('main').count() === 1, `${label} must have exactly one main`);
    assert(await page.locator('h1').count() === 1, `${label} must have exactly one h1`);
    assert((await page.locator('link[rel="canonical"]').getAttribute('href'))?.endsWith(route.path), `${label} canonical does not preserve route`);
    assert(await page.locator(`link[rel="alternate"][href$="${route.alternate}"]`).count() >= 1, `${label} is missing page-preserving hreflang alternate`);
    assert(await page.locator(`.site-language[href="${route.alternate}"]`).count() === 1, `${label} language switch loses page context`);

    const desktopLinks = await page.locator('.site-nav--desktop a').evaluateAll((links) => links.slice(0, 3).map((link) => link.getAttribute('href')));
    assert(JSON.stringify(desktopLinks) === JSON.stringify(route.nav), `${label} primary navigation is not route-based: ${desktopLinks.join(', ')}`);

    const expectsCompactNavigation = profile.viewport.width <= 760 || (route.lang === 'lv' && profile.viewport.width <= 1024);
    const toggle = page.locator('[data-menu-toggle]');
    if (expectsCompactNavigation) {
      assert(await toggle.isVisible(), `${label} should expose compact navigation`);
      await toggle.click();
      assert(await toggle.getAttribute('aria-expanded') === 'true', `${label} compact navigation did not open`);
      await toggle.click();
    } else {
      assert(!(await toggle.isVisible()), `${label} unexpectedly exposes compact navigation`);
      assert(await page.locator('.site-nav--desktop').isVisible(), `${label} should expose desktop navigation`);
    }

    await assertNoHorizontalOverflow(page, label);
    await assertTextInside(page, '.mp-hero h1 span', `${label} hero`);
    await assertTextInside(page, '.page-contact h2 span', `${label} contact title`);

    if (route.key.startsWith('about-')) {
      await assertTextInside(page, '.about-definition h2 span, .about-principle h2, .about-standard h2 span', `${label} about display type`);
    }
    if (route.key.startsWith('services-')) {
      await assertTextInside(page, '.service-decision h2, .services-anti h2 span, .services-process h2', `${label} services display type`);
      await assertServiceGeometry(page, label);
    }
    if (route.key.startsWith('work-')) {
      assert(await page.locator('.work-exhibit').count() === 2, `${label} should expose two finished projects`);
      const brokenImages = await page.locator('.work-exhibit img').evaluateAll((images) => images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc));
      assert(!brokenImages.length, `${label} has broken work images: ${brokenImages.join(', ')}`);
    }

    await captureElement(page, '.mp-hero', `multipage-${route.key}-${profile.name}-hero.png`);
    await captureViewport(page, route.section, `multipage-${route.key}-${profile.name}-content.png`);
    await captureElement(page, '.page-contact', `multipage-${route.key}-${profile.name}-contact.png`);

    assert(!runtimeErrors.length, `${label} runtime errors:\n${runtimeErrors.join('\n')}`);
    await page.close();
  }
  await context.close();
}

await browser.close();
console.log('Multi-page QA passed: EN/LV Work, About and Services routes are structurally sound, route-aware, overflow-safe and visually bounded across desktop, tablet and mobile.');
