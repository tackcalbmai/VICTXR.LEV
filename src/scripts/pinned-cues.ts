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
    for (const { section, cue } of pairs) {
      const pin = triggers.find((trigger) => trigger.trigger === section && Boolean(trigger.vars.pin));
      const visible = Boolean(pin?.isActive && pin.progress >= 0.01 && pin.progress < 0.94);
      cue.dataset.visible = visible ? 'true' : 'false';
      cue.style.setProperty('--pin-cue-progress', String(pin?.progress ?? 0));
    }
  };

  ScrollTrigger.addEventListener('update', sync);
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
    ScrollTrigger.removeEventListener('update', sync);
    ScrollTrigger.removeEventListener('refresh', sync);
    pairs.forEach(({ cue }) => cue.remove());
    delete root.dataset.pinnedCuesInitialized;
  };
}
