import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type CuePair = {
  section: HTMLElement;
  cue: HTMLElement;
};

export function initPinnedScrollCues() {
  const root = document.documentElement;
  if (root.dataset.pinnedCuesInitialized === 'true') return;

  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-disruption], [data-anti-sales]'));
  if (!sections.length) return;

  root.dataset.pinnedCuesInitialized = 'true';
  const label = root.lang === 'lv' ? 'Ritini tālāk' : 'Keep scrolling';
  const pairs: CuePair[] = [];

  for (const section of sections) {
    const stage = section.querySelector<HTMLElement>('.disruption__stage, .anti-sales__stage');
    if (!stage) continue;

    let cue = stage.querySelector<HTMLElement>('[data-pin-scroll-cue]');
    if (!cue) {
      cue = document.createElement('div');
      cue.className = 'pin-scroll-cue';
      cue.dataset.pinScrollCue = '';
      cue.dataset.visible = 'false';
      cue.setAttribute('aria-hidden', 'true');
      cue.innerHTML = `
        <span class="pin-scroll-cue__label">${label}</span>
        <svg class="pin-scroll-cue__arrow" viewBox="0 0 22 36" aria-hidden="true" fill="none">
          <g class="pin-scroll-cue__arrow-main">
            <path d="M11 2.5V27.2" />
            <path d="M5.8 22.1L11 27.5L16.2 22.1" />
          </g>
          <path class="pin-scroll-cue__arrow-signal" pathLength="1" d="M11 2.5V27.2" />
        </svg>
      `;
      stage.appendChild(cue);
    }

    pairs.push({ section, cue });
  }

  if (!pairs.length) {
    delete root.dataset.pinnedCuesInitialized;
    return;
  }

  const sync = () => {
    const triggers = ScrollTrigger.getAll();
    for (const { section, cue } of pairs) {
      const pin = triggers.find((trigger) => trigger.trigger === section && Boolean(trigger.vars.pin));
      const progress = pin?.progress ?? 0;
      const fadeEnd = 0.3;
      const linearFade = Math.max(0, Math.min(1, 1 - (progress / fadeEnd)));
      const fade = Math.pow(linearFade, 1.35);
      const visible = Boolean(pin?.isActive && fade > 0.015);

      cue.dataset.visible = visible ? 'true' : 'false';
      cue.style.setProperty('--pin-cue-opacity', (0.54 * fade).toFixed(3));
      cue.style.setProperty('--pin-cue-progress', String(progress));
    }
  };

  let syncFrame = 0;
  const requestSync = () => {
    if (syncFrame) return;
    syncFrame = window.requestAnimationFrame(() => {
      syncFrame = 0;
      sync();
    });
  };

  window.addEventListener('scroll', requestSync, { passive: true });
  ScrollTrigger.addEventListener('refresh', sync);

  let retryCount = 0;
  const settle = () => {
    sync();
    const resolved = pairs.every(({ section }) => ScrollTrigger.getAll().some((trigger) => trigger.trigger === section && Boolean(trigger.vars.pin)));
    if (!resolved && retryCount < 12) {
      retryCount += 1;
      window.setTimeout(settle, 80);
    }
  };

  window.requestAnimationFrame(() => window.requestAnimationFrame(settle));

  return () => {
    window.removeEventListener('scroll', requestSync);
    ScrollTrigger.removeEventListener('refresh', sync);
    if (syncFrame) window.cancelAnimationFrame(syncFrame);
    pairs.forEach(({ cue }) => cue.remove());
    delete root.dataset.pinnedCuesInitialized;
  };
}
