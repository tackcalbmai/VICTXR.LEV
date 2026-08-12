import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist/lv', { recursive: true });
await copyFile('dist/lv/404/index.html', 'dist/lv/404.html');
console.log('Localized Cloudflare 404 fallback prepared at dist/lv/404.html');
