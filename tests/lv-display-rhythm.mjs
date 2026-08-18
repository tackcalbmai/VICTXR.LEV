import { chromium } from 'playwright';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openReadyPage(page, path) {
  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
  assert(response?.ok(), `${path} returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
  if (path === '/lv/') {
    await page.waitForFunction(
      () => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready',
      undefined,
      { timeout: 9000 },
    );
  }
}

async function assertDenseLeading(page, selector, label) {
  const nodes = page.locator(selector);
  const count = await nodes.count();
  assert(count > 0, `${label} is missing`);

  for (let index = 0; index < count; index += 1) {
    const result = await nodes.nth(index).evaluate((element) => {
      const style = getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize);
      const lineHeight = Number.parseFloat(style.lineHeight);
      return {
        text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        ratio: lineHeight / fontSize,
      };
    });

    assert(result.ratio >= 0.79, `${label} is too tight (${result.ratio.toFixed(3)}) in “${result.text}”`);
    assert(result.ratio <= 0.855, `${label} is too open (${result.ratio.toFixed(3)}) in “${result.text}”`);
  }
}

async function assertServiceDividerClearance(page, label) {
  const rows = page.locator('.service-decision__head');
  const count = await rows.count();
  assert(count === 6, `${label} expected 6 service rows, found ${count}`);

  for (let index = 0; index < count; index += 1) {
    const geometry = await rows.nth(index).evaluate((head) => {
      const title = head.querySelector('h2');
      if (!title) return null;
      const headRect = head.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      return {
        text: title.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        top: titleRect.top - headRect.top,
        bottom: headRect.bottom - titleRect.bottom,
      };
    });

    assert(geometry, `${label} service row ${index + 1} has no title`);
    assert(geometry.top >= 12, `${label} divider is too close above “${geometry.text}” (${geometry.top.toFixed(1)}px)`);
    assert(geometry.bottom >= 12, `${label} divider is too close below “${geometry.text}” (${geometry.bottom.toFixed(1)}px)`);
  }
}

const routes = [
  {
    path: '/lv/',
    selectors: [
      '.hero__title',
      '.home-v2-work__title',
      '.home-v2-capabilities__head h2',
      '.home-v2-capability h3',
      '.home-v2-perspective h2',
      '.home-v2-close h2',
    ],
  },
  {
    path: '/lv/darbi/',
    selectors: ['.mp-hero h1', '.mp-closing h2', '.page-contact-cta h2'],
  },
  {
    path: '/lv/par-mani/',
    selectors: ['.mp-hero h1', '.about-definition h2', '.about-principle h2', '.about-standard h2', '.page-contact-cta h2'],
  },
  {
    path: '/lv/pakalpojumi/',
    selectors: ['.mp-hero h1', '.service-decision__head h2', '.services-anti h2', '.services-process h2', '.page-contact-cta h2'],
    serviceClearance: true,
  },
  {
    path: '/lv/kontakti/',
    selectors: ['.contact-hero h1', '.contact-intents__heading h2', '.contact-intent__title', '.contact-talk__heading h2', '.contact-brief__head h2'],
  },
  {
    path: '/lv/darbi/catrin/',
    selectors: ['.page-contact-cta h2'],
  },
  {
    path: '/lv/darbi/anelika/',
    selectors: ['.page-contact-cta h2'],
  },
];

const profiles = [
  { name: 'desktop', viewport: { width: 1366, height: 768 } },
  { name: 'tablet', viewport: { width: 768, height: 1024 } },
  { name: 'mobile', viewport: { width: 393, height: 852 } },
];

for (const profile of profiles) {
  const context = await browser.newContext({ viewport: profile.viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();

  for (const route of routes) {
    await openReadyPage(page, route.path);
    for (const selector of route.selectors) {
      await assertDenseLeading(page, selector, `${profile.name} ${route.path} ${selector}`);
    }
    if (route.serviceClearance) await assertServiceDividerClearance(page, `${profile.name} ${route.path}`);
  }

  await context.close();
}

await browser.close();
console.log('Latvian display rhythm QA passed across every LV route on desktop, tablet and mobile.');
