import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const viewports = [
  ['desktop-1440x900', { width: 1440, height: 900 }],
  ['laptop-1366x768', { width: 1366, height: 768 }],
  ['tablet-1024x768', { width: 1024, height: 768 }],
  ['mobile-393x852', { width: 393, height: 852 }],
];

const routes = ['/', '/work/', '/about/', '/services/', '/contact/', '/work/catrin/', '/work/anelika/'];

async function openReady(page, path) {
  await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready' || !document.querySelector('[data-home-intro]'), undefined, { timeout: 6000 });
  await page.waitForTimeout(220);
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`${label}: ${overflow}px horizontal overflow`);
}

async function scrollTop(page, selector) {
  const y = await page.locator(selector).evaluate((el) => el.getBoundingClientRect().top + scrollY);
  await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), y);
  await page.waitForTimeout(180);
}

for (const [viewportName, viewport] of viewports) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript(() => sessionStorage.setItem('xoweb:intro-seen', '1'));

  for (const path of routes) {
    const page = await context.newPage();
    await openReady(page, path);
    await assertNoOverflow(page, `${viewportName} ${path}`);

    const heroSelector = path === '/' ? '.hero' : path === '/contact/' ? '.contact-hero' : path.startsWith('/work/') && path !== '/work/' ? '.case-hero' : '.mp-hero';
    const hero = page.locator(heroSelector);
    if (await hero.count()) {
      const box = await hero.boundingBox();
      if (!box) throw new Error(`${viewportName} ${path}: hero missing geometry`);
      const maxHero = viewport.height * (viewport.width <= 760 ? 0.9 : 0.96);
      if (box.height > maxHero + 4) throw new Error(`${viewportName} ${path}: hero remains too tall (${box.height}px > ${maxHero}px)`);
    }

    await page.screenshot({ path: `${outDir}/density-${viewportName}-${path.replaceAll('/', '-') || 'home'}-top.png`, fullPage: false });

    if (path === '/') {
      await scrollTop(page, '.home-v2-work');
      const work = await page.evaluate(() => {
        const toRect = (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
        const title = document.querySelector('.home-v2-work__title')?.getBoundingClientRect();
        const catrin = document.querySelector('.home-v2-project--catrin')?.getBoundingClientRect();
        const anelika = document.querySelector('.home-v2-project--anelika')?.getBoundingClientRect();
        return title && catrin && anelika ? { title: toRect(title), catrin: toRect(catrin), anelika: toRect(anelika) } : null;
      });
      if (!work) throw new Error(`${viewportName}: missing Home Work geometry`);
      if (viewport.width > 760) {
        const titleBottom = work.title.bottom;
        const mediaTop = Math.min(work.catrin.top, work.anelika.top);
        if (mediaTop - titleBottom < 8) throw new Error(`${viewportName}: Work media crowds title (${mediaTop - titleBottom}px)`);
      }
      await page.screenshot({ path: `${outDir}/density-${viewportName}-home-work.png`, fullPage: false });

      await scrollTop(page, '.home-v2-perspective');
      const perspective = await page.evaluate(() => {
        const toRect = (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
        const spans = [...document.querySelectorAll('.home-v2-perspective h2 span')].map((el) => toRect(el.getBoundingClientRect()));
        const bottom = document.querySelector('.home-v2-perspective__bottom')?.getBoundingClientRect();
        return bottom && spans.length ? { spans, bottom: toRect(bottom) } : null;
      });
      if (!perspective) throw new Error(`${viewportName}: missing Perspective geometry`);
      const visibleTextBottom = Math.max(...perspective.spans.map((span) => span.bottom));
      if (perspective.bottom.top - visibleTextBottom < 10) throw new Error(`${viewportName}: Perspective lacks breathing room (${perspective.bottom.top - visibleTextBottom}px)`);
      await page.screenshot({ path: `${outDir}/density-${viewportName}-home-perspective.png`, fullPage: false });
    }

    if (path === '/contact/') {
      await scrollTop(page, '.contact-intents');
      const intents = await page.locator('.contact-intent').evaluateAll((nodes) => {
        const toRect = (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
        return nodes.map((node) => toRect(node.getBoundingClientRect()));
      });
      if (intents.length !== 3) throw new Error(`${viewportName}: expected three contact intents`);
      if (viewport.width > 1050) {
        if (Math.max(...intents.map((item) => item.top)) - Math.min(...intents.map((item) => item.top)) > 2) throw new Error(`${viewportName}: contact intents are not visible together`);
        if (intents.some((item) => item.height > viewport.height * 0.4)) throw new Error(`${viewportName}: contact intent card is too tall`);
      }
      await page.screenshot({ path: `${outDir}/density-${viewportName}-contact-intents.png`, fullPage: false });

      await scrollTop(page, '.contact-talk');
      const primaryHeight = await page.locator('.contact-talk__primary').evaluate((el) => el.getBoundingClientRect().height);
      if (primaryHeight > Math.max(150, viewport.height * 0.22)) throw new Error(`${viewportName}: primary contact action is too tall (${primaryHeight}px)`);
      await page.screenshot({ path: `${outDir}/density-${viewportName}-contact-talk.png`, fullPage: false });

      await scrollTop(page, '.contact-brief');
      const brief = await page.evaluate(() => {
        const toRect = (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
        const rows = [...document.querySelectorAll('.contact-brief__row')].map((el) => toRect(el.getBoundingClientRect()));
        const controls = [...document.querySelectorAll('.contact-brief__actions > a, .contact-brief__actions > button')].map((el) => toRect(el.getBoundingClientRect()));
        return { rows, controls };
      });
      if (brief.controls.some((item) => item.height > 72)) throw new Error(`${viewportName}: brief action exceeds 72px`);
      if (viewport.width > 1050 && (Math.abs(brief.rows[0].top - brief.rows[1].top) > 2 || Math.abs(brief.rows[2].top - brief.rows[3].top) > 2)) {
        throw new Error(`${viewportName}: desktop brief is not using the compact two-column layout`);
      }
      if (viewport.width <= 760 && brief.rows.some((item) => item.width < viewport.width * 0.82)) throw new Error(`${viewportName}: mobile brief fields became unnecessarily narrow`);
      await page.screenshot({ path: `${outDir}/density-${viewportName}-contact-brief.png`, fullPage: false });
    }

    await page.close();
  }

  await context.close();
}

for (const [path, label] of [['/lv/', 'home-lv'], ['/lv/kontakti/', 'contact-lv']]) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => sessionStorage.setItem('xoweb:intro-seen', '1'));
  const page = await context.newPage();
  await openReady(page, path);
  await assertNoOverflow(page, label);
  const selector = path === '/lv/' ? '.home-v2-perspective' : '.contact-intents';
  await scrollTop(page, selector);
  await page.screenshot({ path: `${outDir}/density-${label}-1366x768.png`, fullPage: false });
  await context.close();
}

await browser.close();
console.log('Experience density QA passed across desktop, laptop, tablet and mobile.');
