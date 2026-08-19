import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });

async function inspectTrust(path, name, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'load' });
  assert(response?.ok(), `${name} returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);

  const ledger = page.locator('.trust-ledger');
  assert(await ledger.count() === 1, `${name} should expose one trust ledger`);
  assert(await ledger.locator('.trust-ledger__item').count() === 4, `${name} should expose four evidence items`);
  assert(await ledger.locator('.trust-ledger__live a').count() === 2, `${name} should expose two live project links`);

  const geometry = await ledger.evaluate((element) => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    top: element.getBoundingClientRect().top,
    height: element.getBoundingClientRect().height,
  }));
  assert(geometry.documentWidth - geometry.viewportWidth <= 2, `${name} has horizontal overflow`);
  assert(geometry.height > 400, `${name} trust ledger collapsed`);
  assert(!errors.length, `${name} browser errors: ${errors.join(' | ')}`);
  await context.close();
}

async function inspectCase(path, name, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'load' });
  assert(response?.ok(), `${name} returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);

  assert(await page.locator('.case-proof__item').count() === 4, `${name} should expose four verified facts`);
  assert(await page.locator('.case-decision__option').count() === 2, `${name} should expose rejected and chosen directions`);
  assert(await page.locator('[data-case-stage]').count() === 6, `${name} should expose six reasoning stages`);
  assert(await page.locator('[data-case-stage-link]').count() === 6, `${name} should expose six stage controls`);

  const decision = page.locator('.case-decision');
  await decision.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${outDir}/${name}-decision.png`, fullPage: false });

  await page.locator('[data-case-stage="4"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  const active = await page.locator('[data-case-stage-link].is-active').getAttribute('data-case-stage-link');
  assert(active, `${name} stage rail never selected a stage`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 2, `${name} has ${overflow}px horizontal overflow`);
  await context.close();
}

for (const [path, name] of [['/', 'aaa-home-en'], ['/lv/', 'aaa-home-lv'], ['/work/', 'aaa-work-en'], ['/lv/darbi/', 'aaa-work-lv']]) {
  await inspectTrust(path, name, { width: 1366, height: 768 });
}

await inspectTrust('/lv/', 'aaa-home-lv-mobile', { width: 393, height: 852 });
await inspectCase('/work/catrin/', 'aaa-catrin-en', { width: 1366, height: 768 });
await inspectCase('/lv/darbi/catrin/', 'aaa-catrin-lv-mobile', { width: 393, height: 852 });
await inspectCase('/work/anelika/', 'aaa-anelika-en', { width: 1366, height: 768 });
await inspectCase('/lv/darbi/anelika/', 'aaa-anelika-lv-mobile', { width: 393, height: 852 });

for (const [path, name] of [['/services/', 'services-en'], ['/lv/pakalpojumi/', 'services-lv']]) {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'load' });
  const callsToAction = page.locator('.service-decision__cta');
  assert(await callsToAction.count() === 6, `${name} should expose one contextual contact route per service`);
  const hrefs = await callsToAction.evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  assert(hrefs.every((href) => href.includes('intent=') && href.includes('#talk')), `${name} service routes are missing contact intent context`);
  assert(await page.locator('html[data-analytics-ready="true"]').count() === 1, `${name} analytics hooks did not initialize`);
  await context.close();
}

await browser.close();
console.log('AAA experience QA passed: evidence ledger, six-stage case direction, service routing, analytics hooks and EN/LV responsive geometry are intact.');
