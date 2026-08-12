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

for (const profile of profiles) {
  const browser = await profile.engine.launch({ headless: true });
  const context = await browser.newContext({ ...profile.context, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = collectErrors(page);

  const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  if (!response?.ok()) throw new Error(`${profile.name} homepage returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 10000 });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 3500 });
  await page.waitForTimeout(250);

  if (!await page.locator('.hero__title').isVisible()) throw new Error(`${profile.name} hides the hero after the intro`);
  if (Number(await page.locator('[data-intro-line]').first().evaluate((element) => getComputedStyle(element).opacity)) < 0.8) throw new Error(`${profile.name} did not complete the hero handoff`);
  await assertNoOverflow(page, `${profile.name} hero`);
  await page.screenshot({ path: `${outDir}/${profile.name}-hero.png`, fullPage: false });

  const toggle = page.locator('[data-menu-toggle]');
  if (await toggle.isVisible()) {
    await toggle.click();
    if (await toggle.getAttribute('aria-expanded') !== 'true') throw new Error(`${profile.name} menu did not open`);
    await page.waitForTimeout(540);
    const state = await page.evaluate(() => {
      const centers = [...document.querySelectorAll('[data-menu-toggle] i')].map((line) => {
        const rect = line.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
      return {
        headerZ: Number.parseInt(getComputedStyle(document.querySelector('[data-site-header]')).zIndex, 10),
        menuZ: Number.parseInt(getComputedStyle(document.querySelector('[data-mobile-menu]')).zIndex, 10),
        menuBackground: getComputedStyle(document.querySelector('[data-mobile-menu]')).backgroundColor,
        inert: document.querySelector('main').inert,
        closeLinesMeet: centers.length === 2 && Math.hypot(centers[0].x - centers[1].x, centers[0].y - centers[1].y) <= 1.5,
      };
    });
    if (state.headerZ <= state.menuZ || state.menuBackground === 'rgba(0, 0, 0, 0)' || !state.inert || !state.closeLinesMeet) throw new Error(`${profile.name} menu layering, surface, close control or focus isolation failed`);
    await page.screenshot({ path: `${outDir}/${profile.name}-menu.png`, fullPage: false });
    await toggle.click();
    if (await toggle.getAttribute('aria-expanded') !== 'false') throw new Error(`${profile.name} menu did not close`);
    await page.locator('[data-mobile-menu]').waitFor({ state: 'hidden' });
  } else if (!await page.locator('.site-nav--desktop').isVisible()) {
    throw new Error(`${profile.name} has no usable navigation`);
  }

  await page.evaluate(() => {
    const section = document.querySelector('[data-disruption]');
    window.scrollTo(0, section.offsetTop + innerHeight * 0.85);
  });
  // ScrollTrigger uses a scrubbed timeline; allow every engine one animation
  // frame budget plus the scrub interpolation before judging the state.
  await page.waitForTimeout(900);
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
