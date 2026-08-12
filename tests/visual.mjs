import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const cinematicReadyTimeout = 9000;

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? {
    executablePath,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  } : {}),
});

function collectRuntimeErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  return errors;
}

async function openPage(page, path) {
  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  return response;
}

async function assertNoHorizontalOverflow(page, name) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  const overflow = Math.max(dimensions.document, dimensions.body) - dimensions.viewport;
  if (overflow > 2) throw new Error(`${name} has ${overflow}px horizontal overflow`);
}

async function assertCoreDocument(page, name, lang) {
  if ((await page.locator('html').getAttribute('lang')) !== lang) throw new Error(`${name} has the wrong document language`);
  if (await page.locator('main').count() !== 1) throw new Error(`${name} must have exactly one main landmark`);
  if (await page.locator('h1').count() !== 1) throw new Error(`${name} must have exactly one h1`);
  if (!await page.locator('link[rel="canonical"]').getAttribute('href')) throw new Error(`${name} is missing a canonical URL`);
  if (await page.locator('link[rel="alternate"][hreflang]').count() < 3) throw new Error(`${name} is missing language alternates`);
  if (!await page.locator('meta[property="og:image"]').getAttribute('content')) throw new Error(`${name} is missing a social image`);
  const skipTarget = await page.locator('.skip-link').getAttribute('href');
  if (skipTarget !== '#main-content' || await page.locator('main#main-content').count() !== 1) throw new Error(`${name} skip link does not target the main landmark`);
  await assertNoHorizontalOverflow(page, name);
}

async function assertImagesLoaded(page, name) {
  await page.evaluate(async () => {
    const step = Math.max(500, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 12));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForTimeout(350);
  const broken = await page.locator('img').evaluateAll((images) => images
    .filter((image) => image.offsetParent !== null && (!image.complete || image.naturalWidth === 0))
    .map((image) => image.currentSrc || image.src));
  if (broken.length) throw new Error(`${name} has broken images:\n${broken.join('\n')}`);
}

async function topOf(page, selector) {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top + window.scrollY;
  });
}

async function instantScroll(page, y) {
  await page.evaluate((targetY) => window.scrollTo({ top: targetY, behavior: 'instant' }), y);
  await page.waitForTimeout(280);
}

async function screenshot(page, name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false });
}

async function assertHome({ name, viewport, path = '/', lang = 'en', detailed = false }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(baseURL).origin });
  const page = await context.newPage();
  const errors = collectRuntimeErrors(page);
  await openPage(page, path);

  await page.waitForTimeout(80);
  const introState = await page.locator('[data-home-intro]').getAttribute('data-home-intro');
  if (introState !== 'pending') throw new Error(`${name} skipped the real opening state`);
  if (!await page.locator('.site-brand').isVisible()) throw new Error(`${name} opens on a blank screen`);
  if (!await page.locator('.hero__title').isVisible()) throw new Error(`${name} hero is absent during opening`);
  await screenshot(page, `${name}-opening`);

  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: cinematicReadyTimeout });
  await page.waitForTimeout(120);
  await assertCoreDocument(page, name, lang);

  if (await page.locator('[data-intro-line]').count() !== 3) throw new Error(`${name} hero line structure changed`);
  if (!await page.locator('.hero__side-note').isVisible()) throw new Error(`${name} side note is hidden`);
  if (!await page.locator('[data-scroll-journey]').isVisible()) throw new Error(`${name} scroll control is hidden`);
  if (await page.locator('.scroll-rail__track > span').count() !== 8) throw new Error(`${name} scroll rail must contain eight glyphs`);
  if (await page.locator('.scroll-rail__track > .is-o').count() !== 1) throw new Error(`${name} scroll rail must contain one intentional O`);

  const rail = await page.locator('.scroll-rail__window').boundingBox();
  if (rail && Math.abs(rail.x + rail.width / 2 - viewport.width / 2) > 3) throw new Error(`${name} scroll rail is not centered`);
  await screenshot(page, `${name}-hero`);

  if (name === 'desktop-1366') {
    // The intro itself already performs one full X/O cycle. The header's own
    // idle signature intentionally waits before repeating, so QA follows that
    // art-directed hold instead of forcing another effect immediately.
    await page.waitForFunction(() => document.querySelector('[data-brand-letter]')?.textContent === 'O', undefined, { timeout: 12000 });
    await page.waitForFunction(() => document.querySelector('[data-brand-letter]')?.textContent === 'X', undefined, { timeout: 6500 });
    await instantScroll(page, 640);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(90);
    if (await page.evaluate(() => window.scrollY) > 2) throw new Error(`${name} did not reset to the top on reload`);
    if (await page.locator('[data-home-intro]').getAttribute('data-home-intro') !== 'pending') throw new Error(`${name} did not replay the opening state on reload`);
    await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: cinematicReadyTimeout });
  }

  const alternate = await page.locator('.site-language').getAttribute('href');
  const expectedAlternate = lang === 'lv' ? '/' : '/lv/';
  if (alternate !== expectedAlternate) throw new Error(`${name} has the wrong language switch target`);

  if (viewport.width <= 760) {
    const toggle = page.locator('[data-menu-toggle]');
    await toggle.click();
    if (await toggle.getAttribute('aria-expanded') !== 'true') throw new Error(`${name} mobile menu did not open`);
    if (await page.locator('[data-mobile-menu]').getAttribute('aria-hidden') !== 'false') throw new Error(`${name} mobile menu remains hidden to assistive technology`);
    if (!await page.locator('main').evaluate((element) => element.inert)) throw new Error(`${name} page remains focusable behind the mobile menu`);
    if (!await page.locator('[data-mobile-menu] a').first().evaluate((element) => element === document.activeElement)) throw new Error(`${name} mobile menu did not receive focus`);
    await screenshot(page, `${name}-menu`);
    await page.keyboard.press('Escape');
    if (await toggle.getAttribute('aria-expanded') !== 'false') throw new Error(`${name} mobile menu did not close with Escape`);
    if (await page.locator('main').evaluate((element) => element.inert)) throw new Error(`${name} page remained inert after closing the mobile menu`);
    if (!await toggle.evaluate((element) => element === document.activeElement)) throw new Error(`${name} mobile menu did not return focus`);
  }

  const startY = await page.evaluate(() => window.scrollY);
  await page.locator('[data-scroll-journey]').dispatchEvent('click');
  await page.waitForFunction((initialY) => window.scrollY > initialY + 10, startY, { timeout: 2500 }).catch(() => {});
  const movingY = await page.evaluate(() => window.scrollY);
  if (movingY < startY + 10) throw new Error(`${name} scroll journey did not begin`);
  await page.mouse.wheel(0, 1);
  await instantScroll(page, 0);

  const disruptionTop = await topOf(page, '[data-disruption]');
  await instantScroll(page, disruptionTop + viewport.height * (viewport.width <= 760 ? 0.74 : 0.82));
  const phrases = await page.locator('.no-break').evaluateAll((spans) => spans.map((span) => ({
    text: span.textContent,
    whiteSpace: getComputedStyle(span).whiteSpace,
    rects: span.getClientRects().length,
  })));
  if (phrases.some((phrase) => phrase.whiteSpace !== 'nowrap' || phrase.rects !== 1)) throw new Error(`${name} breaks a protected disruption word`);
  const disruptionOpacity = await page.locator('[data-disruption-two]').evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
  if (disruptionOpacity < 0.12) throw new Error(`${name} second disruption statement is not entering on scroll`);
  await screenshot(page, `${name}-disruption`);

  for (const id of ['work', 'about', 'approach', 'services', 'contact']) {
    if (await page.locator(`#${id}`).count() !== 1) throw new Error(`${name} is missing #${id}`);
  }
  if (await page.locator('[data-project]').count() !== 2) throw new Error(`${name} must present both projects`);
  if (!await page.locator(`a[href="${lang === 'lv' ? '/lv/darbi/catrin/' : '/work/catrin/'}"]`).count()) throw new Error(`${name} is missing the CATRIN case link`);
  if (!await page.locator(`a[href="${lang === 'lv' ? '/lv/darbi/anelika/' : '/work/anelika/'}"]`).count()) throw new Error(`${name} is missing the ANELIKA case link`);

  if (detailed) {
    const catrinTop = await topOf(page, '.project-feature--catrin');
    await instantScroll(page, catrinTop + 90);
    if (await page.locator('[data-site-header]').getAttribute('data-over-theme') !== 'dark') throw new Error(`${name} header does not adapt over CATRIN`);
    if (viewport.width > 760) {
      const media = page.locator('.project-feature--catrin [data-perspective-card]');
      const box = await media.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.34);
        await page.waitForTimeout(80);
        const rotation = await media.evaluate((element) => getComputedStyle(element).getPropertyValue('--card-ry').trim());
        if (!rotation || rotation === '0deg') throw new Error(`${name} project perspective does not react to the pointer`);
      }
    }
    await screenshot(page, `${name}-catrin`);

    const anelikaTop = await topOf(page, '.project-feature--anelika');
    await instantScroll(page, anelikaTop + 90);
    if (await page.locator('[data-site-header]').getAttribute('data-over-theme') !== 'anelika') throw new Error(`${name} header does not adapt over ANELIKA`);
    await screenshot(page, `${name}-anelika`);

    await instantScroll(page, await topOf(page, '#about'));
    await screenshot(page, `${name}-about`);
    await instantScroll(page, await topOf(page, '#services'));
    await screenshot(page, `${name}-services`);
    await instantScroll(page, await topOf(page, '.xo-section'));
    await screenshot(page, `${name}-xo`);
    const antiTop = await topOf(page, '[data-anti-sales]');
    await instantScroll(page, antiTop + viewport.height * 0.82);
    const antiOpacity = await page.locator('[data-anti-second]').evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
    if (antiOpacity < 0.1) throw new Error(`${name} anti-sales statement does not transform on scroll`);
    await screenshot(page, `${name}-anti-sales`);
    await instantScroll(page, await topOf(page, '#contact'));
    if (await page.locator('[data-site-header]').getAttribute('data-over-theme') !== 'dark') throw new Error(`${name} header does not adapt over contact`);
    await screenshot(page, `${name}-contact`);
    const copyButton = page.locator('[data-copy-email]');
    await copyButton.click();
    await page.waitForFunction(() => document.querySelector('[data-copy-email]')?.classList.contains('is-copied'));
    const copiedEmail = await page.evaluate(() => navigator.clipboard.readText());
    if (copiedEmail !== 'viktors.levdanskis@inbox.lv') throw new Error(`${name} copy-email control copied the wrong value`);
  }

  await assertImagesLoaded(page, name);
  await assertNoHorizontalOverflow(page, `${name} after scrolling`);
  if (errors.length) throw new Error(`${name} runtime errors:\n${errors.join('\n')}`);
  await context.close();
}

await assertHome({ name: 'desktop-1366', viewport: { width: 1366, height: 768 }, detailed: true });
await assertHome({ name: 'desktop-1440', viewport: { width: 1440, height: 1000 } });
await assertHome({ name: 'tablet-768', viewport: { width: 768, height: 1024 } });
await assertHome({ name: 'mobile-393', viewport: { width: 393, height: 852 }, detailed: true });
await assertHome({ name: 'mobile-360', viewport: { width: 360, height: 800 } });
await assertHome({ name: 'lv-mobile', viewport: { width: 390, height: 844 }, path: '/lv/', lang: 'lv', detailed: true });

const routeContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const routePage = await routeContext.newPage();
const routeErrors = collectRuntimeErrors(routePage);
const routes = [
  ['/work/catrin/', 'en', 'CATRIN'],
  ['/work/anelika/', 'en', 'ANELIKA'],
  ['/lv/darbi/catrin/', 'lv', 'CATRIN'],
  ['/lv/darbi/anelika/', 'lv', 'ANELIKA'],
];

for (const [path, lang, title] of routes) {
  const response = await openPage(routePage, path);
  if (!response?.ok()) throw new Error(`${path} returned ${response?.status()}`);
  await assertCoreDocument(routePage, path, lang);
  if ((await routePage.locator('h1').innerText()).trim() !== title) throw new Error(`${path} has the wrong case title`);
  if (await routePage.locator('.case-narrative__row').count() !== 4) throw new Error(`${path} is missing case-study narrative sections`);
  if (!await routePage.locator('.case-live-link').getAttribute('href')) throw new Error(`${path} is missing the live-project link`);
  await assertImagesLoaded(routePage, path);
  await instantScroll(routePage, 0);
  await screenshot(routePage, `${path.includes('lv/') ? 'lv-' : ''}${title.toLowerCase()}-case`);
}

if (routeErrors.length) throw new Error(`Route runtime errors:\n${routeErrors.join('\n')}`);
routeErrors.length = 0;
const notFound = await openPage(routePage, '/this-page-does-not-exist/');
if (notFound?.status() !== 404) throw new Error(`Missing route returned ${notFound?.status()} instead of 404`);
if (!await routePage.locator('.not-found').count()) throw new Error('Custom 404 page did not render');
const unexpected404Errors = routeErrors.filter((error) => !error.includes('status of 404'));
if (unexpected404Errors.length) throw new Error(`404 runtime errors:\n${unexpected404Errors.join('\n')}`);

await routeContext.close();

const mobileCaseContext = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
const mobileCasePage = await mobileCaseContext.newPage();
const mobileCaseErrors = collectRuntimeErrors(mobileCasePage);
for (const [path, title] of [['/work/catrin/', 'CATRIN'], ['/work/anelika/', 'ANELIKA']]) {
  const response = await openPage(mobileCasePage, path);
  if (!response?.ok()) throw new Error(`${path} mobile returned ${response?.status()}`);
  await assertCoreDocument(mobileCasePage, `${title} mobile case`, 'en');
  if (!await mobileCasePage.locator('.case-screen--mobile').isVisible()) throw new Error(`${title} mobile case does not show its responsive project screen`);
  await screenshot(mobileCasePage, `mobile-${title.toLowerCase()}-case`);
  await assertImagesLoaded(mobileCasePage, `${title} mobile case`);
}
if (mobileCaseErrors.length) throw new Error(`Mobile case runtime errors:\n${mobileCaseErrors.join('\n')}`);
await mobileCaseContext.close();

const reducedContext = await browser.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' });
const reducedPage = await reducedContext.newPage();
const reducedErrors = collectRuntimeErrors(reducedPage);
await openPage(reducedPage, '/');
await reducedPage.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 5000 });
const reducedStates = await reducedPage.evaluate(() => ({
  disruptionVisibility: getComputedStyle(document.querySelector('[data-disruption-two]')).visibility,
  disruptionOpacity: Number.parseFloat(getComputedStyle(document.querySelector('[data-disruption-two]')).opacity),
  antiOpacity: Number.parseFloat(getComputedStyle(document.querySelector('[data-anti-second]')).opacity),
}));
if (reducedStates.disruptionVisibility !== 'visible' || reducedStates.disruptionOpacity < 0.99 || reducedStates.antiOpacity < 0.99) {
  throw new Error('Reduced-motion mode hides essential transformation copy');
}
await instantScroll(reducedPage, await topOf(reducedPage, '[data-disruption]'));
await screenshot(reducedPage, 'reduced-motion-disruption');
if (reducedErrors.length) throw new Error(`Reduced-motion runtime errors:\n${reducedErrors.join('\n')}`);
await reducedContext.close();

await browser.close();
console.log(`Visual QA passed for 6 home viewport/language combinations, 6 case-study views and reduced-motion mode at ${baseURL}`);
