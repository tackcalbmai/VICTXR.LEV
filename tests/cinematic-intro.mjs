import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? {
    executablePath,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  } : {}),
});

async function waitPhase(page, phase, timeout = 6500) {
  await page.waitForFunction((expected) => document.querySelector('[data-cinematic-intro]')?.getAttribute('data-cinematic-phase') === expected, phase, { timeout });
}

function rectDelta(a, b) {
  return {
    left: Math.abs(a.x - b.x),
    top: Math.abs(a.y - b.y),
    width: Math.abs(a.width - b.width),
    height: Math.abs(a.height - b.height),
  };
}

async function assertCinematicIntro(name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  await context.addInitScript(() => {
    window.__victxrHeroAnimationStarts = [];
    document.addEventListener('animationstart', (event) => {
      if (event.target instanceof Element && event.target.matches('[data-intro-line]')) {
        window.__victxrHeroAnimationStarts.push(event.animationName);
      }
    });
  });
  const page = await context.newPage();
  const errors = [];
  const phases = {};
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  const startedAt = Date.now();
  const stamp = (phase) => { phases[phase] = Date.now() - startedAt; };

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'attached', timeout: 1500 });
  if (await page.locator('[data-cinematic-intro]').count() !== 1) throw new Error(`${name} mounted duplicate cinematic layers`);

  const shellState = await page.locator('[data-home-intro]').getAttribute('data-home-intro');
  if (shellState !== 'pending') throw new Error(`${name} hero started before the logo intro (${shellState})`);

  const locked = await page.evaluate(() => document.documentElement.classList.contains('is-cinematic-intro'));
  if (!locked) throw new Error(`${name} page is not scroll-locked during the logo intro`);

  const introBox = await page.locator('[data-cinematic-intro]').boundingBox();
  if (!introBox || Math.abs(introBox.width - viewport.width) > 2 || Math.abs(introBox.height - viewport.height) > 2) {
    throw new Error(`${name} logo intro does not cover the viewport`);
  }

  const backdropColor = await page.locator('[data-cinematic-backdrop]').evaluate((element) => getComputedStyle(element).backgroundColor);
  if (!backdropColor.includes('8, 8, 8')) throw new Error(`${name} intro does not open on the intended black field (${backdropColor})`);

  await waitPhase(page, 'assemble');
  stamp('assemble');
  if (await page.locator('[data-cinematic-slice]').count() !== 3) throw new Error(`${name} opening assembly must use three controlled slices`);
  await page.waitForTimeout(220);
  const sliceOpacities = await page.locator('[data-cinematic-slice]').evaluateAll((elements) => elements.map((element) => Number.parseFloat(getComputedStyle(element).opacity)));
  if (sliceOpacities.filter((opacity) => opacity > 0.15).length < 2) throw new Error(`${name} opening assembly is not visibly building the wordmark`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-assemble.png`, fullPage: false });

  await waitPhase(page, 'monogram');
  stamp('monogram');
  await page.waitForTimeout(230);
  const monogramBox = await page.locator('[data-cinematic-xo-pair]').boundingBox();
  if (!monogramBox || Math.abs(monogramBox.x + monogramBox.width / 2 - viewport.width / 2) > 2.5) {
    throw new Error(`${name} opening XO monogram is not optically centered`);
  }
  await page.screenshot({ path: `${outDir}/${name}-cinematic-monogram.png`, fullPage: false });

  await waitPhase(page, 'separate');
  stamp('separate');

  await waitPhase(page, 'word-reveal');
  stamp('word-reveal');

  await waitPhase(page, 'lockup');
  stamp('lockup');
  await page.waitForTimeout(120);
  const descriptor = (await page.locator('[data-cinematic-descriptor]').innerText()).replace(/\s+/g, ' ').trim();
  if (descriptor !== 'BY VICTXR.LEV') throw new Error(`${name} author descriptor is malformed: ${descriptor}`);
  if (descriptor.includes('WEB DESIGN')) throw new Error(`${name} obsolete WEB DESIGN descriptor is still rendered`);
  if (await page.locator('[data-cinematic-descriptor-line]').count()) throw new Error(`${name} obsolete descriptor rule is still rendered`);

  const wordmarkBox = await page.locator('[data-cinematic-wordmark]').boundingBox();
  const descriptorBox = await page.locator('[data-cinematic-descriptor-wrap]').boundingBox();
  if (!wordmarkBox || !descriptorBox) throw new Error(`${name} logo/descriptor geometry is missing`);
  if (wordmarkBox.x < 14 || wordmarkBox.x + wordmarkBox.width > viewport.width - 14) {
    throw new Error(`${name} XO WEB escapes the safe viewport (${wordmarkBox.x.toFixed(1)}..${(wordmarkBox.x + wordmarkBox.width).toFixed(1)} of ${viewport.width}px)`);
  }
  const xoBox = await page.locator('[data-cinematic-xo-pair]').boundingBox();
  const webBox = await page.locator('[data-cinematic-web]').boundingBox();
  if (!xoBox || !webBox) throw new Error(`${name} XO/WEB geometry is missing`);
  const brandGap = webBox.x - (xoBox.x + xoBox.width);
  if (brandGap < 0 || brandGap > wordmarkBox.height * 0.16) throw new Error(`${name} XO and WEB do not read as one lockup (${brandGap.toFixed(1)}px gap)`);
  const widthRatio = descriptorBox.width / wordmarkBox.width;
  if (widthRatio < 0.94 || widthRatio > 1.03) throw new Error(`${name} XO WEB descriptor does not span the wordmark slot (${widthRatio.toFixed(2)}×)`);
  const verticalGap = descriptorBox.y - (wordmarkBox.y + wordmarkBox.height);
  if (verticalGap < -4 || verticalGap > (viewport.width <= 760 ? 14 : 20)) throw new Error(`${name} XO WEB descriptor is not tucked under the logo (${verticalGap.toFixed(1)}px gap)`);
  const descriptorSize = Number.parseFloat(await page.locator('[data-cinematic-descriptor]').evaluate((element) => getComputedStyle(element).fontSize));
  const minimumDescriptorSize = viewport.width <= 760 ? 10 : 13;
  if (descriptorSize < minimumDescriptorSize) throw new Error(`${name} XO WEB descriptor is too small (${descriptorSize}px)`);

  const initialLogo = (await page.locator('[data-cinematic-wordmark]').textContent())?.replace(/\s+/g, '') ?? '';
  if (initialLogo !== 'XOWEB') throw new Error(`${name} initial XO WEB logo is malformed: ${initialLogo}`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-lockup.png`, fullPage: false });

  const xText = (await page.locator('[data-cinematic-wordmark]').textContent())?.replace(/\s+/g, '') ?? '';
  if (xText !== 'XOWEB') throw new Error(`${name} XO motion did not resolve on XO WEB: ${xText}`);
  const descriptorAfterCycle = (await page.locator('[data-cinematic-descriptor]').innerText()).replace(/\s+/g, ' ').trim();
  if (descriptorAfterCycle !== 'BY VICTXR.LEV') throw new Error(`${name} intro author descriptor changed during XO motion: ${descriptorAfterCycle}`);

  const headerBrandBox = await page.locator('.site-brand').boundingBox();
  if (!headerBrandBox) throw new Error(`${name} header brand has no geometry`);

  await waitPhase(page, 'handoff');
  stamp('handoff');
  await page.waitForTimeout(360);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-handoff.png`, fullPage: false });

  await waitPhase(page, 'reveal');
  stamp('reveal');
  const introReady = await page.evaluate(() => performance.getEntriesByName('xoweb:intro-ready').at(-1)?.startTime ?? 0);
  if (introReady < 3600 || introReady > 4700) throw new Error(`${name} introReadyMs ${introReady.toFixed(0)}ms is outside the intended handoff window`);
  const backdrop = page.locator('[data-cinematic-backdrop]');
  if (!await backdrop.count()) throw new Error(`${name} cinematic field disappeared before reveal`);
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-cinematic-backdrop]');
    return element && Number.parseFloat(getComputedStyle(element).opacity) < 0.78;
  }, undefined, { timeout: 900 });
  await page.screenshot({ path: `${outDir}/${name}-cinematic-reveal.png`, fullPage: false });

  await waitPhase(page, 'landed');
  stamp('landed');
  const flyingBox = await page.locator('[data-cinematic-wordmark]').boundingBox();
  const landedHeaderBox = await page.locator('.site-brand').boundingBox();
  if (!flyingBox || !landedHeaderBox) throw new Error(`${name} landed handoff geometry is missing`);
  const delta = rectDelta(flyingBox, landedHeaderBox);
  const tolerance = viewport.width <= 760 ? 2.5 : 2;
  if (delta.left > tolerance || delta.top > tolerance || delta.width > tolerance || delta.height > tolerance) {
    throw new Error(`${name} flying logo missed the real XO WEB header slot: left ${delta.left.toFixed(1)}, top ${delta.top.toFixed(1)}, width ${delta.width.toFixed(1)}, height ${delta.height.toFixed(1)}px`);
  }
  const headerOpacity = Number(await page.locator('[data-site-header]').evaluate((element) => getComputedStyle(element).opacity));
  if (headerOpacity < 0.9) throw new Error(`${name} real header did not take over after exact landing (${headerOpacity})`);
  await page.screenshot({ path: `${outDir}/${name}-cinematic-landed-slot.png`, fullPage: false });

  const minimumBeatSpacing = [
    ['assemble', 'monogram', 560],
    ['monogram', 'separate', 380],
    ['separate', 'word-reveal', 650],
    ['word-reveal', 'lockup', 760],
    ['lockup', 'handoff', 250],
  ];
  for (const [from, to, minimum] of minimumBeatSpacing) {
    const spacing = phases[to] - phases[from];
    if (spacing < minimum) throw new Error(`${name} ${from}→${to} beat is rushed (${spacing}ms < ${minimum}ms)`);
  }

  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 6000 });
  await page.waitForSelector('[data-cinematic-intro]', { state: 'detached', timeout: 1800 });

  const duration = Date.now() - startedAt;
  if (duration < 4700 || duration > 5600) throw new Error(`${name} intro duration ${duration}ms is outside the intended five-second hook window`);

  const stillLocked = await page.evaluate(() => document.documentElement.classList.contains('is-cinematic-intro'));
  if (stillLocked) throw new Error(`${name} page stayed scroll-locked after the intro`);

  await page.waitForTimeout(500);
  const headerBrand = (await page.locator('.site-brand').textContent())?.replace(/\s+/g, '') ?? '';
  if (headerBrand !== 'XOWEB') throw new Error(`${name} primary XO WEB header wordmark is malformed: ${headerBrand}`);
  const headerByline = (await page.locator('[data-xo-submark]').innerText()).replace(/\s+/g, '').trim();
  if (headerByline !== 'BYVICTXR.LEV') throw new Error(`${name} landed author signature is malformed: ${headerByline}`);
  const bylineOpacity = Number(await page.locator('[data-xo-submark]').evaluate((element) => getComputedStyle(element).opacity));
  if (bylineOpacity < 0.9) throw new Error(`${name} landed author signature stayed hidden (${bylineOpacity})`);

  const heroLine = page.locator('[data-intro-line]').first();
  const heroOpacity = Number(await heroLine.evaluate((element) => getComputedStyle(element).opacity));
  if (heroOpacity < 0.7) throw new Error(`${name} hero did not progressively take over after the logo handoff (${heroOpacity})`);
  const heroAnimationStarts = await page.evaluate(() => window.__victxrHeroAnimationStarts);
  if (heroAnimationStarts.filter((animation) => animation === 'intro-line').length !== 3) {
    throw new Error(`${name} replayed the hero line reveal (${heroAnimationStarts.join(', ')})`);
  }
  if (heroAnimationStarts.filter((animation) => animation === 'intro-lock').length !== 1) {
    throw new Error(`${name} did not run exactly one controlled hero lock (${heroAnimationStarts.join(', ')})`);
  }
  await page.screenshot({ path: `${outDir}/${name}-cinematic-landed.png`, fullPage: false });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 1200 });
  if (await page.locator('[data-cinematic-intro]').count()) throw new Error(`${name} replayed the full cinematic within the same browser session`);
  if (await page.evaluate(() => sessionStorage.getItem('xoweb:intro-seen')) !== '1') throw new Error(`${name} did not persist the session intro state`);

  if (errors.length) throw new Error(`${name} runtime errors:\n${errors.join('\n')}`);
  await context.close();
  return { duration, phases };
}

const viewportMatrix = [
  ['mobile-320', { width: 320, height: 568 }],
  ['mobile-360', { width: 360, height: 800 }],
  ['mobile-393', { width: 393, height: 852 }],
  ['mobile-430', { width: 430, height: 932 }],
  ['tablet-768', { width: 768, height: 1024 }],
  ['laptop-1024', { width: 1024, height: 768 }],
  ['desktop-1366', { width: 1366, height: 768 }],
];
const results = [];
for (const [name, viewport] of viewportMatrix) results.push(await assertCinematicIntro(name, viewport));
const durations = results.map(({ duration }) => duration);
if (Math.max(...durations) - Math.min(...durations) > 350) {
  throw new Error(`Premium intro timing diverged across displays (${durations.join(' / ')}ms)`);
}

const reduced = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
const reducedPage = await reduced.newPage();
await reducedPage.goto(baseURL, { waitUntil: 'domcontentloaded' });
await reducedPage.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 1500 });
if (await reducedPage.locator('[data-cinematic-intro]').count()) throw new Error('Reduced-motion mode should skip the cinematic intro');
await reduced.close();

await browser.close();
console.log(`Premium XO WEB intro stays centered and resolves into the header across seven display classes (${Math.min(...durations)}–${Math.max(...durations)}ms).`);
