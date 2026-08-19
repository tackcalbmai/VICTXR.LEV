import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

const laptopMatrix = [
  ['laptop-1366x640', { width: 1366, height: 640 }],
  ['laptop-1366x768', { width: 1366, height: 768 }],
  ['laptop-1536x864', { width: 1536, height: 864 }],
  ['laptop-1880x890', { width: 1880, height: 890 }],
];

async function openReady(page, path = '/') {
  await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready' || !document.querySelector('[data-home-intro]'));
  await page.waitForTimeout(180);
}

async function assertTextInkInsideViewport(page, selector, name, tolerance = 8) {
  const failures = await page.locator(selector).evaluate((element, tol) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return [...range.getClientRects()]
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .filter((rect) => rect.left < -tol || rect.right > innerWidth + tol)
      .map((rect) => ({
        text: element.textContent?.trim(),
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        viewport: innerWidth,
      }));
  }, tolerance);
  if (failures.length) throw new Error(`${name}: ${selector} clips visible text ink: ${JSON.stringify(failures)}`);
}

async function assertNoHorizontalOverflow(page, name) {
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`${name}: ${overflow}px horizontal overflow`);
}

async function visibleRatio(page, selector) {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
    const visibleHeight = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
    const area = Math.max(rect.width * rect.height, 1);
    return (visibleWidth * visibleHeight) / area;
  });
}

for (const [name, viewport] of laptopMatrix) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  await context.addInitScript(() => sessionStorage.setItem('xoweb:intro-seen', '1'));
  const page = await context.newPage();

  await openReady(page, '/');
  await assertNoHorizontalOverflow(page, `${name} hero`);

  const heroGeometry = await page.evaluate(() => {
    const meta = document.querySelector('.hero__meta')?.getBoundingClientRect();
    const title = document.querySelector('.hero__title')?.getBoundingClientRect();
    const footer = document.querySelector('.hero__footer')?.getBoundingClientRect();
    const pack = (rect) => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height });
    return meta && title && footer ? { meta: pack(meta), title: pack(title), footer: pack(footer) } : null;
  });
  if (!heroGeometry) throw new Error(`${name}: missing hero geometry`);
  if (heroGeometry.title.top < heroGeometry.meta.bottom - 2) throw new Error(`${name}: hero title collides with meta`);
  if (heroGeometry.title.bottom > heroGeometry.footer.top + 2) throw new Error(`${name}: hero title collides with footer`);
  await assertTextInkInsideViewport(page, '.hero__title', `${name} hero`, 4);
  await page.screenshot({ path: `${outDir}/${name}-hero.png`, fullPage: false });

  const disruptionTop = await page.locator('[data-disruption]').evaluate((element) => element.getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), disruptionTop + viewport.height * 0.25);
  await page.waitForTimeout(220);

  const disruptionTwoOpacity = await page.locator('[data-disruption-two]').evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
  if (disruptionTwoOpacity < 0.18) throw new Error(`${name}: second disruption line is not readable during the scene`);
  await assertTextInkInsideViewport(page, '[data-disruption-one]', `${name} disruption one`, 10);
  await assertTextInkInsideViewport(page, '[data-disruption-two]', `${name} disruption two`, 10);
  await page.screenshot({ path: `${outDir}/${name}-disruption.png`, fullPage: false });

  const workTop = await page.locator('.home-v2-work').evaluate((element) => element.getBoundingClientRect().top + scrollY);
  const workTravel = await page.locator('.home-v2-work').evaluate((element) => Math.max(element.getBoundingClientRect().height - innerHeight, 1));
  await page.evaluate(({ top, travel }) => scrollTo({ top: top + travel * 0.22, behavior: 'instant' }), { top: workTop, travel: workTravel });
  await page.waitForTimeout(220);
  const activeProject = await page.locator('.home-v2-work').getAttribute('data-active-project');
  if (activeProject !== 'catrin') throw new Error(`${name}: CATRIN did not take over the first project beat`);
  const catrinOpacity = Number(await page.locator('.home-v2-project--catrin').evaluate((element) => getComputedStyle(element).opacity));
  if (catrinOpacity < 0.7) throw new Error(`${name}: CATRIN is not readable in its takeover beat (${catrinOpacity})`);
  const catrinRatio = await visibleRatio(page, '.home-v2-project--catrin');
  const anelikaRatio = await visibleRatio(page, '.home-v2-project--anelika');
  if (catrinRatio < 0.62 || anelikaRatio < 0.62) {
    throw new Error(`${name}: takeover cards are too large for the viewport (CATRIN ${catrinRatio.toFixed(2)}, ANELIKA ${anelikaRatio.toFixed(2)})`);
  }
  await page.screenshot({ path: `${outDir}/${name}-takeover.png`, fullPage: false });
  await assertNoHorizontalOverflow(page, `${name} after takeover`);

  await context.close();
}

/* Internal pages must also respect the short-desktop class, including Latvian
 * strings, which are often wider than the English equivalents. */
for (const [path, selector, name] of [
  ['/lv/darbi/', '.mp-hero h1', 'laptop-lv-work'],
  ['/lv/par-mani/', '.mp-hero h1', 'laptop-lv-about'],
  ['/lv/pakalpojumi/', '.mp-hero h1', 'laptop-lv-services'],
  ['/lv/kontakti/', '.contact-hero h1', 'laptop-lv-contact'],
]) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 640 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
  await assertTextInkInsideViewport(page, selector, name, 6);
  await assertNoHorizontalOverflow(page, name);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false });
  await context.close();
}

await browser.close();
console.log('Laptop layout QA passed.');
