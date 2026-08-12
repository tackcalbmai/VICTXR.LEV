import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

const viewports = [
  ['desktop', { width: 1366, height: 768 }],
  ['mobile-393', { width: 393, height: 852 }],
  ['mobile-320', { width: 320, height: 700 }],
];

for (const [name, viewport] of viewports) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  if (!response?.ok()) throw new Error(`${name} homepage returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);

  await page.evaluate(() => {
    const contact = document.querySelector('#contact');
    const actions = contact?.querySelector('.contact__actions');
    if (!contact || !actions) throw new Error('Contact target is missing');
    const nav = document.createElement('nav');
    nav.className = 'contact-channels';
    nav.setAttribute('aria-label', 'Other ways to get in touch');
    const channels = [
      ['WhatsApp', '+371 2000 0000'],
      ['Instagram', '@victxr.lev'],
    ];
    for (const [label, display] of channels) {
      const link = document.createElement('a');
      link.href = '#';
      link.innerHTML = `<span class="contact-channels__icon" aria-hidden="true">○</span><span class="contact-channels__label">${label}</span><span class="contact-channels__display">${display}</span><span class="ui-arrow" aria-hidden="true">↗</span>`;
      nav.append(link);
    }
    actions.insertAdjacentElement('afterend', nav);
  });

  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  const state = await page.evaluate(() => {
    const nav = document.querySelector('.contact-channels');
    const rect = nav.getBoundingClientRect();
    const links = [...nav.querySelectorAll('a')].map((link) => {
      const box = link.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width, height: box.height };
    });
    return {
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
      navLeft: rect.left,
      navRight: rect.right,
      links,
    };
  });
  if (state.overflow > 2) throw new Error(`${name} enabled social contacts cause ${state.overflow}px horizontal overflow`);
  if (state.navLeft < -2 || state.navRight > viewport.width + 2) throw new Error(`${name} enabled social contact rail escapes the viewport`);
  if (state.links.some((link) => link.height < 44 || link.left < -2 || link.right > viewport.width + 2)) throw new Error(`${name} enabled social contact target is clipped or smaller than 44px`);
  await page.screenshot({ path: `${outDir}/${name}-contacts-enabled.png`, fullPage: false });
  await context.close();
}

await browser.close();
console.log('Enabled Instagram/WhatsApp contact layout passed at 320, 393 and 1366px.');
