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
    nav: ['/work/', '/about/', '/services/', '/contact/'],
    casePath: '/work/catrin/',
    caseBack: '/work/#work',
  },
  {
    home: '/lv/',
    lang: 'lv',
    nav: ['/lv/darbi/', '/lv/par-mani/', '/lv/pakalpojumi/', '/lv/kontakti/'],
    casePath: '/lv/darbi/catrin/',
    caseBack: '/lv/darbi/#work',
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

  const homeNav = await page.locator('.site-header .site-nav--desktop > a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  assert(JSON.stringify(homeNav) === JSON.stringify(current.nav), `${current.lang} homepage header should use the four real page routes: ${homeNav.join(', ')}`);

  const workHref = await page.locator('main .hero a[data-analytics-event="view_work_click"]').getAttribute('href');
  const startHref = await page.locator('main .hero a[data-analytics-event="start_project_click"]').getAttribute('href');
  assert(workHref === current.nav[0], `${current.lang} homepage Work CTA should route to ${current.nav[0]}, got ${workHref}`);
  assert(startHref === current.nav[3], `${current.lang} homepage Start project CTA should route to ${current.nav[3]}, got ${startHref}`);

  response = await page.goto(new URL(current.nav[3], baseURL).toString(), { waitUntil: 'load' });
  assert(response?.ok(), `${current.nav[3]} returned ${response?.status()}`);
  const contactNav = await page.locator('.site-header .site-nav--desktop > a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  assert(JSON.stringify(contactNav) === JSON.stringify(current.nav), `${current.lang} contact header is not connected to the full multi-page navigation`);

  response = await page.goto(new URL(current.casePath, baseURL).toString(), { waitUntil: 'load' });
  assert(response?.ok(), `${current.casePath} returned ${response?.status()}`);
  const caseNav = await page.locator('.site-header .site-nav--desktop > a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  assert(JSON.stringify(caseNav) === JSON.stringify(current.nav), `${current.lang} case header is not connected to multi-page navigation`);
  const caseBack = await page.locator('.case-next a').first().getAttribute('href');
  assert(caseBack === current.caseBack, `${current.lang} case back link should return to the Work exhibition at ${current.caseBack}, got ${caseBack}`);

  await page.close();
  await context.close();
}

await browser.close();
console.log('Multi-page navigation QA passed: Home, Contact and cases use the full route architecture, and cases return to the Work exhibition.');
