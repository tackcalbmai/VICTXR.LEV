import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });

async function auditAccessibility(path, expectedLang) {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'load' });
  assert(response?.ok(), `${path} returned ${response?.status()} during accessibility audit`);
  await page.evaluate(() => document.fonts.ready);

  const issues = await page.evaluate((lang) => {
    const failures = [];
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element.closest('[inert]')) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const accessibleName = (element) => {
      const label = element.getAttribute('aria-label')?.trim();
      if (label) return label;
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(' ');
        if (text) return text;
      }
      if (element instanceof HTMLInputElement && element.value.trim()) return element.value.trim();
      const text = element.textContent?.replace(/\s+/g, ' ').trim();
      if (text) return text;
      return element.getAttribute('title')?.trim() ?? '';
    };

    if (document.documentElement.lang !== lang) failures.push(`document language is ${document.documentElement.lang || 'missing'}, expected ${lang}`);
    if (document.querySelectorAll('main').length !== 1) failures.push('document must expose exactly one main landmark');
    if (document.querySelectorAll('h1').length !== 1) failures.push('document must expose exactly one h1');

    const skip = document.querySelector('.skip-link');
    if (!skip || skip.getAttribute('href') !== '#main-content' || !document.getElementById('main-content')) failures.push('skip link does not target #main-content');

    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id).filter(Boolean);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length) failures.push(`duplicate ids: ${[...new Set(duplicates)].join(', ')}`);

    const positiveTabIndex = [...document.querySelectorAll('[tabindex]')]
      .filter((element) => Number(element.getAttribute('tabindex')) > 0)
      .map((element) => element.outerHTML.slice(0, 120));
    if (positiveTabIndex.length) failures.push(`positive tabindex found: ${positiveTabIndex.join(' | ')}`);

    for (const element of document.querySelectorAll('a[href], button, input, select, textarea')) {
      if (!visible(element)) continue;
      if (!accessibleName(element)) failures.push(`interactive control has no accessible name: ${element.outerHTML.slice(0, 140)}`);
    }

    for (const image of document.querySelectorAll('img')) {
      if (!image.hasAttribute('alt')) failures.push(`image is missing alt: ${image.outerHTML.slice(0, 140)}`);
    }

    for (const hidden of document.querySelectorAll('[aria-hidden="true"]')) {
      if (hidden.closest('[inert]')) continue;
      const focusable = hidden.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable && visible(focusable)) failures.push(`aria-hidden subtree contains a focusable control: ${focusable.outerHTML.slice(0, 140)}`);
    }

    const headingLevels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
      .filter(visible)
      .map((heading) => Number(heading.tagName.slice(1)));
    for (let index = 1; index < headingLevels.length; index += 1) {
      if (headingLevels[index] - headingLevels[index - 1] > 1) {
        failures.push(`heading hierarchy skips from h${headingLevels[index - 1]} to h${headingLevels[index]}`);
        break;
      }
    }

    return failures;
  }, expectedLang);

  assert(!issues.length, `${path} accessibility regressions:\n- ${issues.join('\n- ')}`);
  await context.close();
}

const accessibilityRoutes = [
  ['/', 'en'],
  ['/work/', 'en'],
  ['/about/', 'en'],
  ['/services/', 'en'],
  ['/contact/', 'en'],
  ['/work/catrin/', 'en'],
  ['/work/anelika/', 'en'],
  ['/lv/', 'lv'],
  ['/lv/darbi/', 'lv'],
  ['/lv/par-mani/', 'lv'],
  ['/lv/pakalpojumi/', 'lv'],
  ['/lv/kontakti/', 'lv'],
  ['/lv/darbi/catrin/', 'lv'],
  ['/lv/darbi/anelika/', 'lv'],
];

for (const [path, lang] of accessibilityRoutes) await auditAccessibility(path, lang);

const performanceRoutes = [
  ['home', '/', { totalBytes: 1_200_000, imageBytes: 550_000, scriptBytes: 350_000, lcp: 4_000 }],
  ['work', '/work/', { totalBytes: 1_600_000, imageBytes: 1_000_000, scriptBytes: 350_000, lcp: 4_000 }],
  ['about', '/about/', { totalBytes: 1_050_000, imageBytes: 300_000, scriptBytes: 350_000, lcp: 4_000 }],
  ['services', '/services/', { totalBytes: 1_050_000, imageBytes: 300_000, scriptBytes: 350_000, lcp: 4_000 }],
  ['contact', '/contact/', { totalBytes: 1_050_000, imageBytes: 300_000, scriptBytes: 350_000, lcp: 4_000 }],
  ['catrin', '/work/catrin/', { totalBytes: 1_500_000, imageBytes: 900_000, scriptBytes: 350_000, lcp: 4_000 }],
  ['anelika', '/work/anelika/', { totalBytes: 1_500_000, imageBytes: 900_000, scriptBytes: 350_000, lcp: 4_000 }],
];

for (const [name, path, budget] of performanceRoutes) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__victxrQuality = { cls: 0, lcp: 0, longestTask: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__victxrQuality.cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries.at(-1);
        if (last) window.__victxrQuality.lcp = last.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__victxrQuality.longestTask = Math.max(window.__victxrQuality.longestTask, entry.duration);
      }).observe({ type: 'longtask', buffered: true });
    } catch {}
  });

  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 120,
    downloadThroughput: 1_600_000 / 8,
    uploadThroughput: 750_000 / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'load', timeout: 20_000 });
  assert(response?.ok(), `${name} returned ${response?.status()} during performance audit`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1_250);

  const metrics = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const bytes = (entry) => entry.encodedBodySize || entry.transferSize || 0;
    return {
      totalBytes: resources.reduce((sum, entry) => sum + bytes(entry), 0),
      imageBytes: resources.filter((entry) => entry.initiatorType === 'img').reduce((sum, entry) => sum + bytes(entry), 0),
      scriptBytes: resources.filter((entry) => entry.initiatorType === 'script').reduce((sum, entry) => sum + bytes(entry), 0),
      cls: window.__victxrQuality?.cls ?? 0,
      lcp: window.__victxrQuality?.lcp ?? 0,
      longestTask: window.__victxrQuality?.longestTask ?? 0,
    };
  });

  assert(metrics.totalBytes <= budget.totalBytes, `${name} exceeds cold-load resource budget: ${metrics.totalBytes} > ${budget.totalBytes} bytes`);
  assert(metrics.imageBytes <= budget.imageBytes, `${name} exceeds initial image budget: ${metrics.imageBytes} > ${budget.imageBytes} bytes`);
  assert(metrics.scriptBytes <= budget.scriptBytes, `${name} exceeds script budget: ${metrics.scriptBytes} > ${budget.scriptBytes} bytes`);
  assert(metrics.cls <= 0.08, `${name} synthetic CLS regressed to ${metrics.cls.toFixed(4)}`);
  assert(metrics.lcp > 0 && metrics.lcp <= budget.lcp, `${name} synthetic LCP regressed to ${Math.round(metrics.lcp)}ms`);
  assert(metrics.longestTask <= 500, `${name} main-thread task regressed to ${Math.round(metrics.longestTask)}ms`);

  await page.screenshot({ path: `${outDir}/quality-${name}-mobile.png`, fullPage: false });
  await context.close();
}

await browser.close();
console.log('Quality gates passed across Home, Contact, multipage routes and case studies: semantic accessibility and throttled mobile performance budgets are within limits.');
