import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  catrinEn: await readFile(new URL('work/catrin/index.html', dist), 'utf8'),
  catrinLv: await readFile(new URL('lv/darbi/catrin/index.html', dist), 'utf8'),
  anelikaEn: await readFile(new URL('work/anelika/index.html', dist), 'utf8'),
  anelikaLv: await readFile(new URL('lv/darbi/anelika/index.html', dist), 'utf8'),
  notFoundEn: await readFile(new URL('404.html', dist), 'utf8'),
  notFoundLv: await readFile(new URL('lv/404.html', dist), 'utf8'),
};

const routablePages = {
  '/': pages.homeEn,
  '/lv/': pages.homeLv,
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
assert(pages.notFoundEn.includes('<html lang="en"') && pages.notFoundEn.includes('Something looks wrong.'), 'English 404 is not natively rendered in English');
assert(pages.notFoundLv.includes('<html lang="lv"') && pages.notFoundLv.includes('Kaut kas nav pareizi.'), 'Latvian 404 is not natively rendered in Latvian');
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

const robots = await read('public/robots.txt');
const sitemap = await readFile(new URL('sitemap-index.xml', dist), 'utf8');
assert(robots.includes('Sitemap: https://'), 'robots.txt does not advertise the sitemap over HTTPS');
assert(sitemap.includes('<sitemapindex'), 'The sitemap index was not generated');

console.log('Static production audit passed: contacts, localized 404s, content, metadata, assets and security headers are consistent.');
