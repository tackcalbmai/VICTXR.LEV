import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:4321';
const outDir = 'artifacts/visual';
await mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });

async function open(path, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'load' });
  assert(response?.ok(), `${path} returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
  return { context, page, errors };
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  assert(overflow <= 2, `${label} has ${overflow}px horizontal overflow`);
}

for (const scenario of [
  {
    path: '/contact/?from=services&intent=fix#talk',
    locale: 'en',
    starter: 'Hi! I’d like to improve an existing website.',
    business: 'North Star Studio',
    website: 'https://example.com',
    problem: 'People do not understand the offer quickly enough.',
    change: 'Make the offer clear and turn more visits into enquiries.',
    expectedIntent: 'fix',
  },
  {
    path: '/lv/kontakti/?from=pakalpojumi&intent=fix#talk',
    locale: 'lv',
    starter: 'Sveiki! Vēlos uzlabot esošu mājaslapu.',
    business: 'Ziemeļu Studija',
    website: 'https://example.lv',
    problem: 'Apmeklētāji pārāk lēni saprot piedāvājumu.',
    change: 'Padarīt piedāvājumu skaidru un palielināt pieteikumu skaitu.',
    expectedIntent: 'fix',
  },
]) {
  const { context, page, errors } = await open(scenario.path, { width: 393, height: 852 });

  assert(await page.locator('[data-contact-dock]').count() === 0, `${scenario.locale} Contact page should not duplicate the global contact dock`);
  const active = page.locator(`[data-contact-intent="${scenario.expectedIntent}"]`);
  assert(await active.getAttribute('aria-pressed') === 'true', `${scenario.locale} query intent did not activate ${scenario.expectedIntent}`);

  const primaryWhatsapp = page.locator('.contact-talk [data-router-whatsapp]').first();
  const initialWhatsapp = new URL(await primaryWhatsapp.getAttribute('href'));
  assert(initialWhatsapp.hostname === 'wa.me', `${scenario.locale} primary WhatsApp link is invalid`);
  assert(initialWhatsapp.searchParams.get('text')?.startsWith(scenario.starter), `${scenario.locale} WhatsApp did not inherit the selected intent`);

  await page.locator('[name="business"]').fill(scenario.business);
  await page.locator('[name="website"]').fill(scenario.website);
  await page.locator('[name="problem"]').fill(scenario.problem);
  await page.locator('[name="change"]').fill(scenario.change);

  const briefWhatsapp = page.locator('[data-brief-whatsapp]');
  const builtWhatsapp = new URL(await briefWhatsapp.getAttribute('href'));
  const whatsappText = builtWhatsapp.searchParams.get('text') ?? '';
  for (const value of [scenario.starter, scenario.business, scenario.website, scenario.problem, scenario.change]) {
    assert(whatsappText.includes(value), `${scenario.locale} brief -> WhatsApp lost: ${value}`);
  }

  const emailHref = await page.locator('.contact-brief [data-router-email]').getAttribute('href');
  const emailBody = decodeURIComponent((emailHref ?? '').split('&body=')[1] ?? '');
  for (const value of [scenario.business, scenario.website, scenario.problem, scenario.change]) {
    assert(emailBody.includes(value), `${scenario.locale} brief -> Email lost: ${value}`);
  }

  await page.locator('#brief').scrollIntoViewIfNeeded();
  await assertNoOverflow(page, `${scenario.locale} Contact brief`);
  await page.screenshot({ path: `${outDir}/contact-router-${scenario.locale}-mobile.png`, fullPage: false });
  assert(errors.length === 0, `${scenario.locale} Contact router emitted runtime errors: ${errors.join(' | ')}`);
  await context.close();
}

{
  const { context, page, errors } = await open('/work/', { width: 393, height: 852 });
  const dock = page.locator('[data-contact-dock]');
  assert(await dock.count() === 1, 'Work should expose the global O/CONTACT dock');
  assert(await dock.evaluate((node) => node.classList.contains('is-visible')), 'Internal-page contact dock should be immediately visible');

  await page.locator('[data-contact-dock-toggle]').click();
  const panel = page.locator('[data-contact-dock-panel]');
  assert(await panel.getAttribute('aria-hidden') === 'false', 'O/CONTACT dock did not open');
  assert(await panel.locator('a[href="/contact/?from=work#start"]').count() === 1, 'Work dock lost its contextual Contact route');
  assert(await panel.locator('a[href="/contact/?from=work#brief"]').count() === 1, 'Work dock lost its contextual Short Brief route');
  assert(await panel.locator('a[data-contact-channel="whatsapp"]').count() === 1, 'Work dock is missing WhatsApp');
  assert(await panel.locator('a[data-contact-channel="email"]').count() === 1, 'Work dock is missing Email');
  assert(await panel.locator('a[data-contact-channel="instagram"]').count() === 1, 'Work dock is missing Instagram');
  await assertNoOverflow(page, 'Open Work contact dock');
  await page.screenshot({ path: `${outDir}/contact-dock-work-mobile.png`, fullPage: false });
  assert(errors.length === 0, `Contact dock emitted runtime errors: ${errors.join(' | ')}`);
  await context.close();
}

{
  const { context, page } = await open('/services/', { width: 1366, height: 768 });
  const pageExit = page.locator('.page-contact-cta a[data-contact-context="services"]');
  assert(await pageExit.count() === 1, 'Services should expose a problem-first contextual exit');
  assert(await pageExit.getAttribute('href') === '/contact/?from=services#start', 'Services contextual exit lost its source context');
  await context.close();
}

await browser.close();
console.log('Contact router QA passed: EN/LV intent sync, brief composition, contextual page exits and global O/CONTACT dock.');
