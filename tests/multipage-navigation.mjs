import { chromium } from 'playwright';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const cases = [
  {
    home: '/',
    lang: 'en',
    nav: ['/work/', '/about/', '/services/'],
    casePath: '/work/catrin/',
    work: '/work/',
  },
  {
    home: '/lv/',
    lang: 'lv',
    nav: ['/lv/darbi/', '/lv/par-mani/', '/lv/pakalpojumi/'],
    casePath: '/lv/darbi/catrin/',
    work: '/lv/darbi/',
  },
];

for (const current of cases) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const page = await context.newPage();

  let response = await page.goto(new URL(current.home, baseURL).toString(), { waitUntil: 'load' });
  assert(response?.ok(), `${current.home} returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready',
    undefined,
    { timeout: 9000 },
  );
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 3000 }).catch(() => {});

  const homeNav = await page.locator('.site-header .site-nav--desktop > a').evaluateAll((links) => links.slice(0, 3).map((link) => link.getAttribute('href')));
  assert(JSON.stringify(homeNav) === JSON.stringify(current.nav), `${current.lang} homepage header still uses old anchor navigation: ${homeNav.join(', ')}`);

  const heroActionLinks = page.locator('main .hero .hero__actions > a');
  assert(await heroActionLinks.count() === 2, `${current.lang} homepage should expose exactly two real hero actions`);
  const heroActions = await heroActionLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  assert(heroActions[0] === '#work' && heroActions[1] === '#contact', `${current.lang} homepage hero journey should remain local: ${heroActions.join(', ')}`);

  response = await page.goto(new URL(current.casePath, baseURL).toString(), { waitUntil: 'load' });
  assert(response?.ok(), `${current.casePath} returned ${response?.status()}`);
  const caseNav = await page.locator('.site-header .site-nav--desktop > a').evaluateAll((links) => links.slice(0, 3).map((link) => link.getAttribute('href')));
  assert(JSON.stringify(caseNav) === JSON.stringify(current.nav), `${current.lang} case header is not connected to multi-page navigation`);
  const caseBack = await page.locator('.case-next a').first().getAttribute('href');
  assert(caseBack === current.work, `${current.lang} case back link should return to ${current.work}, got ${caseBack}`);

  await page.close();
  await context.close();
}

await browser.close();
console.log('Multi-page navigation QA passed: homepage headers, case headers and case back-links use real pages while the homepage hero journey remains local.');
