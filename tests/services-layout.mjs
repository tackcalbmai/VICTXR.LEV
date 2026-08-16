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

for (const path of ['/services/', '/lv/pakalpojumi/']) {
  for (const profile of profiles) {
    const context = await browser.newContext({ viewport: profile.viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await openReady(page, path);

    const rows = page.locator('.services-decision .service-decision');
    const count = await rows.count();
    assert(count === 6, `${path} ${profile.name} should expose six service decisions, got ${count}`);

    for (let index = 0; index < count; index += 1) {
      const row = rows.nth(index);
      await row.scrollIntoViewIfNeeded();
      const title = row.locator('h2');
      const body = row.locator('.service-decision__body');
      const mark = row.locator('.service-decision__mark');
      const [titleBox, bodyBox, markBox] = await Promise.all([rect(title), rect(body), rect(mark)]);
      const titleText = (await title.textContent())?.replace(/\s+/g, ' ').trim() ?? `row ${index + 1}`;

      assert(!overlaps(titleBox, bodyBox), `${path} ${profile.name} service title overlaps its descriptive body: “${titleText}”`);
      assert(!overlaps(titleBox, markBox), `${path} ${profile.name} service title overlaps the X/O focus mark: “${titleText}”`);
      assert(!overlaps(bodyBox, markBox), `${path} ${profile.name} service body overlaps the X/O focus mark: “${titleText}”`);

      const x = mark.locator('i');
      const o = mark.locator('b');
      assert(await x.count() === 1 && await o.count() === 1, `${path} ${profile.name} service ${index + 1} lost the semantic X → O focus mechanism`);
    }

    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
    assert(overflow <= 2, `${path} ${profile.name} has ${overflow}px horizontal overflow`);
    await context.close();
  }
}

await browser.close();
console.log('Services layout QA passed: six EN/LV decisions stay geometrically clean and preserve the X → O focus mechanism across desktop, tablet and mobile.');
