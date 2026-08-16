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

const response = await page.goto(new URL('/work/anelika/', baseURL).toString(), { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const back = page.locator('.case-next a').first();
const before = {
  response: response?.status(),
  url: page.url(),
  backHref: await back.getAttribute('href'),
  backText: (await back.innerText()).trim(),
  errors: [...errors],
};

await back.click();
await page.waitForTimeout(1200);
const after = await page.evaluate(() => ({
  url: location.href,
  pathname: location.pathname,
  hash: location.hash,
  scrollY: window.scrollY,
  workTop: document.querySelector('#work')?.getBoundingClientRect().top ?? null,
  mainCount: document.querySelectorAll('main').length,
  h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
  homeIntro: document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') ?? null,
}));
after.errors = [...errors];

await writeFile(`${outDir}/route-tail-state.json`, JSON.stringify({ before, after }, null, 2));
await page.screenshot({ path: `${outDir}/route-tail-state.png`, fullPage: false });
await context.close();
await browser.close();

throw new Error('ROUTE_TAIL_DIAGNOSTIC_COMPLETE');
