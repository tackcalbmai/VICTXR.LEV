import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

const state = {};

errors.length = 0;
let response = await page.goto(new URL('/this-page-does-not-exist/', baseURL).toString(), { waitUntil: 'domcontentloaded' });
state.notFoundEn = {
  status: response?.status(),
  url: page.url(),
  notFoundCount: await page.locator('.not-found').count(),
  lang: await page.locator('html').getAttribute('lang'),
  title: await page.title(),
  errors: [...errors],
};

errors.length = 0;
response = await page.goto(new URL('/lv/this-page-does-not-exist/', baseURL).toString(), { waitUntil: 'domcontentloaded' });
state.notFoundLv = {
  status: response?.status(),
  url: page.url(),
  notFoundCount: await page.locator('.not-found').count(),
  lang: await page.locator('html').getAttribute('lang'),
  title: await page.title(),
  errors: [...errors],
};

errors.length = 0;
response = await page.goto(new URL('/work/anelika/', baseURL).toString(), { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const back = page.locator('.case-next a').first();
state.backBefore = {
  status: response?.status(),
  url: page.url(),
  href: await back.getAttribute('href'),
  text: (await back.innerText()).trim(),
  errors: [...errors],
};

let clickError = null;
try {
  await back.click();
  await page.waitForURL('**/work/#work', { timeout: 5000 });
} catch (error) {
  clickError = error instanceof Error ? error.message : String(error);
}
await page.waitForTimeout(1000);
state.backAfter = await page.evaluate(() => ({
  url: location.href,
  pathname: location.pathname,
  hash: location.hash,
  scrollY: window.scrollY,
  workTop: document.querySelector('#work')?.getBoundingClientRect().top ?? null,
  mainCount: document.querySelectorAll('main').length,
  h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
}));
state.backAfter.clickError = clickError;
state.backAfter.errors = [...errors];

await writeFile(`${outDir}/route-tail-state.json`, JSON.stringify(state, null, 2));
await page.screenshot({ path: `${outDir}/route-tail-state.png`, fullPage: false });
await context.close();
await browser.close();

throw new Error('ROUTE_TAIL_DIAGNOSTIC_COMPLETE');
