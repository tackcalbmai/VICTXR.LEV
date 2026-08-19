import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function read(relative) {
  return readFile(new URL(relative, root), 'utf8');
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (['.astro', '.ts', '.css'].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

const pages = {
  homeEn: await readFile(new URL('index.html', dist), 'utf8'),
  homeLv: await readFile(new URL('lv/index.html', dist), 'utf8'),
  workEn: await readFile(new URL('work/index.html', dist), 'utf8'),
  workLv: await readFile(new URL('lv/darbi/index.html', dist), 'utf8'),
  aboutEn: await readFile(new URL('about/index.html', dist), 'utf8'),
  aboutLv: await readFile(new URL('lv/par-mani/index.html', dist), 'utf8'),
  servicesEn: await readFile(new URL('services/index.html', dist), 'utf8'),
  servicesLv: await readFile(new URL('lv/pakalpojumi/index.html', dist), 'utf8'),
  contactEn: await readFile(new URL('contact/index.html', dist), 'utf8'),
  contactLv: await readFile(new URL('lv/kontakti/index.html', dist), 'utf8'),
  catrinEn: await readFile(new URL('work/catrin/index.html', dist), 'utf8'),
  catrinLv: await readFile(new URL('lv/darbi/catrin/index.html', dist), 'utf8'),
  anelikaEn: await readFile(new URL('work/anelika/index.html', dist), 'utf8'),
  anelikaLv: await readFile(new URL('lv/darbi/anelika/index.html', dist), 'utf8'),
  notFoundEn: await readFile(new URL('404.html', dist), 'utf8'),
  notFoundLv: await readFile(new URL('lv/404.html', dist), 'utf8'),
};

for (const preview of ['public/xo-web-preview.png', 'public/social-preview.png', 'public/og/catrin.png', 'public/og/anelika.png']) {
  const imagePath = fileURLToPath(new URL(`../${preview}`, import.meta.url));
  const metadata = await sharp(imagePath).metadata();
  assert(metadata.width === 1200 && metadata.height === 630, `${preview} is not a 1200×630 social preview`);
  await sharp(imagePath).raw().toBuffer();
}

const routablePages = {
  '/': pages.homeEn,
  '/lv/': pages.homeLv,
  '/work/': pages.workEn,
  '/lv/darbi/': pages.workLv,
  '/about/': pages.aboutEn,
  '/lv/par-mani/': pages.aboutLv,
  '/services/': pages.servicesEn,
  '/lv/pakalpojumi/': pages.servicesLv,
  '/contact/': pages.contactEn,
  '/lv/kontakti/': pages.contactLv,
  '/work/catrin/': pages.catrinEn,
  '/lv/darbi/catrin/': pages.catrinLv,
  '/work/anelika/': pages.anelikaEn,
  '/lv/darbi/anelika/': pages.anelikaLv,
};

for (const [name, html] of Object.entries(pages)) {
  assert(!html.includes('href="#"'), `${name} contains a placeholder href="#"`);
  assert(!html.includes('�'), `${name} contains a replacement character`);
  assert(!/\b(?:href|src)="http:\/\//.test(html), `${name} contains a mixed-content URL`);
  assert(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'), `${name} is missing safe-area viewport support`);
  assert(html.includes('rel="canonical"'), `${name} is missing a canonical URL`);
  assert(html.includes('property="og:image"'), `${name} is missing an Open Graph image`);
  assert(html.includes('property="og:image:type" content="image/png"'), `${name} is missing the Open Graph image type`);
  assert(html.includes('name="twitter:card"'), `${name} is missing Twitter card metadata`);
  assert((html.match(/hreflang=/g) ?? []).length >= 3, `${name} is missing hreflang coverage`);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) {
    assert(/\balt(?:="[^"]*")?(?:\s|>)/.test(image[0]), `${name} contains an image without an alt attribute`);
    assert(/\bwidth="\d+"/.test(image[0]) && /\bheight="\d+"/.test(image[0]), `${name} contains an image without intrinsic dimensions`);
  }
}

const titles = [];
const descriptions = [];
const canonicals = [];
for (const [route, html] of Object.entries(routablePages)) {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert(title && description && canonical, `${route} has incomplete search metadata`);
  titles.push(title);
  descriptions.push(description);
  canonicals.push(canonical);

  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|tel:)/.test(href)) continue;
    const target = new URL(href, `https://internal.test${route}`);
    const targetPage = routablePages[target.pathname];
    assert(targetPage, `${route} links to a missing internal route: ${href}`);
    if (target.hash) {
      const id = decodeURIComponent(target.hash.slice(1));
      assert(targetPage.includes(`id="${id}"`), `${route} links to a missing fragment: ${href}`);
    }
  }
}
assert(new Set(titles).size === titles.length, 'Indexable pages reuse a title');
assert(new Set(descriptions).size === descriptions.length, 'Indexable pages reuse a meta description');
assert(new Set(canonicals).size === canonicals.length, 'Indexable pages reuse a canonical URL');

assert(pages.homeLv.includes('href="/fonts/onest-latin.woff2"') && pages.homeLv.includes('href="/fonts/onest-latin-ext.woff2"'), 'Latvian pages do not preload both Onest subsets');
assert(pages.catrinEn.includes('href="/fonts/noto-serif-display-latin.woff2"'), 'CATRIN does not preload its display face');
assert(pages.catrinEn.includes('class="site-language" href="/lv/darbi/catrin/"'), 'English CATRIN language switch loses case context');
assert(pages.catrinLv.includes('class="site-language" href="/work/catrin/"'), 'Latvian CATRIN language switch loses case context');
assert(pages.anelikaEn.includes('class="site-language" href="/lv/darbi/anelika/"'), 'English ANELIKA language switch loses case context');
assert(pages.anelikaLv.includes('class="site-language" href="/work/anelika/"'), 'Latvian ANELIKA language switch loses case context');
assert(pages.contactEn.includes('class="site-language" href="/lv/kontakti/"'), 'English Contact language switch loses contact context');
assert(pages.contactLv.includes('class="site-language" href="/contact/"'), 'Latvian Contact language switch loses contact context');
assert(pages.notFoundEn.includes('<html lang="en"') && pages.notFoundEn.includes('Something looks wrong.'), 'English 404 is not natively rendered in English');
assert(pages.notFoundLv.includes('<html lang="lv"') && pages.notFoundLv.includes('Kaut kas nav pareizi.'), 'Latvian 404 did not set localized content');
assert(pages.notFoundLv.includes('Šī lapa neeksistē.'), 'Latvian 404 metadata is not localized');
assert(!pages.notFoundEn.includes("location.pathname.startsWith('/lv/')"), '404 localization still depends on client-side path mutation');

const rendered = Object.values(pages).join('\n');
assert(/<nav class="contact-channels/.test(rendered), 'Configured social channels are not rendered');
assert(/href="https:\/\/wa\.me\//.test(rendered), 'The production WhatsApp deep link is missing');
assert(/href="https:\/\/(?:www\.)?instagram\.com\//.test(rendered), 'The production Instagram link is missing');

const contactsSource = await read('src/data/contacts.ts');
assert(contactsSource.includes("'hello@xoweb.lv'"), 'The active fallback email is missing from the centralized contacts config');
assert(contactsSource.includes('PUBLIC_CONTACT_EMAIL'), 'The contact config cannot be safely build-tested with an email override');
assert(contactsSource.includes('PUBLIC_CONTACT_WHATSAPP'), 'The contact config cannot be build-tested with a WhatsApp override');
assert(contactsSource.includes('PUBLIC_CONTACT_INSTAGRAM'), 'The contact config cannot be safely build-tested with an Instagram override');
assert(contactsSource.includes('https://wa.me/'), 'The contacts config is missing the WhatsApp deep-link builder');
assert(contactsSource.includes('encodeURIComponent(copy.whatsappMessage)'), 'The WhatsApp message is not localized and URL encoded');

const arrowSource = await read('src/components/Arrow.astro');
assert(arrowSource.includes('--brand-arrow-angle: 90deg'), 'Down arrows are not locked to a true vertical direction');
assert(arrowSource.includes('--brand-arrow-angle: -90deg'), 'Up arrows are not locked to a true vertical direction');
assert(arrowSource.includes('--brand-arrow-angle: 180deg'), 'Left arrows are not locked to a true horizontal direction');
assert(!arrowSource.includes('45deg'), 'The brand arrow component has regressed to a diagonal direction');
assert(arrowSource.includes('brand-arrow__spine') && arrowSource.includes('brand-arrow__head'), 'The restrained editorial arrow geometry is missing');
assert(arrowSource.includes('stroke-linecap: square') && arrowSource.includes('stroke-linejoin: miter'), 'The premium arrow lost its crisp optical treatment');
assert(!arrowSource.includes('brand-arrow__blade') && !arrowSource.includes('brand-arrow__notch'), 'Decorative arrow gimmicks returned to the glyph');

const homeSource = await read('src/components/HomePage.astro');
const heroWorkAction = homeSource.match(/<a href=\{routes\.work\}[^>]*data-analytics-event="view_work_click"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? '';
const heroContactAction = homeSource.match(/<a href=\{contactHref\}[^>]*data-analytics-event="start_project_click"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? '';
assert(heroWorkAction.includes('<Arrow direction="right" />'), 'Homepage Work CTA does not point forward to the Work page');
assert(heroContactAction.includes('<Arrow direction="right" />'), 'Homepage Contact CTA does not point forward to the Contact page');
assert(homeSource.includes("buildContactHref(locale, 'home'"), 'Homepage Contact actions do not preserve Home as their source context');
assert(homeSource.includes('class="home-v2-work"') && homeSource.includes('class="home-v2-perspective"') && homeSource.includes('class="home-v2-close"'), 'Homepage trailer architecture is incomplete');
assert(homeSource.includes('home-v2-project__logic') && homeSource.includes('workScenes.catrin') && homeSource.includes('workScenes.anelika'), 'Selected Work lost its project-specific X/O decision language');
assert(!homeSource.includes('class="about section-pad"') && !homeSource.includes('class="services section-pad"') && !homeSource.includes('class="anti-sales"'), 'Homepage still contains full duplicated landing sections');

const caseSource = await read('src/components/CaseStudy.astro');
const caseLiveAction = caseSource.match(/<a class="case-live-link"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? '';
assert(caseLiveAction.includes('<Arrow direction="right" />'), 'Case-study outbound link does not use a forward arrow');
assert(!caseLiveAction.includes('<Arrow direction="up" />'), 'Case-study outbound link still uses an upward/diagonal arrow');
assert(caseSource.includes('<PageContactCTA'), 'Case studies do not end with the compact dedicated-Contact transition');
assert(caseSource.includes('source={`case-${projectId}`}'), 'Case-study Contact exits do not preserve the project source context');
for (const [name, html, stages] of [
  ['CATRIN EN', pages.catrinEn, ['Problem', 'Observation', 'Decision', 'Design', 'Development', 'Result']],
  ['CATRIN LV', pages.catrinLv, ['Problēma', 'Novērojums', 'Lēmums', 'Dizains', 'Izstrāde', 'Rezultāts']],
  ['ANELIKA EN', pages.anelikaEn, ['Problem', 'Observation', 'Decision', 'Design', 'Development', 'Result']],
  ['ANELIKA LV', pages.anelikaLv, ['Problēma', 'Novērojums', 'Lēmums', 'Dizains', 'Izstrāde', 'Rezultāts']],
]) {
  assert((html.match(/class="case-narrative__row/g) ?? []).length === 6, `${name} does not expose the six-stage decision narrative`);
  stages.forEach((stage) => assert(
    html.includes(`>${stage}</span>`) || html.includes(`/ ${stage}</span>`),
    `${name} is missing ${stage}`,
  ));
}

const pageContactCtaSource = await read('src/components/PageContactCTA.astro');
assert(pageContactCtaSource.includes('buildContactHref(locale'), 'Compact contact CTA does not use the localized context-aware Contact route builder');
assert(pageContactCtaSource.includes("undefined, 'start'"), 'Compact contact CTA does not land at the Contact starting-point router');
assert(pageContactCtaSource.includes('data-contact-context='), 'Compact contact CTA does not expose source context for analytics and QA');
assert(pageContactCtaSource.includes('<Arrow direction="up" />'), 'Compact contact footer back-to-top action does not point up');

const contactPageSource = await read('src/components/ContactPage.astro');
assert(contactPageSource.includes('data-contact-intent') && contactPageSource.includes('data-contact-email'), 'Dedicated Contact page lost its starting-point interaction');
assert(contactPageSource.includes('data-contact-brief') && contactPageSource.includes('data-router-whatsapp') && contactPageSource.includes('data-router-email'), 'Dedicated Contact page lost the short-brief channel router');
assert(contactPageSource.includes('getContactPageCopy(locale)') && contactPageSource.includes('getContactRouterCopy(locale)'), 'Dedicated Contact page is not localized through shared copy');
assert((pages.contactEn.match(/data-contact-intent=/g) ?? []).length === 4, 'English Contact router does not expose four low-pressure starting points');
assert((pages.contactLv.match(/data-contact-intent=/g) ?? []).length === 4, 'Latvian Contact router does not expose four low-pressure starting points');

const analyticsSource = await read('src/scripts/analytics.ts');
for (const event of ['project_open', 'case_study_view', 'service_interaction', 'contact_page_view', 'whatsapp_click', 'email_click', 'brief_builder_start', 'brief_builder_complete', 'language_switch']) {
  assert(analyticsSource.includes(event) || rendered.includes(`data-analytics-event="${event}"`), `Analytics coverage is missing ${event}`);
}
assert(analyticsSource.includes('window.zaraz.track') && analyticsSource.includes("window.dispatchEvent(new CustomEvent('xo:analytics'"), 'Analytics has no production provider bridge or observable QA event');
assert(!analyticsSource.includes('values.problem') && !analyticsSource.includes('values.change'), 'Analytics must not transmit brief text');

const homeMotionSource = await read('src/scripts/home.ts');
assert(homeMotionSource.includes('data-cinematic-wordmark') && homeMotionSource.includes('BY VICTXR.LEV') && !homeMotionSource.includes('<span>VICT</span>'), 'Cinematic intro still puts the author above the XO WEB brand');
assert(homeMotionSource.includes('skipCinematic') && homeMotionSource.includes("trigger: antiSales"), 'Cinematic control handoff or stale GSAP-target guard is missing');

const astroConfig = await read('astro.config.mjs');
assert(astroConfig.includes("inlineStylesheets: 'auto'"), 'Shared CSS is still duplicated into every static document');
assert(/rel="stylesheet" href="\/_astro\//.test(pages.homeEn), 'The cacheable production stylesheet is missing from Home');

const dockSource = await read('src/components/ContactDock.astro');
const layoutSource = await read('src/layouts/BaseLayout.astro');
assert(layoutSource.includes('<ContactDock locale={lang} canonicalPath={canonicalPath} />'), 'The global Contact dock is not mounted from the base layout');
assert(dockSource.includes('buildContactHref(locale, source') && dockSource.includes('data-contact-dock-toggle'), 'The global Contact dock lost contextual routing or its interaction hook');
assert(dockSource.includes('isContactPage') && dockSource.includes('{!isContactPage && ('), 'The Contact page would duplicate the global Contact dock');

const channelsSource = await read('src/components/ContactChannels.astro');
assert(channelsSource.includes('<Arrow direction="right" />'), 'Outbound social channels do not use a forward arrow');
assert(!channelsSource.includes('<Arrow direction="up" />'), 'Outbound social channels still use an upward/diagonal arrow');

const files = await sourceFiles(fileURLToPath(new URL('../src/', import.meta.url)));
const allSource = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
assert((allSource.match(/hello@xoweb\.lv/g) ?? []).length === 1, 'The contact email is hardcoded outside the centralized config');
for (const stalePhrase of ['gatavs produkcijas kods', 'Jelgava / all Latvia', 'Atsevišķi pakalpojumu centri', 'web izstrādātājs']) {
  assert(!allSource.includes(stalePhrase), `Stale or unnatural copy remains: ${stalePhrase}`);
}

const headers = await readFile(new URL('_headers', dist), 'utf8');
for (const header of ['Content-Security-Policy:', 'Permissions-Policy:', 'Referrer-Policy:', 'Strict-Transport-Security:', 'X-Content-Type-Options:', 'X-Frame-Options:']) {
  assert(headers.includes(header), `Production headers are missing ${header}`);
}
assert(headers.includes('/_astro/*') && headers.includes('immutable'), 'Hashed assets are missing immutable caching');
assert(headers.includes('/xo-web-preview.png') && headers.includes('/og/*'), 'Social previews are missing explicit cache policy');

const robots = await read('public/robots.txt');
const sitemap = await readFile(new URL('sitemap-index.xml', dist), 'utf8');
assert(robots.includes('Sitemap: https://'), 'robots.txt does not advertise the sitemap over HTTPS');
assert(sitemap.includes('<sitemapindex'), 'The sitemap index was not generated');

console.log('Static production audit passed: Home trailer, contextual Contact router, all indexable EN/LV routes, internal links, metadata, contacts and security headers are consistent.');
