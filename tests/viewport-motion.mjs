import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

const motionViewports = [
  ['1366x640', { width: 1366, height: 640 }],
  ['1366x768', { width: 1366, height: 768 }],
  ['1536x864', { width: 1536, height: 864 }],
  ['1865x915', { width: 1865, height: 915 }],
  ['1881x892', { width: 1881, height: 892 }],
  ['1920x1080', { width: 1920, height: 1080 }],
];

function collectErrors(page) {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openReady(page, path) {
  await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready' || !document.querySelector('[data-home-intro]'), undefined, { timeout: 5000 });
  await page.waitForTimeout(220);
}

async function assertNoHorizontalOverflow(page, name) {
  const data = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  const overflow = Math.max(data.document, data.body) - data.viewport;
  if (overflow > 2) throw new Error(`${name}: ${overflow}px horizontal overflow`);
}

async function assertTextInsideViewport(page, selector, name, tolerance = 8) {
  const failures = await page.locator(selector).evaluate((element, tol) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return [...range.getClientRects()]
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .filter((rect) => rect.left < -tol || rect.right > innerWidth + tol)
      .map((rect) => ({ left: rect.left, right: rect.right, viewport: innerWidth, text: element.textContent?.trim() }));
  }, tolerance);
  if (failures.length) throw new Error(`${name}: ${selector} clips visible text: ${JSON.stringify(failures)}`);
}

for (const [viewportName, viewport] of motionViewports) {
  for (const [path, locale] of [['/', 'en'], ['/lv/', 'lv']]) {
    const name = `${locale}-${viewportName}`;
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    await context.addInitScript(() => sessionStorage.setItem('xoweb:intro-seen', '1'));
    const page = await context.newPage();
    const errors = collectErrors(page);
    await openReady(page, path);

    await assertNoHorizontalOverflow(page, `${name} hero`);
    const hero = await page.evaluate(() => {
      const footer = document.querySelector('.hero__footer')?.getBoundingClientRect();
      const title = document.querySelector('.hero__title')?.getBoundingClientRect();
      return footer && title ? { footerBottom: footer.bottom, titleBottom: title.bottom, footerTop: footer.top, viewport: innerHeight } : null;
    });
    if (!hero) throw new Error(`${name}: missing hero geometry`);
    if (hero.titleBottom > hero.footerTop + 2) throw new Error(`${name}: hero title overlaps footer`);
    if (hero.footerBottom > hero.viewport + 2) throw new Error(`${name}: hero footer falls below the usable viewport`);

    const disruptionTop = await page.locator('[data-disruption]').evaluate((element) => element.getBoundingClientRect().top + scrollY);
    // Start before the scene, then move through it with wheel input. This mirrors
    // real browsing and catches late-start bugs that coordinate-jump screenshots miss.
    await page.evaluate((y) => scrollTo({ top: Math.max(0, y), behavior: 'instant' }), disruptionTop - viewport.height * 0.58);
    await page.waitForTimeout(120);
    await page.mouse.wheel(0, viewport.height * 0.34);
    await page.waitForTimeout(260);

    const sceneState = await page.evaluate(() => {
      const section = document.querySelector('[data-disruption]');
      const two = document.querySelector('[data-disruption-two]');
      if (!section || !two) return null;
      const rect = section.getBoundingClientRect();
      const opacity = Number.parseFloat(getComputedStyle(two).opacity);
      const parentClass = section.parentElement?.className ?? '';
      return { top: rect.top, bottom: rect.bottom, opacity, viewport: innerHeight, parentClass, owner: section.getAttribute('data-motion-owner') };
    });
    if (!sceneState) throw new Error(`${name}: missing disruption state`);
    if (sceneState.top >= sceneState.viewport || sceneState.bottom <= 0) throw new Error(`${name}: wheel test did not land inside disruption scene`);
    if (sceneState.opacity < 0.35) throw new Error(`${name}: disruption animation starts too late while the scene is already visible (opacity ${sceneState.opacity})`);
    if (sceneState.parentClass.includes('pin-spacer')) throw new Error(`${name}: desktop disruption is still pinned`);
    if (sceneState.owner !== 'viewport') throw new Error(`${name}: viewport controller did not claim desktop disruption`);

    await assertTextInsideViewport(page, '[data-disruption-one]', `${name} disruption one`, 12);
    await assertTextInsideViewport(page, '[data-disruption-two]', `${name} disruption two`, 12);
    await assertNoHorizontalOverflow(page, `${name} disruption`);
    await page.screenshot({ path: `${outDir}/viewport-${name}-disruption.png`, fullPage: false });

    // Move farther while the scene is still on screen. The second statement must
    // already be established, not suddenly appear after the section has passed.
    await page.mouse.wheel(0, viewport.height * 0.28);
    await page.waitForTimeout(240);
    const later = await page.evaluate(() => {
      const section = document.querySelector('[data-disruption]')?.getBoundingClientRect();
      const opacity = Number.parseFloat(getComputedStyle(document.querySelector('[data-disruption-two]')).opacity);
      return section ? { top: section.top, bottom: section.bottom, opacity, viewport: innerHeight } : null;
    });
    if (!later) throw new Error(`${name}: missing later disruption state`);
    if (later.bottom > 0 && later.opacity < 0.7) throw new Error(`${name}: disruption is not established before leaving the viewport`);

    if (errors.length) throw new Error(`${name}: runtime errors: ${errors.join(' | ')}`);
    await context.close();
  }
}

const routeMatrix = [
  '/', '/lv/',
  '/work/', '/lv/darbi/',
  '/about/', '/lv/par-mani/',
  '/services/', '/lv/pakalpojumi/',
  '/contact/', '/lv/kontakti/',
  '/work/catrin/', '/lv/darbi/catrin/',
  '/work/anelika/', '/lv/darbi/anelika/',
];

for (const viewport of [{ width: 1366, height: 640 }, { width: 1881, height: 892 }, { width: 1865, height: 915 }]) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const path of routeMatrix) {
    const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
    if (!response?.ok()) throw new Error(`${path} returned ${response?.status()} at ${viewport.width}x${viewport.height}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(80);
    await assertNoHorizontalOverflow(page, `${path} ${viewport.width}x${viewport.height}`);
    const h1 = page.locator('h1');
    if (await h1.count()) await assertTextInsideViewport(page, 'h1', `${path} ${viewport.width}x${viewport.height}`, 10);
  }
  await context.close();
}

await browser.close();
console.log('Viewport motion and route matrix QA passed.');
