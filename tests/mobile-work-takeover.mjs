import { chromium } from 'playwright';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function box(page, selector) {
  const value = await page.locator(selector).first().boundingBox();
  assert(value, `${selector} has no measurable geometry`);
  return value;
}

async function check(path, locale, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
  assert(response?.ok(), `${locale} ${viewport.width}px returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 2500 });

  const work = page.locator('.home-v2-work');
  await work.scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);

  const stickyPosition = await page.locator('.home-v2-work__sticky').evaluate((element) => getComputedStyle(element).position);
  assert(stickyPosition !== 'sticky', `${locale} ${viewport.width}px still uses the desktop sticky takeover on mobile`);

  const labelPosition = await page.locator('.home-v2-project__label').first().evaluate((element) => getComputedStyle(element).position);
  assert(labelPosition === 'static', `${locale} ${viewport.width}px project label still overlays the screenshot`);

  const title = await box(page, '.home-v2-work__title');
  const first = await box(page, '.home-v2-project--catrin');
  const second = await box(page, '.home-v2-project--anelika');
  const bottom = await box(page, '.home-v2-work__bottom');
  const minimumGap = 18;

  assert(title.y + title.height + minimumGap <= first.y, `${locale} ${viewport.width}px title overlaps CATRIN`);
  assert(first.y + first.height + minimumGap <= second.y, `${locale} ${viewport.width}px CATRIN overlaps ANELIKA`);
  assert(second.y + second.height + minimumGap <= bottom.y, `${locale} ${viewport.width}px ANELIKA overlaps the explanatory copy`);

  for (const selector of ['.home-v2-project--catrin picture', '.home-v2-project--anelika picture']) {
    const frame = await box(page, selector);
    assert(frame.width > 0 && frame.height > 0, `${locale} ${viewport.width}px ${selector} collapsed`);
    const ratio = frame.width / frame.height;
    assert(ratio > 1.25 && ratio < 1.45, `${locale} ${viewport.width}px ${selector} is not a controlled 4:3 viewport (${ratio.toFixed(2)})`);
  }

  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  assert(overflow <= 2, `${locale} ${viewport.width}px takeover creates ${overflow}px horizontal overflow`);

  await context.close();
}

for (const viewport of [{ width: 320, height: 700 }, { width: 393, height: 852 }, { width: 430, height: 932 }]) {
  await check('/', 'EN', viewport);
  await check('/lv/', 'LV', viewport);
}

await browser.close();
console.log('Mobile Selected Work stays separated: title, CATRIN, ANELIKA and copy never share the same visual layer in EN or LV.');
