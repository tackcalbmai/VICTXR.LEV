import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / Math.max(edge1 - edge0, 0.0001));
  return t * t * (3 - 2 * t);
};

function resetDisruptionStyles() {
  gsap.set('[data-disruption-one]', { clearProps: 'transform,opacity,visibility,color,filter' });
  gsap.set('[data-disruption-two]', { clearProps: 'transform,opacity,visibility,color,filter' });
  gsap.set('[data-disruption-x]', { clearProps: 'transform,opacity,visibility,color,filter' });
  gsap.set('[data-disruption-caption]', { clearProps: 'transform,opacity,visibility,color,filter' });
}

function killDesktopDisruptionTriggers(disruption: HTMLElement) {
  ScrollTrigger.getAll().forEach((trigger) => {
    if (trigger.trigger !== disruption) return;
    trigger.animation?.kill();
    trigger.kill(true);
  });
}

export function initLaptopResponsiveMotion() {
  const disruption = document.querySelector<HTMLElement>('[data-disruption]');
  if (!disruption) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const lineOne = disruption.querySelector<HTMLElement>('[data-disruption-one]');
  const lineTwo = disruption.querySelector<HTMLElement>('[data-disruption-two]');
  const x = disruption.querySelector<HTMLElement>('[data-disruption-x]');
  const caption = disruption.querySelector<HTMLElement>('[data-disruption-caption]');
  const scrollJourney = document.querySelector<HTMLAnchorElement>('[data-scroll-journey]');
  if (!lineOne || !lineTwo || !x || !caption) return;

  let desktopMode = false;
  let frame = 0;
  let resizeTimer = 0;

  const progressForViewport = () => {
    const rect = disruption.getBoundingClientRect();
    const viewport = Math.max(window.innerHeight, 1);
    const startLine = viewport * 0.82;
    const finishLine = viewport * 0.16;
    const travel = Math.max(startLine + rect.height - finishLine, 1);
    return clamp01((startLine - rect.top) / travel);
  };

  const renderDesktop = () => {
    frame = 0;
    if (!desktopMode) return;

    const progress = progressForViewport();
    const reveal = smoothstep(0.12, 0.46, progress);
    const settle = smoothstep(0.42, 0.94, progress);
    const captionReveal = smoothstep(0.22, 0.52, progress);

    gsap.set(lineOne, {
      xPercent: -5.5 * settle,
      yPercent: -10 * settle,
      rotation: -0.9 * settle,
      scale: 1 - 0.012 * settle,
      force3D: true,
    });

    gsap.set(lineTwo, {
      autoAlpha: reveal,
      xPercent: 4.5 * (1 - reveal) + 4.5 * settle,
      yPercent: 6 * (1 - reveal) + 6 * settle,
      rotation: 0.75 * settle,
      color: gsap.utils.interpolate('#aaa79f', '#0c0c0b', reveal),
      force3D: true,
    });

    gsap.set(x, {
      autoAlpha: 0.085 * reveal,
      scale: 0.96 + progress * 0.12,
      rotation: 2 + progress * 6,
      force3D: true,
    });

    gsap.set(caption, {
      autoAlpha: captionReveal,
      y: (1 - captionReveal) * 12,
      force3D: true,
    });
  };

  const requestRender = () => {
    if (!desktopMode || frame) return;
    frame = window.requestAnimationFrame(renderDesktop);
  };

  const enterDesktopMode = (refresh = true) => {
    killDesktopDisruptionTriggers(disruption);
    desktopMode = true;
    disruption.dataset.motionOwner = 'viewport';
    renderDesktop();
    if (!refresh) return;
    window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      renderDesktop();
    });
  };

  const leaveDesktopMode = () => {
    desktopMode = false;
    delete disruption.dataset.motionOwner;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    resetDisruptionStyles();
    ScrollTrigger.refresh();
  };

  const syncMode = (refresh = true) => {
    const shouldOwnDesktop = window.matchMedia('(min-width: 761px)').matches;
    if (shouldOwnDesktop) enterDesktopMode(refresh);
    else if (desktopMode) leaveDesktopMode();
  };

  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => syncMode(true), 100);
  };

  const onDesktopJourney = (event: MouseEvent) => {
    if (!window.matchMedia('(min-width: 761px)').matches) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const top = disruption.getBoundingClientRect().top + window.scrollY;
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    const target = Math.max(0, top - headerHeight - Math.max(8, window.innerHeight * 0.025));
    window.scrollTo({ top: target, left: 0, behavior: 'smooth' });
  };

  // initHomeMotion() runs first, so its legacy desktop pin is available to
  // remove deterministically. Re-check after layout/font settling, but do not
  // subscribe to ScrollTrigger refresh itself (that can create a feedback loop).
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => syncMode(true)));
  window.setTimeout(() => syncMode(false), 450);
  window.setTimeout(() => syncMode(false), 1200);

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.visualViewport?.addEventListener('resize', onResize, { passive: true });
  window.visualViewport?.addEventListener('scroll', requestRender, { passive: true });
  scrollJourney?.addEventListener('click', onDesktopJourney, { capture: true });
}
