import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
const ratioEpsilon = 0.005;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openReadyPage(page, path) {
  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
  assert(response?.ok(), `${path} returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
}

async function lineGeometry(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize);
    const lineHeight = Number.parseFloat(style.lineHeight);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const fragments = [];
    let textNode = walker.nextNode();
    while (textNode) {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      for (const rect of range.getClientRects()) {
        if (rect.width > 1 && rect.height > 1) {
          fragments.push({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
        }
      }
      textNode = walker.nextNode();
    }

    const rows = [];
    for (const fragment of fragments.sort((a, b) => a.top - b.top || a.left - b.left)) {
      const row = rows.find((candidate) => Math.abs(candidate.top - fragment.top) <= 2);
      if (row) {
        row.top = Math.min(row.top, fragment.top);
        row.bottom = Math.max(row.bottom, fragment.bottom);
        row.left = Math.min(row.left, fragment.left);
        row.right = Math.max(row.right, fragment.right);
      } else {
        rows.push({ ...fragment });
      }
    }

    let minRowAdvance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < rows.length - 1; index += 1) {
      minRowAdvance = Math.min(minRowAdvance, rows[index + 1].top - rows[index].top);
    }

    return {
      text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      fontSize,
      lineHeight,
      ratio: lineHeight / fontSize,
      rows,
      minRowAdvance: Number.isFinite(minRowAdvance) ? minRowAdvance : null,
      overflow: style.overflow,
      overflowY: style.overflowY,
    };
  });
}

async function assertLineHeightFloor(page, selector, floor, label) {
  const locators = page.locator(selector);
  const count = await locators.count();
  assert(count > 0, `${label} is missing`);
  for (let index = 0; index < count; index += 1) {
    const geometry = await lineGeometry(locators.nth(index));
    assert(geometry.ratio + ratioEpsilon >= floor, `${label} line-height is too tight (${geometry.ratio.toFixed(3)}) in “${geometry.text}”`);
    if (geometry.rows.length > 1 && geometry.minRowAdvance !== null) {
      const advanceRatio = geometry.minRowAdvance / geometry.fontSize;
      assert(advanceRatio + ratioEpsilon >= floor - 0.015, `${label} rendered row advance is too tight (${advanceRatio.toFixed(3)}) in “${geometry.text}”`);
    }
  }
}

async function assertTextWithinViewport(page, selector, label, tolerance = 2) {
  const locators = page.locator(selector);
  const count = await locators.count();
  assert(count > 0, `${label} is missing`);

  for (let index = 0; index < count; index += 1) {
    const locator = locators.nth(index);
    await locator.scrollIntoViewIfNeeded();
    const geometry = await locator.evaluate((element) => {
      const viewportWidth = document.documentElement.clientWidth;
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      });
      const rects = [];
      let textNode = walker.nextNode();
      while (textNode) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        for (const rect of range.getClientRects()) {
          if (rect.width > 1 && rect.height > 1) rects.push({ left: rect.left, right: rect.right });
        }
        textNode = walker.nextNode();
      }
      return {
        viewportWidth,
        text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        left: rects.length ? Math.min(...rects.map((rect) => rect.left)) : null,
        right: rects.length ? Math.max(...rects.map((rect) => rect.right)) : null,
      };
    });

    assert(geometry.left !== null && geometry.right !== null, `${label} has no measurable text in “${geometry.text}”`);
    assert(geometry.left >= -tolerance, `${label} escapes left (${geometry.left.toFixed(1)}px) in “${geometry.text}”`);
    assert(geometry.right <= geometry.viewportWidth + tolerance, `${label} escapes right (${geometry.right.toFixed(1)}px > ${geometry.viewportWidth}px) in “${geometry.text}”`);
  }
}

async function screenshotSection(page, selector, path) {
  const locator = page.locator(selector).first();
  assert(await locator.count(), `${selector} is missing for screenshot`);
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(60);
  await locator.screenshot({ path: `${outDir}/${path}` });
}

const profiles = [
  { name: 'lv-typography-desktop', viewport: { width: 1366, height: 768 } },
  { name: 'lv-typography-tablet', viewport: { width: 768, height: 1024 } },
  { name: 'lv-typography-mobile', viewport: { width: 393, height: 852 } },
];

for (const profile of profiles) {
  const context = await browser.newContext({ viewport: profile.viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await openReadyPage(page, '/lv/');
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 9000 });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 3000 }).catch(() => {});

  const sourceHeroLines = (await page.locator('[data-intro-line]').allTextContents()).map((line) => line.trim());
  const sourceHero = sourceHeroLines.join(' ');
  assert(sourceHero === 'Es redzu lietas citādi.', `${profile.name} lost the Latvian hero spelling: ${sourceHero}`);

  const fontCoverage = await page.evaluate(() => document.fonts.check('790 72px Onest', 'Ā Ē Ī Ņ Ķ Ļ Š Ž ā ē ī ņ ķ ļ š ž'));
  assert(fontCoverage, `${profile.name} does not have loaded Onest coverage for Latvian diacritics`);

  const heroLines = page.locator('.hero__line');
  assert(await heroLines.count() === 3, `${profile.name} hero line structure changed`);
  const lastLine = await lineGeometry(heroLines.nth(2));
  assert(lastLine.overflowY === 'visible' || lastLine.overflow === 'visible', `${profile.name} can still clip CITĀDI diacritics after intro`);

  if (profile.viewport.width === 768) {
    assert(await page.locator('[data-menu-toggle]').isVisible(), `${profile.name} should use compact navigation`);
    assert(!(await page.locator('.site-nav--desktop').isVisible()), `${profile.name} still shows the long desktop navigation`);
    assert(!(await page.locator('.site-status').isVisible()), `${profile.name} still shows the long availability status`);
  }

  // Range client rectangles describe the font line box, not literal black pixels.
  // For Latvian display type we lock the rendered baseline/row rhythm and the
  // visible text bounds. This keeps the EN art direction while allowing LV its
  // own scale, wrapping and optical alignment.
  await assertLineHeightFloor(page, '.work-heading .display-title', 1.02, `${profile.name} selected-work title`);
  await assertLineHeightFloor(page, '.disruption__line', 1.03, `${profile.name} disruption title`);
  await assertLineHeightFloor(page, '.about .display-title, .about__statement', 1.05, `${profile.name} about typography`);
  await assertLineHeightFloor(page, '.approach__steps strong', 1.05, `${profile.name} process typography`);
  await assertLineHeightFloor(page, '.anti-sales__title', 1.05, `${profile.name} anti-sales typography`);
  await assertLineHeightFloor(page, '.contact__title', 1.05, `${profile.name} contact typography`);

  await assertTextWithinViewport(page, '.hero__line-inner', `${profile.name} hero`);
  await assertTextWithinViewport(page, '.work-heading .display-title', `${profile.name} selected-work title`);
  await assertTextWithinViewport(page, '.disruption__line', `${profile.name} disruption title`);
  await assertTextWithinViewport(page, '.about__statement span', `${profile.name} about statement`);
  await assertTextWithinViewport(page, '.approach__steps strong', `${profile.name} process title`);
  await assertTextWithinViewport(page, '.service-row h3', `${profile.name} service title`);
  await assertTextWithinViewport(page, '.xo-section h2 span', `${profile.name} X/O title`);
  await assertTextWithinViewport(page, '.anti-sales__title span', `${profile.name} anti-sales title`);
  await assertTextWithinViewport(page, '.contact__title span', `${profile.name} contact title`);

  await screenshotSection(page, '.hero', `${profile.name}-hero.png`);
  await screenshotSection(page, '#work', `${profile.name}-work.png`);
  await screenshotSection(page, '#services', `${profile.name}-services.png`);
  await screenshotSection(page, '#contact', `${profile.name}-contact.png`);

  for (const project of ['catrin', 'anelika']) {
    await openReadyPage(page, `/lv/darbi/${project}/`);
    await assertLineHeightFloor(page, '.case-narrative__row h2', 1.04, `${profile.name} ${project} narrative headings`);
    await assertLineHeightFloor(page, '.case-result p', 1.04, `${profile.name} ${project} result`);
    await assertLineHeightFloor(page, '.case-contact h2', 1.05, `${profile.name} ${project} contact heading`);

    await assertTextWithinViewport(page, '.case-hero__subtitle', `${profile.name} ${project} hero subtitle`);
    await assertTextWithinViewport(page, '.case-narrative__row h2', `${profile.name} ${project} narrative headings`);
    await assertTextWithinViewport(page, '.case-result p', `${profile.name} ${project} result`);
    await assertTextWithinViewport(page, '.case-contact h2 span', `${profile.name} ${project} contact heading`);

    await screenshotSection(page, '.case-hero', `${profile.name}-${project}-hero.png`);
    await screenshotSection(page, '.case-narrative', `${profile.name}-${project}-narrative.png`);
    await screenshotSection(page, '.case-contact', `${profile.name}-${project}-contact.png`);
  }

  await context.close();
}

await browser.close();
console.log('Latvian typography QA passed: LV-specific desktop/tablet/mobile composition, diacritics, line rhythm and viewport bounds are safe across the home page and both case studies.');
