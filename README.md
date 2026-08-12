# VICTXR.LEV

Independent web designer & developer portfolio for Victxr Lev.

## Brand idea

**Different perspective.**  
Controlled chaos outside. Surgical precision inside.

The website itself is the primary case study: premium editorial minimalism, deliberate perspective shifts, broken-grid moments, typography-led motion, and technically precise performance.

## Stack

- Astro 7
- TypeScript
- GSAP + ScrollTrigger
- CSS custom properties / native CSS
- Cloudflare Workers Static Assets
- GitHub

## Experience

- EN and LV home pages with intentional desktop and mobile direction
- CATRIN and ANELIKA project entries plus full bilingual case studies
- CSS-first opening sequence, GSAP scroll choreography, X/O brand motion and reduced-motion fallbacks
- Responsive navigation, keyboard focus handling and copy-email interaction
- Canonical and alternate-language metadata, social cards, sitemap, robots and structured data
- Custom 404 served by Cloudflare Static Assets

## Routes

- `/` and `/lv/`
- `/work/catrin/` and `/lv/darbi/catrin/`
- `/work/anelika/` and `/lv/darbi/anelika/`

## Commands

```sh
npm ci
npm run check
npm run build
npm run visual  # run after starting the local preview
npm run deploy
```

Visual QA covers six home viewport/language combinations and desktop/mobile case-study views. GitHub Actions runs type checks, a production build and Playwright screenshots on every change to `main`.
