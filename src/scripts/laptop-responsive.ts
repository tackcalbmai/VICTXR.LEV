import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const disruptionId = 'xo-responsive-disruption';

function resetDisruptionStyles() {
  gsap.set('[data-disruption-one]', { clearProps: 'transform,opacity,visibility,color,filter' });
  gsap.set('[data-disruption-two]', { clearProps: 'transform,opacity,visibility,color,filter' });
  gsap.set('[data-disruption-x]', { clearProps: 'transform,opacity,visibility,color,filter' });
  gsap.set('[data-disruption-caption]', { clearProps: 'transform,opacity,visibility,color,filter' });
}

function killCustomTrigger() {
  const trigger = ScrollTrigger.getById(disruptionId);
  trigger?.animation?.kill();
  trigger?.kill(true);
}

function killDesktopDisruptionTriggers(disruption: HTMLElement) {
  ScrollTrigger.getAll().forEach((trigger) => {
    if (trigger.trigger !== disruption) return;
    trigger.animation?.kill();
    trigger.kill(true);
  });
}

function buildShortDesktop(disruption: HTMLElement) {
  killDesktopDisruptionTriggers(disruption);
  resetDisruptionStyles();

  const timeline = gsap.timeline({
    scrollTrigger: {
      id: disruptionId,
      trigger: disruption,
      start: 'top 78%',
      end: 'bottom 12%',
      scrub: 0.65,
      invalidateOnRefresh: true,
    },
  });

  timeline
    .to({}, { duration: 0.08 })
    .to('[data-disruption-one]', { xPercent: -3.5, yPercent: -7, rotate: -0.6, scale: 0.985, duration: 0.28, ease: 'none' })
    .fromTo(
      '[data-disruption-two]',
      { autoAlpha: 0, color: '#8d8a82', xPercent: 5, yPercent: 7 },
      { autoAlpha: 1, color: '#0c0c0b', xPercent: 0, yPercent: 0, duration: 0.3, ease: 'none' },
      '<15%',
    )
    .to('[data-disruption-x]', { autoAlpha: 0.07, scale: 1.02, rotate: 4, duration: 0.25, ease: 'none' }, '<10%')
    .to('[data-disruption-caption]', { autoAlpha: 1, y: 0, duration: 0.2, ease: 'none' }, '<18%')
    .to({}, { duration: 0.12 })
    .to('[data-disruption-one]', { xPercent: -7, yPercent: -12, rotate: -1.1, duration: 0.28, ease: 'none' })
    .to('[data-disruption-two]', { xPercent: 6, yPercent: 8, rotate: 0.9, duration: 0.28, ease: 'none' }, '<')
    .to('[data-disruption-x]', { scale: 1.08, rotate: 7, autoAlpha: 0.095, duration: 0.28, ease: 'none' }, '<');

  ScrollTrigger.refresh();
}

function buildTallDesktop(disruption: HTMLElement) {
  killDesktopDisruptionTriggers(disruption);
  resetDisruptionStyles();

  const timeline = gsap.timeline({
    scrollTrigger: {
      id: disruptionId,
      trigger: disruption,
      start: 'top top',
      end: '+=135%',
      scrub: 0.85,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  timeline
    .to({}, { duration: 0.12 })
    .to('[data-disruption-one]', { xPercent: -5, yPercent: -15, rotate: -1.1, scale: 0.97, duration: 0.34, ease: 'none' })
    .fromTo(
      '[data-disruption-two]',
      { autoAlpha: 0, color: '#8d8a82', xPercent: 6, yPercent: 9 },
      { autoAlpha: 1, color: '#0c0c0b', xPercent: 0, yPercent: 0, duration: 0.34, ease: 'none' },
      '<16%',
    )
    .to('[data-disruption-x]', { autoAlpha: 0.075, scale: 1.04, rotate: 5, duration: 0.32, ease: 'none' }, '<12%')
    .to('[data-disruption-caption]', { autoAlpha: 1, y: 0, duration: 0.22, ease: 'none' }, '<18%')
    .to({}, { duration: 0.16 })
    .to('[data-disruption-one]', { xPercent: -13, yPercent: -24, rotate: -2, duration: 0.32, ease: 'none' })
    .to('[data-disruption-two]', { xPercent: 11, yPercent: 13, rotate: 1.5, duration: 0.32, ease: 'none' }, '<')
    .to('[data-disruption-x]', { scale: 1.14, rotate: 10, autoAlpha: 0.11, duration: 0.32, ease: 'none' }, '<');

  ScrollTrigger.refresh();
}

export function initLaptopResponsiveMotion() {
  const disruption = document.querySelector<HTMLElement>('[data-disruption]');
  if (!disruption) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let resizeTimer = 0;

  const rebuild = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const mobile = window.matchMedia('(max-width: 760px)').matches;
      if (mobile) {
        killCustomTrigger();
        resetDisruptionStyles();
        ScrollTrigger.refresh();
        return;
      }

      const shortDesktop = window.matchMedia('(max-height: 900px)').matches;
      if (shortDesktop) buildShortDesktop(disruption);
      else buildTallDesktop(disruption);
    }, 80);
  };

  /* Home motion has already mounted its width-only trigger. Replace it with a
   * height-aware version after the current call stack, then keep it in sync on
   * browser resize / zoom / docking changes. */
  window.setTimeout(() => {
    const shortDesktop = window.matchMedia('(min-width: 761px) and (max-height: 900px)').matches;
    const tallDesktop = window.matchMedia('(min-width: 761px) and (min-height: 901px)').matches;
    if (shortDesktop) buildShortDesktop(disruption);
    else if (tallDesktop) buildTallDesktop(disruption);
  }, 0);

  window.addEventListener('resize', rebuild, { passive: true });
}
