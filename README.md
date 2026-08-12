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
- Centralized contact configuration with dormant Instagram and WhatsApp channels
- Production security headers and immutable caching for hashed assets

## Routes

- `/` and `/lv/`
- `/work/catrin/` and `/lv/darbi/catrin/`
- `/work/anelika/` and `/lv/darbi/anelika/`

## Commands

```sh
npm ci
npm run check
npm run build
npm run audit:static
npm run visual  # run after starting the local preview
npm run deploy
```

Production is connected to GitHub and deploys through Cloudflare automatically. The deploy command is a manual fallback, not part of the normal release flow.

Visual QA covers the animated opening at desktop/mobile sizes, a 16-viewport responsive matrix from 320 to 1920 pixels, mobile landscape, low-height desktop, bilingual case studies, navigation history, menu states and reduced motion. GitHub Actions runs type checks, a production build, the static production audit and Playwright screenshots on every pull request.

## Contacts

All public contact values live in `src/data/contacts.ts`:

- `email`: the current public mailbox;
- `whatsapp`: an international number, preferably in E.164 form;
- `instagram`: the full HTTPS profile URL.

Keep a channel empty until the real account exists. Empty channels render no link, icon or placeholder. Adding a real value activates the shared contact UI and metadata without editing page components. See `docs/contact-setup.md` before connecting a domain mailbox.
