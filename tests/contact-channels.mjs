import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.CONTACTS_BASE_URL ?? 'http://127.0.0.1:4322';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });

async function openPage(path, viewport, { waitForHomeIntro = false } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'load' });
  assert(response?.ok(), `${path} returned ${response?.status()} in enabled-contact QA`);
  await page.evaluate(() => document.fonts.ready);
  if (waitForHomeIntro) {
    await page.waitForFunction(() => document.querySelector('[data-home-intro]')?.getAttribute('data-home-intro') === 'ready', undefined, { timeout: 2_000 });
  }
  return { context, page };
}

async function assertChannels(page, scope, expectedMessage) {
  const links = page.locator(`${scope} .contact-channels > a`);
  assert(await links.count() === 2, `${scope} did not render exactly WhatsApp and Instagram`);

  const whatsapp = page.locator(`${scope} a[data-contact-channel="whatsapp"]`);
  const instagram = page.locator(`${scope} a[data-contact-channel="instagram"]`);
  assert(await whatsapp.count() === 1, `${scope} is missing WhatsApp`);
  assert(await instagram.count() === 1, `${scope} is missing Instagram`);

  const whatsappHref = await whatsapp.getAttribute('href');
  const instagramHref = await instagram.getAttribute('href');
  const whatsappUrl = new URL(whatsappHref);
  assert(whatsappUrl.hostname === 'wa.me' && whatsappUrl.pathname === '/37120000000', `${scope} built an invalid WhatsApp deep link: ${whatsappHref}`);
  assert(whatsappUrl.searchParams.get('text') === expectedMessage, `${scope} lost the localized WhatsApp opening message`);
  assert(new URL(instagramHref).hostname.replace(/^www\./, '') === 'instagram.com', `${scope} built an invalid Instagram link: ${instagramHref}`);

  const whatsappDisplay = (await whatsapp.locator('.contact-channels__display').innerText()).trim();
  assert(whatsappDisplay === '+371 20 000 000', `${scope} did not format the Latvian WhatsApp number for reading: ${whatsappDisplay}`);

  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  assert(overflow <= 2, `${scope} enabled contact state causes ${overflow}px horizontal overflow`);
}

const enMessage = 'Hi! I visited xoweb.lv and would like to discuss a website project.';
const lvMessage = 'Sveiki! Apskatīju xoweb.lv un vēlos pārrunāt mājaslapas projektu.';

{
  const { context, page } = await openPage('/', { width: 1366, height: 768 }, { waitForHomeIntro: true });
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await assertChannels(page, '#contact', enMessage);
  await page.screenshot({ path: `${outDir}/future-contacts-en-desktop.png`, fullPage: false });
  await context.close();
}

{
  const { context, page } = await openPage('/lv/', { width: 393, height: 852 }, { waitForHomeIntro: true });
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await assertChannels(page, '#contact', lvMessage);
  await page.screenshot({ path: `${outDir}/future-contacts-lv-mobile.png`, fullPage: false });

  await page.evaluate(() => window.scrollTo(0, 0));
  const toggle = page.locator('[data-menu-toggle]');
  await toggle.click();
  await page.waitForTimeout(540);
  await assertChannels(page, '[data-mobile-menu]', lvMessage);
  await page.screenshot({ path: `${outDir}/future-contacts-lv-menu.png`, fullPage: false });
  await context.close();
}

{
  const { context, page } = await openPage('/work/catrin/', { width: 393, height: 852 });
  await page.locator('.case-contact').scrollIntoViewIfNeeded();
  await assertChannels(page, '.case-contact', enMessage);
  await page.screenshot({ path: `${outDir}/future-contacts-catrin-mobile.png`, fullPage: false });
  await context.close();
}

const multipageContactRoutes = [
  ['/work/', 'en-work', enMessage],
  ['/about/', 'en-about', enMessage],
  ['/services/', 'en-services', enMessage],
  ['/lv/darbi/', 'lv-work', lvMessage],
  ['/lv/par-mani/', 'lv-about', lvMessage],
  ['/lv/pakalpojumi/', 'lv-services', lvMessage],
];

for (const [path, slug, message] of multipageContactRoutes) {
  const { context, page } = await openPage(path, { width: 393, height: 852 });
  const contact = page.locator('#contact');
  assert(await contact.count() === 1, `${path} is missing the shared PageContact section`);
  await contact.scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  await assertChannels(page, '#contact', message);
  await page.screenshot({ path: `${outDir}/future-contacts-${slug}-mobile.png`, fullPage: false });
  await context.close();
}

await browser.close();
console.log('Enabled contact QA passed across home, mobile menu, case study and all EN/LV multipage contact surfaces.');
