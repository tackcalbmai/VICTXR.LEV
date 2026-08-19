import { chromium, firefox, webkit } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

const profiles = [
  {
    name: 'chromium-desktop',
    engine: chromium,
    context: { viewport: { width: 1366, height: 768 } },
  },
  {
    name: 'firefox-desktop',
    engine: firefox,
    context: { viewport: { width: 1366, height: 768 } },
  },
  {
    name: 'webkit-desktop',
    engine: webkit,
    context: { viewport: { width: 1440, height: 900 } },
  },
  {
    name: 'webkit-iphone',
    engine: webkit,
    context: {
      viewport: { width: 393, height: 852 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    },
  },
  {
    name: 'webkit-iphone-landscape',
    engine: webkit,
    context: {
      viewport: { width: 844, height: 390 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    },
  },
  {
    name: 'chromium-android',
    engine: chromium,
    context: {
      viewport: { width: 360, height: 800 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36',
    },
  },
];

function collectErrors(page) {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  return errors;
}

async function assertNoOverflow(page, name) {
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`${name} has ${overflow}px horizontal overflow`);
}

async function advanceScrollChoreography(page, targetY) {
  await page.evaluate(async (target) => {
    const start = window.scrollY;
    const steps = 6;
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      window.scrollTo(0, start + (target - start) * progress);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise((resolve) => setTimeout(resolve, 70));
    }
  }, targetY);

  await page.waitForFunction(() => {
    const element = document.querySelector('[data-disruption-two]');
    return element && Number.parseFloat(getComputedStyle(element).opacity) >= 0.05;
  }, undefined, { timeout: 1800 });
}

async function readOpenMenuState(page) {
  return page.evaluate(() => {
    const header = document.querySelector('[data-site-header]');
    const menu = document.querySelector('[data-mobile-menu]');
    const main = document.querySelector('main');
    const centers = [...document.querySelectorAll('[data-menu-toggle] i')].map((line) => {
      const rect = line.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    const closeLineDelta = centers.length === 2
      ? Math.hypot(centers[0].x - centers[1].x, centers[0].y - centers[1].y)
      : Number.POSITIVE_INFINITY;
    return {
      headerZ: header ? Number.parseInt(getComputedStyle(header).zIndex, 10) : Number.NaN,
      menuZ: menu ? Number.parseInt(getComputedStyle(menu).zIndex, 10) : Number.NaN,
      menuBackground: menu ? getComputedStyle(menu).backgroundColor : '',
      inert: Boolean(main?.inert),
      closeLineDelta,
    };
  });
}

async function waitForOpenMenuToSettle(page, name) {
  await page.waitForFunction(() => {
    const header = document.querySelector('[data-site-header]');
    const menu = document.querySelector('[data-mobile-menu]');
    const main = document.querySelector('main');
    const centers = [...document.querySelectorAll('[data-menu-toggle] i')].map((line) => {
      const rect = line.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    if (!header || !menu || !main || centers.length !== 2) return false;
    const closeLineDelta = Math.hypot(centers[0].x - centers[1].x, centers[0].y - centers[1].y);
    return Number.parseInt(getComputedStyle(header).zIndex, 10) > Number.parseInt(getComputedStyle(menu).zIndex, 10)
      && getComputedStyle(menu).backgroundColor !== 'rgba(0, 0, 0, 0)'
      && main.inert
      && closeLineDelta <= 2.5;
  }, undefined, { timeout: 1600 }).catch(() => undefined);

  const state = await readOpenMenuState(page);
  if (state.headerZ <= state.menuZ) throw new Error(`${name} menu covers its close control (header z=${state.headerZ}, menu z=${state.menuZ})`);
  if (state.menuBackground === 'rgba(0, 0, 0, 0)' || !state.menuBackground) throw new Error(`${name} menu surface stayed transparent (${state.menuBackground || 'missing'})`);
  if (!state.inert) throw new Error(`${name} page stayed focusable behind the open menu`);
  if (state.closeLineDelta > 2.5) throw new Error(`${name} close icon did not settle into a centred X (${state.closeLineDelta.toFixed(2)}px line-centre delta)`);
}

for (const profile of profiles) {
  const browser = await profile.engine.launch({ headless: true });
  const context = await browser.newContext({ ...profile.context, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = collectErrors(page);

  const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  if (!response?.ok()) throw new Error(`${profile.name} homepage returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 10000 });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 4500 });
  await page.waitForTimeout(250);

  if (!await page.locator('.hero__title').isVisible()) throw new Error(`${profile.name} hides the hero after the intro`);
  if (Number(await page.locator('[data-intro-line]').first().evaluate((element) => getComputedStyle(element).opacity)) < 0.8) throw new Error(`${profile.name} did not complete the hero handoff`);
  await assertNoOverflow(page, `${profile.name} hero`);
  await page.screenshot({ path: `${outDir}/${profile.name}-hero.png`, fullPage: false });

  const toggle = page.locator('[data-menu-toggle]');
  if (await toggle.isVisible()) {
    await toggle.click();
    if (await toggle.getAttribute('aria-expanded') !== 'true') throw new Error(`${profile.name} menu did not open`);
    await waitForOpenMenuToSettle(page, profile.name);
    await page.screenshot({ path: `${outDir}/${profile.name}-menu.png`, fullPage: false });
    await toggle.click();
    if (await toggle.getAttribute('aria-expanded') !== 'false') throw new Error(`${profile.name} menu did not close`);
    await page.locator('[data-mobile-menu]').waitFor({ state: 'hidden' });
  } else if (!await page.locator('.site-nav--desktop').isVisible()) {
    throw new Error(`${profile.name} has no usable navigation`);
  }

  const disruptionTop = await page.locator('[data-disruption]').evaluate((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top + window.scrollY;
  });
  // A scrubbed ScrollTrigger is driven by successive scroll frames. A single
  // synthetic jump is not equivalent across browser engines, especially in
  // headless WebKit, so advance it through real frame boundaries and assert
  // the rendered state rather than relying on an arbitrary fixed delay.
  await advanceScrollChoreography(page, disruptionTop + profile.context.viewport.height * 0.82);
  const disruptionOpacity = Number(await page.locator('[data-disruption-two]').evaluate((element) => getComputedStyle(element).opacity));
  if (disruptionOpacity < 0.05) throw new Error(`${profile.name} did not advance the scroll choreography`);

  await page.goto(new URL('/work/catrin/', baseURL).toString(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1100);
  if (!await page.locator('.case-screen').isVisible()) throw new Error(`${profile.name} hides the case-study proof`);
  if (profile.context.viewport.width <= 760) {
    const source = await page.locator('.case-screen').evaluate((image) => image.currentSrc);
    if (!source.includes('mobile')) throw new Error(`${profile.name} did not select mobile art direction`);
  }
  await assertNoOverflow(page, `${profile.name} case study`);
  await page.screenshot({ path: `${outDir}/${profile.name}-catrin.png`, fullPage: false });

  await page.locator('.case-next a').first().click();
  await page.waitForURL('**/#work');
  await page.waitForFunction(() => window.scrollY > 100, undefined, { timeout: 2500 });
  if (await page.locator('[data-cinematic-intro]').count()) throw new Error(`${profile.name} replayed the intro for a direct section target`);

  if (errors.length) throw new Error(`${profile.name} runtime errors:\n${errors.join('\n')}`);
  await context.close();
  await browser.close();
}

console.log(`Cross-browser QA passed for ${profiles.map((profile) => profile.name).join(', ')} at ${baseURL}`);
