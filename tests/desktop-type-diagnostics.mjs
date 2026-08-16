import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const report = [];
const viewports = [
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

async function open(page, path) {
  await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  if (path === '/' || path === '/lv/') {
    await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 9000 });
  }
}

async function inspect(page, selector, group, locale, viewport, path) {
  const nodes = page.locator(selector);
  const count = await nodes.count();
  if (!count) {
    report.push({ group, locale, viewport: viewport.width, path, selector, missing: true });
    return;
  }
  for (let index = 0; index < count; index += 1) {
    const data = await nodes.nth(index).evaluate((element) => {
      const style = getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize);
      const lineHeight = Number.parseFloat(style.lineHeight);
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      });
      const rects = [];
      let textNode = walker.nextNode();
      while (textNode) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        for (const rect of range.getClientRects()) {
          if (rect.width > 1 && rect.height > 1) rects.push({ left: rect.left, right: rect.right, width: rect.width });
        }
        textNode = walker.nextNode();
      }
      return {
        text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        fontSize,
        lineHeight,
        ratio: lineHeight / fontSize,
        viewportWidth: innerWidth,
        rects,
      };
    });
    report.push({ group, locale, viewport: viewport.width, path, selector, index, ...data });
  }
}

for (const viewport of viewports) {
  for (const locale of ['en', 'lv']) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();

    const home = locale === 'lv' ? '/lv/' : '/';
    await open(page, home);
    await inspect(page, '.hero__title, .disruption__line, .home-v2-work__title, .home-v2-perspective h2, .home-v2-close h2', 'home', locale, viewport, home);

    const contact = locale === 'lv' ? '/lv/kontakti/' : '/contact/';
    await open(page, contact);
    await inspect(page, '.contact-hero h1, .contact-intent__title, .contact-talk__heading h2, .contact-brief__head h2', 'contact', locale, viewport, contact);

    for (const project of ['catrin', 'anelika']) {
      const path = locale === 'lv' ? `/lv/darbi/${project}/` : `/work/${project}/`;
      await open(page, path);
      await inspect(page, '.case-hero h1, .case-narrative__row h2, .case-result p, .page-contact-cta h2', `case-${project}`, locale, viewport, path);
    }

    await context.close();
  }
}

await browser.close();

const failures = report.filter((item) => {
  if (item.missing) return true;
  const clipping = item.rects?.some((rect) => rect.left < -3 || rect.right > item.viewportWidth + 3);
  return clipping || !Number.isFinite(item.ratio);
});

await writeFile(`${outDir}/desktop-type-diagnostics.json`, JSON.stringify({ failures, report }, null, 2));
console.log(`Desktop typography diagnostics captured ${report.length} measurements; ${failures.length} clipping/missing candidates.`);
