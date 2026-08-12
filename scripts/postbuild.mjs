import { copyFile } from 'node:fs/promises';

// Cloudflare Workers Static Assets with not_found_handling="404-page"
// serves the nearest 404.html. Astro emits /lv/404/index.html for the route,
// so copy that prerendered page one level up after every build.
await copyFile('dist/lv/404/index.html', 'dist/lv/404.html');

console.log('Localized 404 asset published at dist/lv/404.html.');
