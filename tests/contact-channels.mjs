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

async function assertMenuChannels(page, scope, expectedMessage) {
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
}

async function assertDockChannels(page, scope, expectedMessage) {
  const whatsapp = page.locator(`${scope} a[data-contact-channel="whatsapp"]`);
  const email = page.locator(`${scope} a[data-contact-channel="email"]`);
  const instagram = page.locator(`${scope} a[data-contact-channel="instagram"]`);
  assert(await whatsapp.count() === 1, `${scope} is missing WhatsApp`);
  assert(await email.count() === 1, `${scope} is missing Email`);
  assert(await instagram.count() === 1, `${scope} is missing Instagram`);

  const whatsappHref = await whatsapp.getAttribute('href');
  const whatsappUrl = new URL(whatsappHref);
  assert(whatsappUrl.hostname === 'wa.me' && whatsappUrl.pathname === '/37120000000', `${scope} built an invalid WhatsApp deep link: ${whatsappHref}`);
  assert(whatsappUrl.searchParams.get('text') === expectedMessage, `${scope} lost the localized WhatsApp opening message`);
}

async function assertRouterChannels(page, starter) {
  const whatsapp = page.locator('.contact-talk a[data-router-whatsapp]').first();
  const instagram = page.locator('.contact-talk a[data-contact-channel="instagram"]');
  assert(await whatsapp.count() === 1, 'Contact router is missing its primary WhatsApp action');
  assert(await instagram.count() === 1, 'Contact router is missing Instagram');

  const whatsappUrl = new URL(await whatsapp.getAttribute('href'));
  assert(whatsappUrl.hostname === 'wa.me' && whatsappUrl.pathname === '/37120000000', `Contact router built an invalid WhatsApp deep link: ${whatsappUrl}`);
  assert(whatsappUrl.searchParams.get('text')?.startsWith(starter), 'Contact router did not use the localized intent-aware WhatsApp starter');

  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  assert(overflow <= 2, `Contact router enabled state causes ${overflow}px horizontal overflow`);
}

const enMessage = 'Hi! I visited xoweb.lv and would like to discuss a website project.';
const lvMessage = 'Sveiki! Apskatīju xoweb.lv un vēlos pārrunāt mājaslapas projektu.';

{
  const { context, page } = await openPage('/contact/', { width: 1366, height: 768 });
  await page.locator('.contact-talk').scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await assertRouterChannels(page, 'Hi! I’m not sure what web solution I need yet.');
  const intentCount = await page.locator('[data-contact-intent]').count();
  assert(intentCount === 3, `English Contact should expose three starting points, got ${intentCount}`);
  assert(await page.locator('[data-contact-brief]').count() === 1, 'English Contact is missing the short brief builder');
  await page.screenshot({ path: `${outDir}/future-contacts-en-desktop.png`, fullPage: false });
  await context.close();
}

{
  const { context, page } = await openPage('/lv/kontakti/', { width: 393, height: 852 });
  await page.locator('.contact-talk').scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await assertRouterChannels(page, 'Sveiki! Vēl nezinu, kāds web risinājums man ir vajadzīgs.');
  await page.screenshot({ path: `${outDir}/future-contacts-lv-mobile.png`, fullPage: false });

  await page.evaluate(() => window.scrollTo(0, 0));
  const toggle = page.locator('[data-menu-toggle]');
  await toggle.click();
  await page.waitForTimeout(540);
  await assertMenuChannels(page, '[data-mobile-menu]', lvMessage);
  await page.screenshot({ path: `${outDir}/future-contacts-lv-menu.png`, fullPage: false });
  await context.close();
}

const ctaRoutes = [
  ['/work/', '/contact/?from=work#start'],
  ['/about/', '/contact/?from=about#start'],
  ['/services/', '/contact/?from=services#start'],
  ['/work/catrin/', '/contact/?from=case-catrin#start'],
  ['/lv/darbi/', '/lv/kontakti/?from=work#start'],
  ['/lv/par-mani/', '/lv/kontakti/?from=about#start'],
  ['/lv/pakalpojumi/', '/lv/kontakti/?from=services#start'],
  ['/lv/darbi/catrin/', '/lv/kontakti/?from=case-catrin#start'],
];

for (const [path, expectedContact] of ctaRoutes) {
  const { context, page } = await openPage(path, { width: 393, height: 852 });
  const cta = page.locator('.page-contact-cta a[data-analytics-event="contact_page_click"]');
  assert(await cta.count() === 1, `${path} is missing the compact contact transition`);
  assert(await cta.getAttribute('href') === expectedContact, `${path} contact transition should route to ${expectedContact}`);
  await context.close();
}

{
  const { context, page } = await openPage('/services/', { width: 393, height: 852 });
  const dock = page.locator('[data-contact-dock]');
  assert(await dock.count() === 1, 'Internal pages should expose the global contact dock');
  await page.locator('[data-contact-dock-toggle]').click();
  await page.waitForTimeout(50);
  assert(await page.locator('[data-contact-dock-panel][aria-hidden="false"]').count() === 1, 'Contact dock did not open');
  await assertDockChannels(page, '[data-contact-dock-panel]', enMessage);
  await context.close();
}

await browser.close();
console.log('Enabled contact QA passed on the contact router, mobile menu, global contact dock and context-aware page exits.');
