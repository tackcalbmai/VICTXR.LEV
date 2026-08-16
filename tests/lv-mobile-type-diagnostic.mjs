import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

const response = await page.goto(new URL('/lv/', baseURL).toString(), { waitUntil: 'domcontentloaded' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 9000 });
await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 3000 }).catch(() => {});

const selectors = [
  ['hero', '.hero__line-inner'],
  ['disruption', '.disruption__line'],
  ['work', '.home-v2-work__title'],
  ['perspective', '.home-v2-perspective h2'],
  ['close', '.home-v2-close h2'],
];

const state = await page.evaluate((selectors) => {
  const metric = (element) => {
    const style = getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize);
    const lineHeight = Number.parseFloat(style.lineHeight);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) { return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; },
    });
    const rects = [];
    let node = walker.nextNode();
    while (node) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width > 1 && rect.height > 1) rects.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
      }
      node = walker.nextNode();
    }
    return {
      text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      fontSize,
      lineHeight,
      ratio: lineHeight / fontSize,
      left: rects.length ? Math.min(...rects.map((rect) => rect.left)) : null,
      right: rects.length ? Math.max(...rects.map((rect) => rect.right)) : null,
      viewport: document.documentElement.clientWidth,
    };
  };

  const output = {
    lang: document.documentElement.lang,
    heroText: [...document.querySelectorAll('[data-intro-line]')].map((node) => node.textContent?.trim()).join(' '),
    fontCheck: document.fonts.check('790 72px Onest', 'Ā Ē Ī Ņ Ķ Ļ Š Ž ā ē ī ņ ķ ļ š ž'),
    citadi: metric(document.querySelector('.hero__line-inner:nth-of-type(1)') ?? document.querySelectorAll('.hero__line-inner')[2]),
    groups: {},
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
  };
  const citadiElement = document.querySelectorAll('.hero__line-inner')[2];
  output.citadi = metric(citadiElement);
  output.citadi.startRatio = output.citadi.left / output.citadi.viewport;
  for (const [name, selector] of selectors) {
    output.groups[name] = [...document.querySelectorAll(selector)].map(metric);
  }
  return output;
}, selectors);
state.responseStatus = response?.status() ?? null;
state.runtimeErrors = errors;

await writeFile(`${outDir}/lv-mobile-type-state.json`, JSON.stringify(state, null, 2));
await page.screenshot({ path: `${outDir}/lv-mobile-type-state.png`, fullPage: false });
await context.close();
await browser.close();
throw new Error('LV_MOBILE_TYPE_DIAGNOSTIC_COMPLETE');
