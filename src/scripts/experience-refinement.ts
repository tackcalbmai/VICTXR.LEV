import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initExperienceRefinementMotion() {
  const root = document.documentElement;
  if (root.dataset.experienceMotion === 'ready') return;
  root.dataset.experienceMotion = 'ready';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let resizeTimer = 0;

  const tune = () => {
    const statement = document.querySelector<HTMLElement>('[data-statement]');
    if (statement) {
      // The old per-line 110% rise could visually pass through the supporting
      // copy on shorter viewports. The section-level reveal is enough and feels
      // more controlled, so remove that competing ScrollTrigger everywhere.
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.trigger !== statement) return;
        trigger.animation?.kill();
        trigger.kill(true);
      });
      gsap.set(statement.querySelectorAll('span'), { clearProps: 'transform,opacity,visibility' });
    }

    const disruption = document.querySelector<HTMLElement>('[data-disruption]');
    if (!disruption || reducedMotion || !window.matchMedia('(max-width: 760px)').matches) return;

    // Mobile keeps the pinned disruptive act, but the old 220% travel made one
    // idea consume several screens. Keep the signature mechanic and halve the tax.
    ScrollTrigger.getAll().forEach((trigger) => {
      if (trigger.trigger !== disruption || !trigger.vars.pin) return;
      trigger.vars.end = '+=125%';
      trigger.refresh();
    });
  };

  const scheduleTune = () => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(tune));
  };

  scheduleTune();
  window.setTimeout(tune, 350);
  window.setTimeout(tune, 1100);

  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(tune, 120);
  };

  window.addEventListener('resize', onResize, { passive: true });
  window.visualViewport?.addEventListener('resize', onResize, { passive: true });
}
