import { readdir, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const files = await walk('dist');
const sized = await Promise.all(files.map(async (path) => ({ path, size: (await stat(path)).size, ext: extname(path).toLowerCase() })));
const assertBudget = (condition, message) => { if (!condition) throw new Error(message); };
const kb = (bytes) => `${(bytes / 1024).toFixed(1)}kB`;

const html = sized.filter((file) => file.ext === '.html');
const js = sized.filter((file) => file.ext === '.js' && file.path.includes(`${join('dist', '_astro')}`));
const fonts = sized.filter((file) => file.ext === '.woff2');
const optimizedRaster = sized.filter((file) => file.path.includes(`${join('dist', '_astro')}`) && ['.webp', '.avif', '.png', '.jpg', '.jpeg'].includes(file.ext));

for (const file of html) assertBudget(file.size <= 260 * 1024, `${relative('dist', file.path)} HTML exceeds 260kB (${kb(file.size)})`);
for (const file of js) assertBudget(file.size <= 180 * 1024, `${relative('dist', file.path)} JS chunk exceeds 180kB (${kb(file.size)})`);
for (const file of fonts) assertBudget(file.size <= 150 * 1024, `${relative('dist', file.path)} font exceeds 150kB (${kb(file.size)})`);
for (const file of optimizedRaster) assertBudget(file.size <= 160 * 1024, `${relative('dist', file.path)} optimized raster exceeds 160kB (${kb(file.size)})`);

const totalJs = js.reduce((sum, file) => sum + file.size, 0);
const totalFonts = fonts.reduce((sum, file) => sum + file.size, 0);
assertBudget(totalJs <= 320 * 1024, `Total production JS exceeds 320kB (${kb(totalJs)})`);
assertBudget(totalFonts <= 420 * 1024, `Total self-hosted fonts exceed 420kB (${kb(totalFonts)})`);

const unoptimizedRaster = sized.filter((file) => file.path.includes(`${join('dist', '_astro')}`) && ['.jpg', '.jpeg', '.png'].includes(file.ext));
assertBudget(unoptimizedRaster.length === 0, `Unoptimized raster leaked into _astro: ${unoptimizedRaster.map((file) => relative('dist', file.path)).join(', ')}`);

console.log(`Performance budgets passed: ${kb(totalJs)} JS, ${kb(totalFonts)} fonts, max HTML ${kb(Math.max(...html.map((file) => file.size)))}, max optimized image ${kb(Math.max(...optimizedRaster.map((file) => file.size)))}.`);
