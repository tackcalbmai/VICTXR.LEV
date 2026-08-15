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
        <span class="pin-scroll-cue__motion">
          <span class="pin-scroll-cue__rail"><span class="pin-scroll-cue__pulse"></span></span>
          <span class="pin-scroll-cue__chevron"></span>
        </span>
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
    const scrollY = window.scrollY;

    for (const { section, cue } of pairs) {
      const pin = triggers.find((trigger) => trigger.trigger === section && Boolean(trigger.vars.pin));
      const start = typeof pin?.start === 'number' ? pin.start : scrollY;
      const end = typeof pin?.end === 'number' ? pin.end : start + window.innerHeight;
      const pinDistance = Math.max(1, end - start);
      const fadeDistance = Math.min(360, Math.max(220, pinDistance * 0.16));
      const travelled = Math.max(0, scrollY - start);
      const fade = Math.max(0, Math.min(1, 1 - travelled / fadeDistance));
      const visible = Boolean(pin?.isActive && fade > 0.01);

      cue.dataset.visible = visible ? 'true' : 'false';
      cue.style.setProperty('--pin-cue-opacity', (0.52 * fade).toFixed(3));
      cue.style.setProperty('--pin-cue-progress', String(pin?.progress ?? 0));
    }
  };

  let syncFrame = 0;
  const requestSync = () => {
    if (syncFrame) return;
    syncFrame = window.requestAnimationFrame(() => {
      syncFrame = 0;
      ScrollTrigger.update();
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
