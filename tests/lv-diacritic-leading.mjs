import { chromium } from 'playwright';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const routes = [
  ['/', '.hero__title, .home-v2-work__title, .home-v2-capabilities__head h2, .home-v2-perspective h2, .home-v2-close h2'],
  ['/darbi/', '.mp-hero h1, .work-exhibit__caption h2, .mp-closing h2, .page-contact-cta h2'],
  ['/par-mani/', '.mp-hero h1, .about-definition h2, .about-principle h2, .about-standard h2, .page-contact-cta h2'],
  ['/pakalpojumi/', '.mp-hero h1, .service-decision__head h2, .services-anti h2, .services-process h2, .page-contact-cta h2'],
  ['/kontakti/', '.contact-hero h1, .contact-intent__title, .contact-talk__heading h2, .contact-talk__primary strong, .contact-talk__secondary strong, .contact-brief__head h2'],
  ['/darbi/catrin/', '.page-contact-cta h2, .case-contact > h2'],
  ['/darbi/anelika/', '.page-contact-cta h2, .case-contact > h2'],
];

for (const viewport of [
  { name: 'desktop', width: 1366, height: 768, floor: 0.915 },
  { name: 'tablet', width: 768, height: 1024, floor: 0.915 },
  { name: 'mobile', width: 393, height: 852, floor: 0.935 },
]) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();

  for (const [suffix, selector] of routes) {
    const path = `/lv${suffix}`.replace('/lv/', '/lv/');
    const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'domcontentloaded' });
    assert(response?.ok(), `${viewport.name} ${path} returned ${response?.status()}`);
    await page.evaluate(() => document.fonts.ready);

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
          selectorHint: element.className || element.tagName,
          text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          ratio: lineHeight / fontSize,
        };
      }));

    assert(metrics.length > 0, `${viewport.name} ${path} did not expose any LV display headings for diacritic QA`);
    for (const metric of metrics) {
      assert(
        metric.ratio + 0.003 >= viewport.floor,
        `${viewport.name} ${path} has unsafe LV leading ${metric.ratio.toFixed(3)} in “${metric.text}” (${metric.selectorHint})`,
      );
    }
  }

  await context.close();
}

/* Guard against accidentally loosening English display type with the LV fix. */
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
console.log('Latvian diacritic leading is safely tight across Home, Work, About, Services, Contact and case-study routes.');
