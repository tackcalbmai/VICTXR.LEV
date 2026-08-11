import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function capture(name, contextOptions) {
  const context = await browser.newContext({
    ...contextOptions,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

  await page.screenshot({ path: `${outDir}/${name}-hero.png`, fullPage: false });
  await page.screenshot({ path: `${outDir}/${name}-full.png`, fullPage: true });

  await page.locator('[data-disruption]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${outDir}/${name}-disruption.png`, fullPage: false });

  await page.locator('[data-catrin]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/${name}-catrin.png`, fullPage: false });

  if (consoleErrors.length) {
    throw new Error(`${name} browser errors:\n${consoleErrors.join('\n')}`);
  }

  await context.close();
}

await capture('desktop', { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await capture('mobile', { ...devices['iPhone 15 Pro'], viewport: { width: 393, height: 852 } });

await browser.close();
console.log(`Visual QA captured from ${baseURL}`);
