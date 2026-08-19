import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const viewports = [
  ['user-1857x835', { width: 1857, height: 835 }],
  ['user-1853x865', { width: 1853, height: 865 }],
  ['user-1891x760', { width: 1891, height: 760 }],
  ['common-1366x768', { width: 1366, height: 768 }],
  ['common-1536x864', { width: 1536, height: 864 }],
];

const intersects = (a, b, pad = 0) => !(a.right <= b.left + pad || a.left >= b.right - pad || a.bottom <= b.top + pad || a.top >= b.bottom - pad);

async function openReady(page, path) {
  await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready' || !document.querySelector('[data-home-intro]'), undefined, { timeout: 5000 });
  await page.waitForTimeout(180);
}

async function assertNoHorizontalOverflow(page, name) {
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`${name}: ${overflow}px horizontal overflow`);
}

async function scrollSectionToTop(page, selector) {
  const y = await page.locator(selector).evaluate((el) => el.getBoundingClientRect().top + scrollY);
  await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), y);
  await page.waitForTimeout(220);
}

for (const [viewportName, viewport] of viewports) {
  for (const [path, locale] of [['/', 'en'], ['/lv/', 'lv']]) {
    const name = `${viewportName}-${locale}`;
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    await context.addInitScript(() => sessionStorage.setItem('xoweb:intro-seen', '1'));
    const page = await context.newPage();
    await openReady(page, path);
    await assertNoHorizontalOverflow(page, `${name} initial`);

    const workRange = await page.locator('.home-v2-work').evaluate((element) => ({
      top: element.getBoundingClientRect().top + scrollY,
      travel: Math.max(element.getBoundingClientRect().height - innerHeight, 1),
    }));

    const collectScene = async (progress) => {
      await page.evaluate(({ top, travel, progress }) => scrollTo({ top: top + travel * progress, behavior: 'instant' }), { ...workRange, progress });
      await page.waitForTimeout(220);
      return page.evaluate(() => {
        const toRect = (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
        const section = document.querySelector('.home-v2-work');
        const active = section?.getAttribute('data-active-project');
        const project = active ? document.querySelector(`.home-v2-project--${active}`) : null;
        const media = project?.querySelector('picture')?.getBoundingClientRect();
        const summary = project?.querySelector('.home-v2-project__summary')?.getBoundingClientRect();
        const logic = project?.querySelector('.home-v2-project__logic')?.getBoundingClientRect();
        const footer = document.querySelector('.home-v2-work__bottom')?.getBoundingClientRect();
        const spans = [...document.querySelectorAll('.home-v2-work__title span')].map((el) => ({ count: el.getClientRects().length, ...toRect(el.getBoundingClientRect()) }));
        return media && summary && logic && footer ? {
          active,
          media: toRect(media),
          summary: toRect(summary),
          logic: toRect(logic),
          footer: toRect(footer),
          spans,
          vh: innerHeight,
          vw: innerWidth,
        } : null;
      });
    };

    for (const [progress, expected] of [[0.22, 'catrin'], [0.72, 'anelika']]) {
      const scene = await collectScene(progress);
      if (!scene) throw new Error(`${name}: missing ${expected} takeover geometry`);
      if (scene.active !== expected) throw new Error(`${name}: expected ${expected} at ${progress}, got ${scene.active}`);
      if (scene.spans.some((span) => span.count !== 1)) throw new Error(`${name}: work title wraps inside an authored line: ${JSON.stringify(scene.spans)}`);
      if (scene.media.left < -8 || scene.media.right > scene.vw + 8 || scene.media.top < -8 || scene.media.bottom > scene.vh + 8) throw new Error(`${name}: ${expected} media escapes viewport: ${JSON.stringify(scene.media)}`);
      if (intersects(scene.media, scene.summary, 4) || intersects(scene.media, scene.logic, 4)) throw new Error(`${name}: ${expected} proof copy collides with media`);
      if (intersects(scene.footer, scene.media, 2) || scene.footer.bottom > scene.vh + 3) throw new Error(`${name}: ${expected} media/footer composition is unstable`);
      await page.screenshot({ path: `${outDir}/${name}-work-${expected}.png`, fullPage: false });
    }
    await assertNoHorizontalOverflow(page, `${name} work`);

    await scrollSectionToTop(page, '.home-v2-perspective');
    const perspective = await page.evaluate(() => {
      const toRect = (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
      const title = document.querySelector('.home-v2-perspective h2')?.getBoundingClientRect();
      const bottom = document.querySelector('.home-v2-perspective__bottom')?.getBoundingClientRect();
      const section = document.querySelector('.home-v2-perspective')?.getBoundingClientRect();
      const spans = [...document.querySelectorAll('.home-v2-perspective h2 span')].map((el) => ({ count: el.getClientRects().length, ...toRect(el.getBoundingClientRect()) }));
      return title && bottom && section ? { title: toRect(title), bottom: toRect(bottom), section: toRect(section), spans, vh: innerHeight, vw: innerWidth } : null;
    });
    if (!perspective) throw new Error(`${name}: missing perspective geometry`);
    if (perspective.spans.some((span) => span.count !== 1)) throw new Error(`${name}: perspective authored line wraps: ${JSON.stringify(perspective.spans)}`);
    if (perspective.title.bottom > perspective.bottom.top + 2) throw new Error(`${name}: perspective title collides with explanatory content`);
    const perspectiveTextBottom = Math.max(...perspective.spans.map((span) => span.bottom));
    if (perspective.bottom.top - perspectiveTextBottom < 14) throw new Error(`${name}: perspective display has insufficient visible breathing room before supporting copy: ${JSON.stringify(perspective)}`);
    if (perspective.bottom.bottom > perspective.vh + 3) throw new Error(`${name}: perspective explanation/links are below the initial viewport: ${JSON.stringify(perspective)}`);
    if (perspective.spans.some((span) => span.left < -8 || span.right > perspective.vw + 8)) throw new Error(`${name}: perspective title clips horizontally: ${JSON.stringify(perspective.spans)}`);
    await assertNoHorizontalOverflow(page, `${name} perspective`);
    await page.screenshot({ path: `${outDir}/${name}-perspective.png`, fullPage: false });

    await context.close();
  }
}

await browser.close();
console.log('Short desktop composition QA passed.');
