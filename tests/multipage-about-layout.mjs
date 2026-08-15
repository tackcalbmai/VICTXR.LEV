import { chromium } from 'playwright';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function overlaps(a, b, gap = 4) {
  return !(
    a.right + gap <= b.left ||
    b.right + gap <= a.left ||
    a.bottom + gap <= b.top ||
    b.bottom + gap <= a.top
  );
}

async function visibleInkBox(locator) {
  return locator.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const rects = [];
    let node = walker.nextNode();
    while (node) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width > 1 && rect.height > 1) rects.push(rect);
      }
      node = walker.nextNode();
    }
    if (!rects.length) return null;
    return {
      left: Math.min(...rects.map((rect) => rect.left)),
      right: Math.max(...rects.map((rect) => rect.right)),
      top: Math.min(...rects.map((rect) => rect.top)),
      bottom: Math.max(...rects.map((rect) => rect.bottom)),
      text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    };
  });
}

const cases = [
  { path: '/about/', lang: 'en' },
  { path: '/lv/par-mani/', lang: 'lv' },
];
const profiles = [
  { name: 'desktop', viewport: { width: 1366, height: 768 } },
  { name: 'tablet', viewport: { width: 768, height: 1024 } },
  { name: 'mobile', viewport: { width: 393, height: 852 } },
];

for (const profile of profiles) {
  const context = await browser.newContext({ viewport: profile.viewport, reducedMotion: 'reduce' });
  for (const current of cases) {
    const page = await context.newPage();
    const response = await page.goto(new URL(current.path, baseURL).toString(), { waitUntil: 'load' });
    assert(response?.ok(), `${profile.name} ${current.path} returned ${response?.status()}`);
    await page.evaluate(() => document.fonts.ready);

    const rows = page.locator('.about-principle');
    assert(await rows.count() === 4, `${profile.name} ${current.lang} About should contain four principles`);
    for (let index = 0; index < 4; index += 1) {
      const row = rows.nth(index);
      await row.scrollIntoViewIfNeeded();
      const title = await visibleInkBox(row.locator('h2'));
      const copy = await visibleInkBox(row.locator('p'));
      assert(title && copy, `${profile.name} ${current.lang} principle ${index + 1} cannot be measured`);
      assert(!overlaps(title, copy, 6), `${profile.name} ${current.lang} About principle ${index + 1} title overlaps copy: “${title.text}”`);
      for (const [name, box] of [['title', title], ['copy', copy]]) {
        assert(box.left >= -2, `${profile.name} ${current.lang} principle ${index + 1} ${name} escapes left`);
        assert(box.right <= profile.viewport.width + 2, `${profile.name} ${current.lang} principle ${index + 1} ${name} escapes right`);
      }
    }
    await page.close();
  }
  await context.close();
}

await browser.close();
console.log('Multi-page About QA passed: all EN/LV principle headings and explanations stay visually separated across desktop, tablet and mobile.');
