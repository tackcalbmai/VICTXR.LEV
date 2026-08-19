import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://xoweb.lv',
  output: 'static',
  integrations: [sitemap()],
  build: {
    // Shared CSS is intentionally cacheable across the 16 static EN/LV routes.
    // Astro still inlines genuinely small chunks, while large page systems stay
    // render-blocking external stylesheets instead of bloating every document.
    inlineStylesheets: 'auto',
  },
});
