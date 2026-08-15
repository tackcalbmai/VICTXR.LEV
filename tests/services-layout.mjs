import { chromium } from 'playwright';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openReady(page, path) {
  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
  assert(response?.ok(), `${path} returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 9000 });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 3000 }).catch(() => {});
}

async function rect(locator) {
  const box = await locator.boundingBox();
  assert(box, 'Could not measure service element');
  return {
    left: box.x,
    right: box.x + box.width,
    top: box.y,
    bottom: box.y + box.height,
    width: box.width,
    height: box.height,
  };
}

function overlaps(a, b, tolerance = 1) {
  return !(
    a.right <= b.left + tolerance ||
    b.right <= a.left + tolerance ||
    a.bottom <= b.top + tolerance ||
    b.bottom <= a.top + tolerance
  );
}

const profiles = [
  { name: 'desktop', viewport: { width: 1366, height: 768 } },
  { name: 'tablet', viewport: { width: 768, height: 1024 } },
  { name: 'mobile', viewport: { width: 393, height: 852 } },
];

for (const path of ['/', '/lv/']) {
  for (const profile of profiles) {
    const context = await browser.newContext({ viewport: profile.viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await openReady(page, path);

    const rows = page.locator('.services__list .service-row');
    const count = await rows.count();
    assert(count >= 5, `${path} ${profile.name} is missing service rows`);

    for (let index = 0; index < count; index += 1) {
      const row = rows.nth(index);
      await row.scrollIntoViewIfNeeded();
      const title = row.locator('h3');
      const copy = row.locator('p');
      const mark = row.locator('.service-row__mark');
      const [titleBox, copyBox, markBox] = await Promise.all([rect(title), rect(copy), rect(mark)]);
      const titleText = (await title.textContent())?.replace(/\s+/g, ' ').trim() ?? `row ${index + 1}`;

      assert(!overlaps(titleBox, copyBox), `${path} ${profile.name} service title overlaps its description: “${titleText}”`);
      assert(!overlaps(titleBox, markBox), `${path} ${profile.name} service title overlaps the X mark: “${titleText}”`);
      assert(!overlaps(copyBox, markBox), `${path} ${profile.name} service description overlaps the X mark: “${titleText}”`);

      if (profile.viewport.width > 960) {
        const horizontalGap = copyBox.left - titleBox.right;
        assert(horizontalGap >= 20, `${path} ${profile.name} service columns are too tight (${horizontalGap.toFixed(1)}px): “${titleText}”`);
      } else {
        const verticalGap = copyBox.top - titleBox.bottom;
        assert(verticalGap >= 6, `${path} ${profile.name} stacked service copy is too tight (${verticalGap.toFixed(1)}px): “${titleText}”`);
      }
    }

    await context.close();
  }
}

await browser.close();
console.log('Services layout QA passed: titles, descriptions and marks do not overlap on EN/LV desktop, tablet or mobile.');
