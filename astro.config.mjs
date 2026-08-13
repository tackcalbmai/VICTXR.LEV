import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://xoweb.lv',
  output: 'static',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'always',
  },
});
