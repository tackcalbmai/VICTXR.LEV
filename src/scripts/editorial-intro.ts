import { gsap } from 'gsap';

export function initEditorialIntro() {
  const shell = document.querySelector<HTMLElement>('[data-home-intro]');
  if (!shell) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  const compact = window.matchMedia('(max-width: 760px)').matches;
  const root = document.documentElement;
  const node = document.createElement('div');

  node.className = 'editorial-intro';
  node.dataset.editorialIntro = '';
  node.dataset.editorialPhase = 'order';
  node.setAttribute('aria-hidden', 'true');
  node.innerHTML = `
    <div class="editorial-intro__grid" aria-hidden="true">
      <span class="editorial-intro__grid-line editorial-intro__grid-line--v" data-editorial-grid-v></span>
      <span class="editorial-intro__grid-line editorial-intro__grid-line--v" data-editorial-grid-v></span>
      <span class="editorial-intro__grid-line editorial-intro__grid-line--v" data-editorial-grid-v></span>
      <span class="editorial-intro__grid-line editorial-intro__grid-line--v" data-editorial-grid-v></span>
      <span class="editorial-intro__grid-line editorial-intro__grid-line--v" data-editorial-grid-v></span>
      <span class="editorial-intro__grid-line editorial-intro__grid-line--h" data-editorial-grid-h></span>
      <span class="editorial-intro__grid-line editorial-intro__grid-line--h" data-editorial-grid-h></span>
      <span class="editorial-intro__grid-line editorial-intro__grid-line--h" data-editorial-grid-h></span>
    </div>

    <div class="editorial-intro__labels" aria-hidden="true">
      <span class="editorial-intro__label" data-editorial-label>STANDARD</span>
      <span class="editorial-intro__label" data-editorial-label>EXPECTED</span>
      <span class="editorial-intro__label" data-editorial-label>SAFE</span>
    </div>

    <div class="editorial-intro__brand" data-editorial-brand>
      <span>VICT</span>
      <span class="editorial-intro__slot">
        <span class="editorial-intro__slot-letter editorial-intro__slot-o" data-editorial-o>O</span>
        <span class="editorial-intro__slot-letter editorial-intro__slot-x" data-editorial-x>X</span>
      </span>
      <span>R</span><i>.</i><span>LEV</span>
    </div>

    <div class="editorial-intro__prompt">
      <span class="editorial-intro__wrong" data-editorial-wrong>SOMETHING LOOKS WRONG.</span>
      <strong class="editorial-intro__good" data-editorial-good>GOOD.</strong>
    </div>

    <div class="editorial-intro__different" data-editorial-different>DIFFERENTLY.</div>
    <span class="editorial-intro__fault" data-editorial-fault aria-hidden="true"></span>
  `;

  shell.prepend(node);
  root.classList.add('is-editorial-intro');
  window.scrollTo(0, 0);

  const brand = node.querySelector<HTMLElement>('[data-editorial-brand]');
  const o = node.querySelector<HTMLElement>('[data-editorial-o]');
  const x = node.querySelector<HTMLElement>('[data-editorial-x]');
  const wrong = node.querySelector<HTMLElement>('[data-editorial-wrong]');
  const good = node.querySelector<HTMLElement>('[data-editorial-good]');
  const different = node.querySelector<HTMLElement>('[data-editorial-different]');
  const fault = node.querySelector<HTMLElement>('[data-editorial-fault]');
  const labels = Array.from(node.querySelectorAll<HTMLElement>('[data-editorial-label]'));
  const gridV = Array.from(node.querySelectorAll<HTMLElement>('[data-editorial-grid-v]'));
  const gridH = Array.from(node.querySelectorAll<HTMLElement>('[data-editorial-grid-h]'));

  if (!brand || !o || !x || !wrong || !good || !different || !fault) {
    node.remove();
    root.classList.remove('is-editorial-intro');
    return;
  }

  gsap.set(gridV, { scaleY: 0, transformOrigin: '50% 50%' });
  gsap.set(gridH, { scaleX: 0, transformOrigin: '50% 50%' });
  gsap.set(labels, { autoAlpha: 0, y: 6 });
  gsap.set(brand, { autoAlpha: 0, y: 14, clipPath: 'inset(0 0 100% 0)' });
  gsap.set(o, { x: 0, y: 0, rotation: 0, autoAlpha: 1 });
  gsap.set(x, {
    autoAlpha: 0,
    x: compact ? 72 : 240,
    y: compact ? -92 : -150,
    scale: compact ? 6.4 : 9.5,
    rotation: -24,
    filter: 'blur(1.5px)',
  });
  gsap.set([wrong, good], { autoAlpha: 0, y: 8 });
  gsap.set(different, {
    autoAlpha: 0,
    yPercent: 42,
    scale: 1.08,
    rotation: 0.8,
    clipPath: 'inset(0 0 100% 0)',
  });
  gsap.set(fault, { autoAlpha: 0, scaleX: 0 });

  const releaseLock = () => {
    const started = performance.now();
    const waitForLegacyIntro = () => {
      if (!document.querySelector('[data-cinematic-intro]') || performance.now() - started > 900) {
        root.classList.remove('is-editorial-intro');
        return;
      }
      window.setTimeout(waitForLegacyIntro, 40);
    };
    waitForLegacyIntro();
  };

  const timeline = gsap.timeline({
    defaults: { ease: 'power4.out' },
    onComplete: () => {
      node.remove();
      releaseLock();
    },
  });

  timeline
    .to(gridV, { scaleY: 1, duration: 0.42, stagger: 0.025 }, 0.03)
    .to(gridH, { scaleX: 1, duration: 0.42, stagger: 0.03 }, 0.05)
    .to(labels, { autoAlpha: 0.68, y: 0, duration: 0.28, stagger: 0.055 }, 0.12)
    .to(brand, { autoAlpha: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.46 }, 0.16)
    .call(() => { node.dataset.editorialPhase = 'wrong'; }, [], 0.68)
    .to(o, { y: compact ? -3 : -4, x: compact ? 1 : 2, rotation: -1.6, duration: 0.22, ease: 'power2.inOut' }, 0.70)
    .to(wrong, { autoAlpha: 1, y: 0, duration: 0.26 }, 0.73)
    .call(() => { node.dataset.editorialPhase = 'good'; }, [], 1.02)
    .to(good, { autoAlpha: 1, y: 0, duration: 0.18 }, 1.03)
    .to(wrong, { autoAlpha: 0.46, duration: 0.18 }, 1.03)
    .call(() => { node.dataset.editorialPhase = 'break'; }, [], 1.24)
    .to(o, {
      x: compact ? -92 : -185,
      y: compact ? 48 : 82,
      rotation: 38,
      scale: 0.72,
      autoAlpha: 0,
      filter: 'blur(2px)',
      duration: 0.30,
      ease: 'power4.in',
    }, 1.25)
    .to(x, {
      autoAlpha: 1,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      filter: 'blur(0px)',
      duration: 0.43,
      ease: 'power4.inOut',
    }, 1.25)
    .to(gridV, {
      x: (index) => (index - 2) * (compact ? 5 : 10),
      rotation: (index) => (index - 2) * 0.34,
      opacity: 0.55,
      duration: 0.32,
      stagger: 0.012,
      ease: 'power3.inOut',
    }, 1.26)
    .to(gridH, {
      y: (index) => (index - 1) * (compact ? 5 : 9),
      rotation: (index) => (index - 1) * -0.42,
      opacity: 0.55,
      duration: 0.32,
      stagger: 0.012,
      ease: 'power3.inOut',
    }, 1.26)
    .to(labels, {
      x: (index) => [compact ? -16 : -34, compact ? 18 : 38, compact ? -8 : -20][index] ?? 0,
      y: (index) => [compact ? -5 : -10, compact ? 7 : 13, compact ? 6 : 12][index] ?? 0,
      rotation: (index) => [-1.2, 1.4, -0.8][index] ?? 0,
      autoAlpha: 0.3,
      duration: 0.28,
      ease: 'power3.inOut',
    }, 1.28)
    .to(fault, { autoAlpha: 0.9, scaleX: 1, duration: 0.10, ease: 'power4.out' }, 1.43)
    .to(fault, { autoAlpha: 0, scaleX: 0.2, duration: 0.12, ease: 'power4.in' }, 1.53)
    .to(x, {
      keyframes: [
        { x: 0, skewX: 0, duration: 0.015 },
        { x: compact ? 4 : 8, skewX: -13, autoAlpha: 0.45, duration: 0.035, ease: 'steps(1)' },
        { x: compact ? -3 : -6, skewX: 9, autoAlpha: 1, duration: 0.035, ease: 'steps(1)' },
        { x: 0, skewX: 0, autoAlpha: 1, duration: 0.055 },
      ],
    }, 1.58)
    .to([wrong, good], { autoAlpha: 0, y: -8, duration: 0.16, ease: 'power3.in' }, 1.70)
    .call(() => { node.dataset.editorialPhase = 'different'; }, [], 1.80)
    .to(brand, { yPercent: -112, scale: 0.62, autoAlpha: 0.12, duration: 0.34, ease: 'power3.inOut' }, 1.81)
    .to(labels, { autoAlpha: 0, duration: 0.18 }, 1.82)
    .to(different, {
      autoAlpha: 1,
      yPercent: 0,
      scale: 1,
      rotation: 0,
      clipPath: 'inset(0 0 0% 0)',
      duration: 0.38,
      ease: 'power4.out',
    }, 1.82)
    .to(gridV, { x: 0, rotation: 0, opacity: 0.16, duration: 0.32, ease: 'power3.out' }, 1.88)
    .to(gridH, { y: 0, rotation: 0, opacity: 0.16, duration: 0.32, ease: 'power3.out' }, 1.88)
    .call(() => { node.dataset.editorialPhase = 'reveal'; }, [], 2.28)
    .to(different, { scale: 1.025, autoAlpha: 0.08, duration: 0.42, ease: 'power2.in' }, 2.29)
    .to([gridV, gridH], { autoAlpha: 0, duration: 0.18 }, 2.30)
    .to(node, {
      clipPath: 'inset(49.9% 0 49.9% 0)',
      duration: 0.48,
      ease: 'power4.inOut',
    }, 2.30);

  timeline.timeScale(0.72);

  return () => {
    timeline.kill();
    node.remove();
    root.classList.remove('is-editorial-intro');
  };
}
