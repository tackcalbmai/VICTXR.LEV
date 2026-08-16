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
  if (skipTarget !== '#main-content' || await page.locator('main#main-content').count() !== 1) throw new Error(`${name} skip link does not target main`);
  await assertNoHorizontalOverflow(page, name);
}

async function screenshot(page, name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false });
}

async function topOf(page, selector) {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top + window.scrollY;
  });
}

async function instantScroll(page, y) {
  await page.evaluate((targetY) => window.scrollTo({ top: targetY, behavior: 'instant' }), y);
  await page.waitForTimeout(260);
}

async function waitForHome(page) {
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: cinematicReadyTimeout });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(120);
}

async function assertImagesLoaded(page, name) {
  await page.evaluate(async () => {
    const step = Math.max(500, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  });
  await page.waitForTimeout(280);
  const broken = await page.locator('img').evaluateAll((images) => images
    .filter((image) => image.offsetParent !== null && (!image.complete || image.naturalWidth === 0))
    .map((image) => image.currentSrc || image.src));
  if (broken.length) throw new Error(`${name} has broken images:\n${broken.join('\n')}`);
}

async function assertHome({ name, viewport, path = '/', lang = 'en', detailed = false }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = collectRuntimeErrors(page);
  const response = await openPage(page, path);
  if (!response?.ok()) throw new Error(`${name} returned ${response?.status()}`);

  await page.waitForTimeout(80);
  const introState = await page.locator('[data-home-intro]').getAttribute('data-home-intro');
  if (introState !== 'pending') throw new Error(`${name} skipped the opening state`);
  if (await page.locator('[data-cinematic-intro]').count() !== 1) throw new Error(`${name} did not mount exactly one cinematic intro`);
  if (!await page.locator('.site-brand').isVisible() || !await page.locator('.hero__title').isVisible()) throw new Error(`${name} opens on an incomplete first frame`);
  await screenshot(page, `${name}-opening`);

  await waitForHome(page);
  await assertCoreDocument(page, name, lang);

  if (await page.locator('[data-intro-line]').count() !== 3) throw new Error(`${name} hero line structure changed`);
  if (!await page.locator('[data-scroll-journey]').isVisible()) throw new Error(`${name} lost the scroll journey`);
  if (await page.locator('.scroll-rail__track > span').count() !== 8) throw new Error(`${name} scroll rail no longer has eight glyphs`);
  if (await page.locator('.scroll-rail__track > .is-o').count() !== 1) throw new Error(`${name} scroll rail lost its single O`);

  const expectedRoutes = lang === 'lv'
    ? ['/lv/darbi/', '/lv/par-mani/', '/lv/pakalpojumi/', '/lv/kontakti/']
    : ['/work/', '/about/', '/services/', '/contact/'];
  const navRoutes = await page.locator('.site-header .site-nav--desktop > a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  if (JSON.stringify(navRoutes) !== JSON.stringify(expectedRoutes)) throw new Error(`${name} header routes are wrong: ${navRoutes.join(', ')}`);

  for (const selector of ['#work', '.home-v2-perspective', '.home-v2-close']) {
    if (await page.locator(selector).count() !== 1) throw new Error(`${name} is missing ${selector}`);
  }
  if (await page.locator('.home-v2-project[data-takeover-layer]').count() !== 2) throw new Error(`${name} must expose exactly two project takeover layers`);
  if (await page.locator('.about.section-pad, .services.section-pad, .anti-sales, #contact').count()) throw new Error(`${name} regressed to the old full landing architecture`);

  const caseHrefs = lang === 'lv'
    ? ['/lv/darbi/catrin/', '/lv/darbi/anelika/']
    : ['/work/catrin/', '/work/anelika/'];
  for (const href of caseHrefs) {
    if (await page.locator(`.home-v2-project[href="${href}"]`).count() !== 1) throw new Error(`${name} is missing takeover link ${href}`);
  }
  const projectPointerEvents = await page.locator('.home-v2-project').first().evaluate((element) => getComputedStyle(element).pointerEvents);
  if (projectPointerEvents === 'none') throw new Error(`${name} project takeover is visually present but not clickable`);

  await screenshot(page, `${name}-hero`);

  const startY = await page.evaluate(() => window.scrollY);
  await page.locator('[data-scroll-journey]').dispatchEvent('click');
  await page.waitForFunction((initialY) => window.scrollY > initialY + 10, startY, { timeout: 2500 }).catch(() => {});
  if (await page.evaluate(() => window.scrollY) < startY + 10) throw new Error(`${name} scroll journey did not begin`);
  await page.mouse.wheel(0, 1);
  await instantScroll(page, 0);

  const disruptionTop = await topOf(page, '[data-disruption]');
  await instantScroll(page, disruptionTop + viewport.height * (viewport.width <= 760 ? 0.74 : 0.82));
  const disruptionOpacity = await page.locator('[data-disruption-two]').evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
  if (disruptionOpacity < 0.12) throw new Error(`${name} second disruption statement does not enter on scroll`);
  await screenshot(page, `${name}-disruption`);

  const workTop = await topOf(page, '.home-v2-work');
  await instantScroll(page, workTop + Math.max(80, viewport.height * 0.25));
  await screenshot(page, `${name}-takeover`);

  const firstProject = page.locator('.home-v2-project').first();
  const source = await firstProject.locator('img').evaluate((image) => image.currentSrc);
  const shouldUseMobile = viewport.width <= 760;
  if (shouldUseMobile !== source.includes('mobile')) throw new Error(`${name} takeover selected the wrong responsive art direction`);

  if (detailed && viewport.width > 760) {
    const before = await firstProject.evaluate((element) => getComputedStyle(element).getPropertyValue('--xo-shift-x').trim());
    const box = await firstProject.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3);
      await page.waitForTimeout(80);
      const after = await firstProject.evaluate((element) => getComputedStyle(element).getPropertyValue('--xo-shift-x').trim());
      if (!after || (after === before && after === '0px')) throw new Error(`${name} takeover does not react to controlled perspective input`);
    }
  }

  await instantScroll(page, await topOf(page, '.home-v2-perspective'));
  await screenshot(page, `${name}-perspective`);
  await instantScroll(page, await topOf(page, '.home-v2-close'));
  await screenshot(page, `${name}-close`);
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
  await matrixPage.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 1800 });
  await assertCoreDocument(matrixPage, name, 'en');
  if (await matrixPage.locator('a[href="#"]').count()) throw new Error(`${name} contains a placeholder link`);
  if (await matrixPage.locator('.site-header a[href="/contact/"]').count() < 1) throw new Error(`${name} does not expose the dedicated Contact route`);

  const compactNavigation = await matrixPage.locator('[data-menu-toggle]').isVisible();
  if (compactNavigation) {
    const toggle = matrixPage.locator('[data-menu-toggle]');
    const box = await toggle.boundingBox();
    if (!box || box.width < 44 || box.height < 44) throw new Error(`${name} compact menu target is too small`);
    await toggle.click();
    if (await toggle.getAttribute('aria-expanded') !== 'true') throw new Error(`${name} compact menu did not open`);
    if (!await toggle.isVisible()) throw new Error(`${name} hides the close control behind the menu`);
    await toggle.click();
    await matrixPage.locator('[data-mobile-menu]').waitFor({ state: 'hidden' });
  } else if (!await matrixPage.locator('.site-nav--desktop').isVisible()) {
    throw new Error(`${name} has neither desktop nor compact navigation`);
  }

  await assertTextInkContained(matrixPage, '.home-v2-work__title', name);
  await assertTextInkContained(matrixPage, '.home-v2-perspective h2', name);
  await assertTextInkContained(matrixPage, '.home-v2-close h2', name);

  const projectImage = matrixPage.locator('.home-v2-project img').first();
  await projectImage.scrollIntoViewIfNeeded();
  await projectImage.evaluate((image) => image.decode());
  const projectSource = await projectImage.evaluate((image) => image.currentSrc);
  if ((viewport.width <= 760) !== projectSource.includes('mobile')) throw new Error(`${name} selected the wrong takeover art direction`);
  await instantScroll(matrixPage, await topOf(matrixPage, '.home-v2-close'));
  await assertNoHorizontalOverflow(matrixPage, `${name} closing`);
  await screenshot(matrixPage, `${name}-closing`);
}
if (matrixErrors.length) throw new Error(`Responsive matrix runtime errors:\n${matrixErrors.join('\n')}`);
await matrixContext.close();

const contactCases = [
  ['/contact/', 'en', '/lv/kontakti/'],
  ['/lv/kontakti/', 'lv', '/contact/'],
];
for (const [path, lang, alternate] of contactCases) {
  const context = await browser.newContext({ viewport: { width: lang === 'lv' ? 393 : 1366, height: lang === 'lv' ? 852 : 768 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = collectRuntimeErrors(page);
  const response = await openPage(page, path);
  if (!response?.ok()) throw new Error(`${path} returned ${response?.status()}`);
  await assertCoreDocument(page, path, lang);
  if (await page.locator('[data-cinematic-intro]').count()) throw new Error(`${path} incorrectly launches the Home cinematic`);
  if (await page.locator('[data-contact-intent]').count() !== 3) throw new Error(`${path} must expose three project starting points`);
  if (await page.locator('[data-contact-intent].is-active').count() !== 1) throw new Error(`${path} must expose one initial focus state`);
  if (await page.locator('.site-language').getAttribute('href') !== alternate) throw new Error(`${path} language switch loses Contact context`);

  const firstIntent = page.locator('[data-contact-intent]').first();
  await firstIntent.click();
  if (await firstIntent.getAttribute('aria-pressed') !== 'true') throw new Error(`${path} intent selection is not exposed accessibly`);
  const selectedLabel = (await page.locator('[data-contact-selection]').innerText()).trim();
  const firstLabel = (await firstIntent.locator('.contact-intent__title').innerText()).trim();
  if (selectedLabel !== firstLabel) throw new Error(`${path} selection does not update the direct-contact state`);
  const emailHref = await page.locator('[data-contact-email]').getAttribute('href');
  if (!emailHref?.startsWith('mailto:') || !emailHref.includes('subject=')) throw new Error(`${path} selected intent does not prepare an email subject`);
  await page.locator('.contact-direct').scrollIntoViewIfNeeded();
  if (await page.locator('.contact-direct .contact-channels > a').count() < 1) throw new Error(`${path} is missing direct social contact channels`);
  await screenshot(page, `${lang}-contact-focus`);
  await assertNoHorizontalOverflow(page, path);
  if (errors.length) throw new Error(`${path} runtime errors:\n${errors.join('\n')}`);
  await context.close();
}

const historyContext = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'no-preference' });
const historyPage = await historyContext.newPage();
const historyErrors = collectRuntimeErrors(historyPage);
await openPage(historyPage, '/');
await waitForHome(historyPage);
const workPosition = await topOf(historyPage, '.home-v2-work');
await instantScroll(historyPage, workPosition + 180);
const expectedReturnY = await historyPage.evaluate(() => window.scrollY);
await historyPage.locator('.home-v2-project[href="/work/catrin/"]').click();
await historyPage.waitForURL('**/work/catrin/');
await historyPage.goBack({ waitUntil: 'domcontentloaded' });
await historyPage.waitForTimeout(380);
if (await historyPage.locator('[data-home-intro]').getAttribute('data-home-intro') !== 'ready') throw new Error('Back navigation replayed the Home intro');
if (await historyPage.locator('[data-cinematic-intro]').count()) throw new Error('Back navigation mounted a second cinematic layer');
const restoredY = await historyPage.evaluate(() => window.scrollY);
if (Math.abs(restoredY - expectedReturnY) > 260) throw new Error(`Back navigation lost takeover position (${expectedReturnY}px → ${restoredY}px)`);
await screenshot(historyPage, 'history-return-takeover');
if (historyErrors.length) throw new Error(`Animated history navigation errors:\n${historyErrors.join('\n')}`);
await historyContext.close();

const routeContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const routePage = await routeContext.newPage();
const routeErrors = collectRuntimeErrors(routePage);
const caseRoutes = [
  ['/work/catrin/', 'en', 'CATRIN', '/lv/darbi/catrin/', '/work/#work'],
  ['/work/anelika/', 'en', 'ANELIKA', '/lv/darbi/anelika/', '/work/#work'],
  ['/lv/darbi/catrin/', 'lv', 'CATRIN', '/work/catrin/', '/lv/darbi/#work'],
  ['/lv/darbi/anelika/', 'lv', 'ANELIKA', '/work/anelika/', '/lv/darbi/#work'],
];

for (const [path, lang, title, alternate, back] of caseRoutes) {
  const response = await openPage(routePage, path);
  if (!response?.ok()) throw new Error(`${path} returned ${response?.status()}`);
  await assertCoreDocument(routePage, path, lang);
  if ((await routePage.locator('h1').innerText()).trim() !== title) throw new Error(`${path} has the wrong case title`);
  if (await routePage.locator('.case-narrative__row').count() !== 4) throw new Error(`${path} is missing case narrative sections`);
  if (await routePage.locator('.site-language').getAttribute('href') !== alternate) throw new Error(`${path} language switch loses case context`);
  if (await routePage.locator('.case-next a').first().getAttribute('href') !== back) throw new Error(`${path} does not return to its Work exhibition`);
  if (await routePage.locator('.page-contact-cta').count() !== 1) throw new Error(`${path} does not end with the compact Contact transition`);
  await assertImagesLoaded(routePage, path);
  await instantScroll(routePage, 0);
  await screenshot(routePage, `${path.includes('/lv/') ? 'lv-' : ''}${title.toLowerCase()}-case`);
}

routeErrors.length = 0;
const notFound = await openPage(routePage, '/this-page-does-not-exist/');
if (notFound?.status() !== 404 || !await routePage.locator('.not-found').count()) throw new Error('Custom English 404 did not render correctly');
routeErrors.length = 0;
const lvNotFound = await openPage(routePage, '/lv/this-page-does-not-exist/');
if (lvNotFound?.status() !== 404 || await routePage.locator('html').getAttribute('lang') !== 'lv') throw new Error('Custom Latvian 404 did not render correctly');

await openPage(routePage, '/work/anelika/');
await routePage.locator('.case-next a').first().click();
await routePage.waitForURL('**/work/#work');
await routePage.waitForFunction(() => window.scrollY > 50, undefined, { timeout: 2500 }).catch(() => {});
if (new URL(routePage.url()).pathname !== '/work/' || new URL(routePage.url()).hash !== '#work') throw new Error('Case back navigation did not land on the Work exhibition');

if (routeErrors.length) throw new Error(`Route runtime errors:\n${routeErrors.join('\n')}`);
await routeContext.close();

await browser.close();
console.log('Visual QA passed: the shorter Home trailer, project takeover, dedicated Contact, responsive geometry, history behavior and case-study routes are stable.');