import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const routes = [
  ['/', '.hero__title, .home-v2-work__title, .home-v2-capabilities__head h2, .home-v2-capability h3, .home-v2-perspective h2, .home-v2-close h2'],
  ['/darbi/', '.mp-hero h1, .work-exhibit__caption h2, .mp-closing h2, .page-contact-cta h2'],
  ['/par-mani/', '.mp-hero h1, .about-definition h2, .about-principle h2, .about-standard h2, .page-contact-cta h2'],
  ['/pakalpojumi/', '.mp-hero h1, .service-decision__head h2, .services-anti h2, .services-process h2, .page-contact-cta h2'],
  ['/kontakti/', '.contact-hero h1, .contact-intents__heading h2, .contact-intent__title, .contact-talk__heading h2, .contact-talk__primary strong, .contact-talk__secondary strong, .contact-brief__head h2'],
  ['/darbi/catrin/', '.case-narrative__row h2, .case-result p, .page-contact-cta h2, .case-contact > h2'],
  ['/darbi/anelika/', '.case-narrative__row h2, .case-result p, .page-contact-cta h2, .case-contact > h2'],
];

const profiles = [
  { name: 'desktop', width: 1366, height: 768, ratio: 0.92 },
  { name: 'tablet', width: 768, height: 1024, ratio: 0.92 },
  { name: 'mobile', width: 393, height: 852, ratio: 0.94 },
];

async function screenshot(page, selector, filename) {
  const target = page.locator(selector).first();
  assert(await target.count(), `${selector} is missing for ${filename}`);
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  await target.screenshot({ path: `${outDir}/${filename}` });
}

for (const viewport of profiles) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  for (const [suffix, selector] of routes) {
    const path = `/lv${suffix}`;
    const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
    assert(response?.ok(), `${viewport.name} ${path} returned ${response?.status()}`);
    await page.evaluate(() => document.fonts.ready);

    if (suffix === '/') {
      await page.waitForFunction(
        () => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready',
        undefined,
        { timeout: 9000 },
      ).catch(() => {});
    }

    const metrics = await page.locator(selector).evaluateAll((elements) => elements
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const style = getComputedStyle(element);
        const fontSize = Number.parseFloat(style.fontSize);
        const lineHeight = Number.parseFloat(style.lineHeight);
        return {
          text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          fontSize,
          lineHeight,
          className: element.className || element.tagName,
        };
      }));

    assert(metrics.length > 0, `${viewport.name} ${path} exposed no LV display targets`);
    for (const metric of metrics) {
      if (!Number.isFinite(metric.fontSize) || !Number.isFinite(metric.lineHeight)) continue;
      const isEditorial = metric.className.includes('case-narrative__row') || metric.className.includes('case-result');
      const expected = isEditorial ? metric.fontSize * 1.04 : metric.fontSize * viewport.ratio + 1.5;
      assert(
        metric.lineHeight + 0.25 >= expected,
        `${viewport.name} ${path}: unsafe LV leading ${metric.lineHeight.toFixed(2)}px for ${metric.fontSize.toFixed(2)}px type in “${metric.text}”`,
      );
    }

    /* Automatic guard: any large multiline Latvian H1/H2/H3 should not fall
     * back to the old ultra-tight EN metric, even if a future block is omitted
     * from the explicit selector list above.
     */
    const discovered = await page.locator('h1, h2, h3').evaluateAll((elements) => {
      const latvianMarks = /[ĀČĒĢĪĶĻŅŠŪŽāčēģīķļņšūž]/;
      return elements.flatMap((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        const fontSize = Number.parseFloat(style.fontSize);
        const lineHeight = Number.parseFloat(style.lineHeight);
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        const multiline = Number.isFinite(lineHeight) && rect.height > lineHeight * 1.35;
        if (!visible || !latvianMarks.test(text) || fontSize < 30 || !multiline || !Number.isFinite(lineHeight)) return [];
        return [{ text, fontSize, lineHeight, className: element.className || element.id || element.tagName }];
      });
    });

    for (const heading of discovered) {
      const editorial = heading.className.includes('case-narrative') || heading.className.includes('case-result');
      const floor = editorial ? heading.fontSize * 1.035 : heading.fontSize * viewport.ratio + 1.25;
      assert(
        heading.lineHeight + 0.25 >= floor,
        `${viewport.name} ${path}: auto-scan found unsafe LV leading ${heading.lineHeight.toFixed(2)}px in “${heading.text}”`,
      );
    }

    if (suffix === '/') {
      await screenshot(page, '.home-v2-capabilities', `lv-diacritics-${viewport.name}-home-capabilities.png`);
      await screenshot(page, '.home-v2-perspective', `lv-diacritics-${viewport.name}-home-perspective.png`);
    }
    if (suffix === '/darbi/') {
      await screenshot(page, '.mp-hero', `lv-diacritics-${viewport.name}-work-hero.png`);
      await screenshot(page, '.mp-closing', `lv-diacritics-${viewport.name}-work-closing.png`);
    }
    if (suffix === '/par-mani/') {
      await screenshot(page, '.about-principles', `lv-diacritics-${viewport.name}-about-principles.png`);
    }
    if (suffix === '/pakalpojumi/') {
      await screenshot(page, '.services-decision', `lv-diacritics-${viewport.name}-services.png`);
    }
    if (suffix === '/kontakti/') {
      await screenshot(page, '.contact-hero', `lv-diacritics-${viewport.name}-contact-hero.png`);
      await screenshot(page, '.contact-talk', `lv-diacritics-${viewport.name}-contact-talk.png`);
    }
  }

  await context.close();
}

/* English must remain on its own established metrics. */
{
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(new URL('/', baseURL).toString(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  const ratio = await page.locator('.home-v2-perspective h2').evaluate((element) => {
    const style = getComputedStyle(element);
    return Number.parseFloat(style.lineHeight) / Number.parseFloat(style.fontSize);
  });
  assert(ratio < 0.9, `English display leading was unintentionally loosened to ${ratio.toFixed(3)}`);
  await context.close();
}

await browser.close();
console.log('Latvian display-leading QA passed across all production LV page families.');
