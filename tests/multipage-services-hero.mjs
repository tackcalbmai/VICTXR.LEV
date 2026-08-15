import { chromium } from 'playwright';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function boxesOverlap(a, b, gap = 4) {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
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
    const x = Math.min(...rects.map((rect) => rect.left));
    const y = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    return { x, y, width: right - x, height: bottom - y };
  });
}

const cases = [
  { path: '/services/', lang: 'en' },
  { path: '/lv/pakalpojumi/', lang: 'lv' },
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

    const title = await visibleInkBox(page.locator('.mp-services__hero h1'));
    const intro = await visibleInkBox(page.locator('.mp-services__intro'));
    const jump = await visibleInkBox(page.locator('.mp-services__jump'));
    assert(title && intro && jump, `${profile.name} ${current.lang} services hero visible text cannot be measured`);
    assert(!boxesOverlap(title, intro, 6), `${profile.name} ${current.lang} services hero title overlaps explanatory copy`);
    assert(!boxesOverlap(intro, jump, 4), `${profile.name} ${current.lang} services hero explanatory copy overlaps jump link`);

    const hero = await page.locator('.mp-services__hero').boundingBox();
    assert(hero, `${profile.name} ${current.lang} services hero is missing`);
    for (const [name, box] of [['title', title], ['intro', intro], ['jump', jump]]) {
      assert(box.x >= hero.x - 2, `${profile.name} ${current.lang} services ${name} escapes left`);
      assert(box.x + box.width <= hero.x + hero.width + 2, `${profile.name} ${current.lang} services ${name} escapes right`);
      assert(box.y >= hero.y - 2, `${profile.name} ${current.lang} services ${name} escapes top`);
      assert(box.y + box.height <= hero.y + hero.height + 2, `${profile.name} ${current.lang} services ${name} escapes bottom`);
    }

    await page.close();
  }
  await context.close();
}

await browser.close();
console.log('Multi-page services hero QA passed: visible title, explanatory copy and jump CTA stay separated in EN/LV across desktop, tablet and mobile.');
