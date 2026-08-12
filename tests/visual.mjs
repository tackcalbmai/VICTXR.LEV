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
  if (await page.locator('[data-cinematic-intro]').count() !== 1) throw new Error(`${name} initialized the cinematic intro more than once`);
  if (!await page.locator('.site-brand').isVisible()) throw new Error(`${name} opens on a blank screen`);
  if (!await page.locator('.hero__title').isVisible()) throw new Error(`${name} hero is absent during opening`);
  await screenshot(page, `${name}-opening`);

  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: cinematicReadyTimeout });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 3000 });
  await page.waitForTimeout(180);
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
    await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 3000 });
  }

  const alternate = await page.locator('.site-language').getAttribute('href');
  const expectedAlternate = lang === 'lv' ? '/' : '/lv/';
  if (alternate !== expectedAlternate) throw new Error(`${name} has the wrong language switch target`);

  if (viewport.width <= 760) {
    const toggle = page.locator('[data-menu-toggle]');
    const target = await toggle.boundingBox();
    if (!target || target.width < 44 || target.height < 44) throw new Error(`${name} menu control is smaller than 44×44px`);
    await toggle.click();
    if (await toggle.getAttribute('aria-expanded') !== 'true') throw new Error(`${name} mobile menu did not open`);
    if (await page.locator('[data-mobile-menu]').getAttribute('aria-hidden') !== 'false') throw new Error(`${name} mobile menu remains hidden to assistive technology`);
    if (!await page.locator('main').evaluate((element) => element.inert)) throw new Error(`${name} page remains focusable behind the mobile menu`);
    if (!await page.locator('[data-mobile-menu] a').first().evaluate((element) => element === document.activeElement)) throw new Error(`${name} mobile menu did not receive focus`);
    const openMenuState = await page.evaluate(() => {
      const header = document.querySelector('[data-site-header]');
      const menu = document.querySelector('[data-mobile-menu]');
      const toggle = document.querySelector('[data-menu-toggle]');
      const headerStyle = getComputedStyle(header);
      const menuStyle = getComputedStyle(menu);
      const toggleRect = toggle.getBoundingClientRect();
      return {
        headerZ: Number.parseInt(headerStyle.zIndex, 10),
        menuZ: Number.parseInt(menuStyle.zIndex, 10),
        menuBackground: menuStyle.backgroundColor,
        toggleVisible: toggleRect.top >= 0 && toggleRect.bottom <= innerHeight && toggleRect.left >= 0 && toggleRect.right <= innerWidth,
        htmlLocked: document.documentElement.classList.contains('menu-is-open'),
        bodyLocked: document.body.classList.contains('menu-is-open'),
      };
    });
    if (openMenuState.headerZ <= openMenuState.menuZ) throw new Error(`${name} mobile menu covers its own close control`);
    if (openMenuState.menuBackground.includes('/ 0)') || openMenuState.menuBackground === 'rgba(0, 0, 0, 0)') throw new Error(`${name} mobile menu surface remains transparent (${openMenuState.menuBackground})`);
    if (!openMenuState.toggleVisible) throw new Error(`${name} mobile menu close control is outside the viewport`);
    if (!openMenuState.htmlLocked || !openMenuState.bodyLocked) throw new Error(`${name} mobile menu does not lock both scrolling roots`);
    await screenshot(page, `${name}-menu`);
    await toggle.click();
    if (await toggle.getAttribute('aria-expanded') !== 'false') throw new Error(`${name} mobile menu did not close with its visible control`);
    await toggle.click();
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

async function assertTextInkContained(page, selector, name) {
  const failures = await page.locator(`${selector} span`).evaluateAll((spans) => spans.flatMap((span) => {
    const range = document.createRange();
    range.selectNodeContents(span);
    return [...range.getClientRects()]
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .filter((rect) => rect.left < -4 || rect.right > innerWidth + 4)
      .map((rect) => ({ text: span.textContent?.trim(), left: rect.left, right: rect.right, viewport: innerWidth }));
  }));
  if (failures.length) throw new Error(`${name} clips visible text ink in ${selector}: ${JSON.stringify(failures)}`);
}

const responsiveMatrix = [
  ['matrix-320', { width: 320, height: 700 }],
  ['matrix-360', { width: 360, height: 800 }],
  ['matrix-375', { width: 375, height: 812 }],
  ['matrix-390', { width: 390, height: 844 }],
  ['matrix-393', { width: 393, height: 852 }],
  ['matrix-414', { width: 414, height: 896 }],
  ['matrix-430', { width: 430, height: 932 }],
  ['matrix-768', { width: 768, height: 1024 }],
  ['matrix-820', { width: 820, height: 1180 }],
  ['matrix-1024', { width: 1024, height: 768 }],
  ['matrix-1280', { width: 1280, height: 800 }],
  ['matrix-1366-low', { width: 1366, height: 640 }],
  ['matrix-1440', { width: 1440, height: 900 }],
  ['matrix-1536', { width: 1536, height: 864 }],
  ['matrix-1920', { width: 1920, height: 1080 }],
  ['matrix-mobile-landscape', { width: 844, height: 390 }],
];

const matrixContext = await browser.newContext({ viewport: responsiveMatrix[0][1], reducedMotion: 'reduce' });
const matrixPage = await matrixContext.newPage();
const matrixErrors = collectRuntimeErrors(matrixPage);
for (const [name, viewport] of responsiveMatrix) {
  await matrixPage.setViewportSize(viewport);
  const response = await openPage(matrixPage, '/');
  if (!response?.ok()) throw new Error(`${name} returned ${response?.status()}`);
  await matrixPage.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 1500 });
  await assertCoreDocument(matrixPage, name, 'en');
  if (!await matrixPage.evaluate(() => document.fonts.check('16px Onest', 'VICTXR.LEV'))) throw new Error(`${name} did not load Onest`);
  if (await matrixPage.locator('a[href="#"]').count()) throw new Error(`${name} contains a placeholder link`);
  if (await matrixPage.locator('.contact-channels').count()) throw new Error(`${name} exposes an unconfigured social channel`);

  const compactNavigation = await matrixPage.locator('[data-menu-toggle]').isVisible();
  if (compactNavigation) {
    const toggle = matrixPage.locator('[data-menu-toggle]');
    const box = await toggle.boundingBox();
    if (!box || box.width < 44 || box.height < 44) throw new Error(`${name} compact menu target is too small`);
    await toggle.click();
    if (!await toggle.isVisible()) throw new Error(`${name} hides the close control behind the menu`);
    await toggle.click();
  } else if (!await matrixPage.locator('.site-nav--desktop').isVisible()) {
    throw new Error(`${name} has neither desktop nor compact navigation`);
  }

  await assertTextInkContained(matrixPage, '.about__statement', name);
  await assertTextInkContained(matrixPage, '.anti-sales__title--first', name);
  await assertTextInkContained(matrixPage, '.anti-sales__title--second', name);
  await assertTextInkContained(matrixPage, '.contact__title', name);

  await matrixPage.locator('.project-screen').first().scrollIntoViewIfNeeded();
  await matrixPage.locator('.project-screen').first().evaluate((image) => image.decode());
  const projectSource = await matrixPage.locator('.project-screen').first().evaluate((image) => image.currentSrc);
  const shouldUseMobileImage = viewport.width <= 760;
  if (shouldUseMobileImage !== projectSource.includes('mobile')) throw new Error(`${name} selected the wrong art-directed project image`);
  await instantScroll(matrixPage, await topOf(matrixPage, '#contact'));
  await assertNoHorizontalOverflow(matrixPage, `${name} contact`);
  await screenshot(matrixPage, `${name}-contact`);
}
if (matrixErrors.length) throw new Error(`Responsive matrix runtime errors:\n${matrixErrors.join('\n')}`);
await matrixContext.close();

const lvTypeContext = await browser.newContext({ viewport: { width: 320, height: 700 }, reducedMotion: 'reduce' });
const lvTypePage = await lvTypeContext.newPage();
await openPage(lvTypePage, '/lv/');
if (!await lvTypePage.evaluate(() => document.fonts.check('16px Onest', 'āčēģīķļņšūž'))) throw new Error('Latvian diacritics fell back from Onest');
if ((await lvTypePage.locator('body').innerText()).includes('�')) throw new Error('Latvian content contains a replacement glyph');
await assertNoHorizontalOverflow(lvTypePage, 'Latvian 320 typography');
await lvTypeContext.close();

const historyContext = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'no-preference' });
const historyPage = await historyContext.newPage();
const historyErrors = collectRuntimeErrors(historyPage);
await openPage(historyPage, '/');
await historyPage.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: cinematicReadyTimeout });
await historyPage.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 3000 });
const workPosition = await topOf(historyPage, '.project-feature--catrin');
await instantScroll(historyPage, workPosition + 120);
const expectedReturnY = await historyPage.evaluate(() => window.scrollY);
await historyPage.goto(new URL('/work/catrin/', baseURL).toString(), { waitUntil: 'domcontentloaded' });
await historyPage.goBack({ waitUntil: 'domcontentloaded' });
await historyPage.waitForTimeout(350);
if (await historyPage.locator('[data-home-intro]').getAttribute('data-home-intro') !== 'ready') throw new Error('Back navigation replayed the homepage intro');
if (await historyPage.locator('[data-cinematic-intro]').count()) throw new Error('Back navigation mounted a second cinematic layer');
const restoredY = await historyPage.evaluate(() => window.scrollY);
if (Math.abs(restoredY - expectedReturnY) > 220) throw new Error(`Back navigation lost the selected-work position (${expectedReturnY}px → ${restoredY}px)`);
await screenshot(historyPage, 'history-return-work');
if (historyErrors.length) throw new Error(`Animated history navigation errors:\n${historyErrors.join('\n')}`);
await historyContext.close();

const routeContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const routePage = await routeContext.newPage();
const routeErrors = collectRuntimeErrors(routePage);
const routes = [
  ['/work/catrin/', 'en', 'CATRIN', '/lv/darbi/catrin/'],
  ['/work/anelika/', 'en', 'ANELIKA', '/lv/darbi/anelika/'],
  ['/lv/darbi/catrin/', 'lv', 'CATRIN', '/work/catrin/'],
  ['/lv/darbi/anelika/', 'lv', 'ANELIKA', '/work/anelika/'],
];

for (const [path, lang, title, alternate] of routes) {
  const response = await openPage(routePage, path);
  if (!response?.ok()) throw new Error(`${path} returned ${response?.status()}`);
  await assertCoreDocument(routePage, path, lang);
  if ((await routePage.locator('h1').innerText()).trim() !== title) throw new Error(`${path} has the wrong case title`);
  if (await routePage.locator('.case-narrative__row').count() !== 4) throw new Error(`${path} is missing case-study narrative sections`);
  if (!await routePage.locator('.case-live-link').getAttribute('href')) throw new Error(`${path} is missing the live-project link`);
  if (await routePage.locator('.site-language').getAttribute('href') !== alternate) throw new Error(`${path} language switch loses the current case`);
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

routeErrors.length = 0;
const lvNotFound = await openPage(routePage, '/lv/this-page-does-not-exist/');
if (lvNotFound?.status() !== 404) throw new Error(`Missing Latvian route returned ${lvNotFound?.status()} instead of 404`);
if (await routePage.locator('html').getAttribute('lang') !== 'lv') throw new Error('Latvian 404 did not set the document language');
if ((await routePage.locator('[data-not-found-back]').textContent())?.trim() !== 'Atpakaļ pie tā, kas strādā') throw new Error('Latvian 404 copy did not localize');
if (await routePage.locator('[data-home-link]').first().getAttribute('href') !== '/lv/') throw new Error('Latvian 404 does not return to the Latvian homepage');

routeErrors.length = 0;
await openPage(routePage, '/');
await routePage.locator('a[href="/work/catrin/"]').first().click();
await routePage.waitForURL('**/work/catrin/');
await routePage.goBack({ waitUntil: 'domcontentloaded' });
if (new URL(routePage.url()).pathname !== '/') throw new Error('Back navigation did not restore the homepage');
await routePage.goForward({ waitUntil: 'domcontentloaded' });
if (new URL(routePage.url()).pathname !== '/work/catrin/') throw new Error('Forward navigation did not restore the case study');
if (routeErrors.length) throw new Error(`History navigation runtime errors:\n${routeErrors.join('\n')}`);

routeErrors.length = 0;
await openPage(routePage, '/#contact');
await routePage.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready' && window.scrollY > 100, undefined, { timeout: 2000 });
if (await routePage.locator('[data-cinematic-intro]').count()) throw new Error('Direct contact URL incorrectly launched the cinematic intro');
const contactLandingDelta = Math.abs((await topOf(routePage, '#contact')) - await routePage.evaluate(() => window.scrollY));
if (contactLandingDelta > 140) throw new Error(`Direct contact URL missed its target by ${contactLandingDelta}px`);
await routePage.reload({ waitUntil: 'domcontentloaded' });
await routePage.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready' && window.scrollY > 100, undefined, { timeout: 2000 });
if (new URL(routePage.url()).hash !== '#contact' || await routePage.locator('[data-cinematic-intro]').count()) throw new Error('Reloading a direct contact URL lost its target or replayed the intro');

await openPage(routePage, '/lv/#services');
await routePage.waitForFunction(() => window.scrollY > 100, undefined, { timeout: 2000 });
if (await routePage.locator('html').getAttribute('lang') !== 'lv') throw new Error('Direct Latvian section URL changed language');
const servicesLandingDelta = Math.abs((await topOf(routePage, '#services')) - await routePage.evaluate(() => window.scrollY));
if (servicesLandingDelta > 140) throw new Error(`Direct Latvian services URL missed its target by ${servicesLandingDelta}px`);

await openPage(routePage, '/work/anelika/');
await routePage.locator('.case-next a').first().click();
await routePage.waitForURL('**/#work');
await routePage.waitForFunction(() => window.scrollY > 100, undefined, { timeout: 2000 });
if (await routePage.locator('[data-cinematic-intro]').count()) throw new Error('Back-to-work link replayed the homepage intro');
if (routeErrors.length) throw new Error(`Direct-section navigation errors:\n${routeErrors.join('\n')}`);

await routeContext.close();

const mobileCaseContext = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
const mobileCasePage = await mobileCaseContext.newPage();
const mobileCaseErrors = collectRuntimeErrors(mobileCasePage);
for (const [path, title] of [['/work/catrin/', 'CATRIN'], ['/work/anelika/', 'ANELIKA']]) {
  const response = await openPage(mobileCasePage, path);
  if (!response?.ok()) throw new Error(`${path} mobile returned ${response?.status()}`);
  await assertCoreDocument(mobileCasePage, `${title} mobile case`, 'en');
  if (!await mobileCasePage.locator('.case-screen').isVisible()) throw new Error(`${title} mobile case does not show its responsive project screen`);
  const currentSource = await mobileCasePage.locator('.case-screen').evaluate((image) => image.currentSrc);
  if (!currentSource.includes('mobile')) throw new Error(`${title} mobile case selected the desktop project image`);
  await screenshot(mobileCasePage, `mobile-${title.toLowerCase()}-case`);
  const caseMenuToggle = mobileCasePage.locator('[data-menu-toggle]');
  await caseMenuToggle.click();
  const caseMenuLayering = await mobileCasePage.evaluate(() => ({
    header: Number.parseInt(getComputedStyle(document.querySelector('[data-site-header]')).zIndex, 10),
    menu: Number.parseInt(getComputedStyle(document.querySelector('[data-mobile-menu]')).zIndex, 10),
    background: getComputedStyle(document.querySelector('[data-site-header]')).backgroundColor,
  }));
  if (caseMenuLayering.header <= caseMenuLayering.menu || caseMenuLayering.background === 'rgba(0, 0, 0, 0)') throw new Error(`${title} case menu merges with the project behind it`);
  await screenshot(mobileCasePage, `mobile-${title.toLowerCase()}-menu`);
  await caseMenuToggle.click();
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

const noScriptContext = await browser.newContext({ viewport: { width: 393, height: 852 }, javaScriptEnabled: false });
const noScriptPage = await noScriptContext.newPage();
const noScriptResponse = await noScriptPage.goto(baseURL, { waitUntil: 'load' });
if (!noScriptResponse?.ok()) throw new Error(`No-JS homepage returned ${noScriptResponse?.status()}`);
await noScriptPage.waitForTimeout(1200);
if (!await noScriptPage.locator('.hero__title').isVisible()) throw new Error('No-JS fallback hides the core offer');
if (!await noScriptPage.locator('.no-js-nav').isVisible()) throw new Error('No-JS fallback has no usable navigation');
if (await noScriptPage.locator('[data-menu-toggle]').isVisible()) throw new Error('No-JS fallback exposes a dead menu button');
const fallbackCover = await noScriptPage.locator('[data-home-intro]').evaluate((element) => getComputedStyle(element, '::before').display);
if (fallbackCover !== 'none') throw new Error('No-JS fallback leaves the black intro cover active');
await assertNoHorizontalOverflow(noScriptPage, 'No-JS mobile fallback');
await screenshot(noScriptPage, 'no-js-mobile');
await noScriptContext.close();

await browser.close();
console.log(`Visual QA passed for 6 animated home views, ${responsiveMatrix.length} responsive geometries, 6 case-study views and reduced-motion mode at ${baseURL}`);
