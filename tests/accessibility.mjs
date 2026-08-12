import { chromium } from 'playwright';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const routes = ['/', '/lv/', '/work/catrin/', '/work/anelika/', '/lv/darbi/catrin/', '/lv/darbi/anelika/', '/404/', '/lv/404/'];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
const page = await context.newPage();

for (const route of routes) {
  const response = await page.goto(new URL(route, baseURL), { waitUntil: 'domcontentloaded' });
  if (!response?.ok()) throw new Error(`${route} returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);

  const findings = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const accessibleName = (element) => {
      const label = element.getAttribute('aria-label')?.trim();
      if (label) return label;
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const text = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim() ?? '').join(' ').trim();
        if (text) return text;
      }
      const imageAlt = element.querySelector('img[alt]')?.getAttribute('alt')?.trim();
      return (element.textContent?.replace(/\s+/g, ' ').trim() || imageAlt || element.getAttribute('title')?.trim() || '');
    };

    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id).filter(Boolean);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const unnamed = [...document.querySelectorAll('a[href], button, input, select, textarea')]
      .filter((element) => visible(element) && !element.closest('[inert]'))
      .filter((element) => !accessibleName(element))
      .map((element) => element.outerHTML.slice(0, 180));
    const missingAlt = [...document.querySelectorAll('img:not([alt])')].map((element) => element.outerHTML.slice(0, 180));
    const positiveTabindex = [...document.querySelectorAll('[tabindex]')]
      .filter((element) => Number(element.getAttribute('tabindex')) > 0)
      .map((element) => element.outerHTML.slice(0, 180));
    const mainCount = document.querySelectorAll('main').length;
    const h1Count = document.querySelectorAll('main h1').length;
    const lang = document.documentElement.getAttribute('lang');

    return { duplicates, unnamed, missingAlt, positiveTabindex, mainCount, h1Count, lang };
  });

  if (findings.duplicates.length) throw new Error(`${route} duplicates IDs: ${findings.duplicates.join(', ')}`);
  if (findings.unnamed.length) throw new Error(`${route} has unnamed controls: ${findings.unnamed.join('\n')}`);
  if (findings.missingAlt.length) throw new Error(`${route} has images without alt: ${findings.missingAlt.join('\n')}`);
  if (findings.positiveTabindex.length) throw new Error(`${route} uses positive tabindex: ${findings.positiveTabindex.join('\n')}`);
  if (findings.mainCount !== 1) throw new Error(`${route} must expose exactly one main landmark (${findings.mainCount})`);
  if (findings.h1Count !== 1) throw new Error(`${route} must expose exactly one main h1 (${findings.h1Count})`);
  const expectedLang = route.startsWith('/lv/') ? 'lv' : 'en';
  if (findings.lang !== expectedLang) throw new Error(`${route} has lang=${findings.lang}, expected ${expectedLang}`);
}

await context.close();
await browser.close();
console.log(`Accessibility smoke audit passed for ${routes.length} EN/LV routes.`);
