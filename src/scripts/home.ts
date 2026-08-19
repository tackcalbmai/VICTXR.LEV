import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const introSessionKey = 'xoweb:intro-seen';
const introReadyMark = 'xoweb:intro-ready';

function hasSeenIntroThisSession() {
  try {
    return sessionStorage.getItem(introSessionKey) === '1';
  } catch {
    return false;
  }
}

function markIntroSeen() {
  try {
    sessionStorage.setItem(introSessionKey, '1');
  } catch {
    // Storage can be unavailable in hardened/private contexts. The intro still works.
  }
}

function markIntroReady() {
  if (!performance.getEntriesByName(introReadyMark).length) performance.mark(introReadyMark);
}

export function initHomeMotion() {
  const shell = document.querySelector<HTMLElement>('[data-home-intro]');
  if (!shell) return;
  if (shell.dataset.motionInitialized === 'true') return;
  shell.dataset.motionInitialized = 'true';

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const returningFromHistory = navigation?.type === 'back_forward';
  const introWasBypassed = shell.dataset.introBypassed === 'true';
  const introSeenThisSession = hasSeenIntroThisSession();
  let initialHashTarget: HTMLElement | null = null;
  if (!returningFromHistory && location.hash.length > 1) {
    try {
      initialHashTarget = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    } catch {
      initialHashTarget = null;
    }
  }
  const resetToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  if (!returningFromHistory && !initialHashTarget) resetToTop();

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const siteHeader = document.querySelector<HTMLElement>('[data-site-header]');
  const siteBrand = siteHeader?.querySelector<HTMLElement>('.site-brand') ?? null;
  const headerSecondary = siteHeader?.querySelectorAll<HTMLElement>('.site-nav--desktop, .site-header__utility') ?? [];
  const brandLetter = document.querySelector<HTMLElement>('[data-brand-letter]');
  const brandMotion = brandLetter?.closest<HTMLElement>('.site-brand__letter-wrap') ?? brandLetter;
  const scrollControl = document.querySelector<HTMLAnchorElement>('[data-scroll-journey]');
  let introTimeline: gsap.core.Timeline | undefined;
  let cinematicNode: HTMLElement | undefined;
  let brandIdle: gsap.core.Tween | undefined;
  let brandCycle: gsap.core.Timeline | undefined;
  let journeyTween: gsap.core.Tween | undefined;
  const pointerCleanups: Array<() => void> = [];

  const scheduleBrandCycle = (delay = 7.8) => {
    brandIdle?.kill();
    brandIdle = gsap.delayedCall(delay, runBrandCycle);
  };

  const settleBrandMotion = () => {
    if (!brandMotion) return;
    gsap.set(brandMotion, { clearProps: 'transform,opacity,visibility' });
  };

  const glitchLetter = (timeline: gsap.core.Timeline, position: number | string) => {
    if (!brandMotion) return;
    timeline.to(brandMotion, {
      keyframes: [
        { xPercent: 0, skewX: 0, autoAlpha: 1, duration: 0.01 },
        { xPercent: 36, skewX: -18, autoAlpha: 0.3, duration: 0.035, ease: 'steps(1)' },
        { xPercent: -24, skewX: 13, autoAlpha: 1, duration: 0.035, ease: 'steps(1)' },
        { xPercent: 0, skewX: 0, autoAlpha: 1, duration: 0.065 },
      ],
    }, position);
  };

  function runBrandCycle() {
    if (!brandLetter || !brandMotion || document.hidden || reducedMotion) {
      scheduleBrandCycle(6);
      return;
    }

    const compact = window.matchMedia('(max-width: 760px)').matches;
    const firstFlightX = compact ? 6 : 10;
    const firstFlightY = compact ? -6 : -9;
    const secondFlightX = compact ? -6 : -9;
    const secondFlightY = compact ? 5 : 8;

    brandCycle?.kill();
    brandLetter.textContent = 'X';
    brandLetter.classList.remove('is-o');
    settleBrandMotion();

    brandCycle = gsap.timeline({ onComplete: () => scheduleBrandCycle(10.5) });
    brandCycle
      .to(brandMotion, { rotation: -72, y: -1, duration: 0.42, ease: 'power1.in' })
      .to(brandMotion, {
        rotation: -248,
        x: firstFlightX,
        y: firstFlightY,
        scale: 0.92,
        duration: 0.24,
        ease: 'power3.in',
      });
    glitchLetter(brandCycle, '<-0.12');
    brandCycle
      .to(brandMotion, {
        rotation: -420,
        x: firstFlightX * 1.08,
        y: firstFlightY * 1.08,
        autoAlpha: 0.44,
        duration: 0.14,
        ease: 'power4.in',
      })
      .call(() => {
        brandLetter.textContent = 'O';
        brandLetter.classList.add('is-o');
      })
      .set(brandMotion, {
        rotation: -24,
        x: firstFlightX * 0.66,
        y: firstFlightY * 0.52,
        xPercent: 0,
        skewX: 0,
        scale: 0.9,
        autoAlpha: 0.52,
      });
    glitchLetter(brandCycle, '<');
    brandCycle
      .to(brandMotion, {
        x: 0,
        y: 0,
        xPercent: 0,
        rotation: 0,
        skewX: 0,
        scale: 1,
        autoAlpha: 1,
        duration: 0.3,
        ease: 'back.out(2.5)',
      })
      .call(settleBrandMotion)
      .to({}, { duration: 1.45 })
      .to(brandMotion, { rotation: -86, x: -1, y: 1, duration: 0.4, ease: 'power1.in' })
      .to(brandMotion, {
        rotation: -262,
        x: secondFlightX,
        y: secondFlightY,
        scale: 0.92,
        duration: 0.23,
        ease: 'power3.in',
      });
    glitchLetter(brandCycle, '<-0.11');
    brandCycle
      .to(brandMotion, {
        rotation: -420,
        x: secondFlightX * 1.05,
        y: secondFlightY * 1.06,
        autoAlpha: 0.46,
        duration: 0.14,
        ease: 'power4.in',
      })
      .call(() => {
        brandLetter.textContent = 'X';
        brandLetter.classList.remove('is-o');
      })
      .set(brandMotion, {
        rotation: -22,
        x: secondFlightX * 0.62,
        y: secondFlightY * 0.48,
        xPercent: 0,
        skewX: 0,
        scale: 0.9,
        autoAlpha: 0.54,
      });
    glitchLetter(brandCycle, '<');
    brandCycle
      .to(brandMotion, {
        x: 0,
        y: 0,
        xPercent: 0,
        rotation: 0,
        skewX: 0,
        scale: 1,
        autoAlpha: 1,
        duration: 0.29,
        ease: 'back.out(2.5)',
      })
      .call(settleBrandMotion);
  }

  const releaseCinematic = () => {
    document.documentElement.classList.remove('is-cinematic-intro');
    cinematicNode?.remove();
    cinematicNode = undefined;
    if (siteHeader) gsap.set(siteHeader, { clearProps: 'opacity,visibility' });
    if (headerSecondary.length) gsap.set(headerSecondary, { clearProps: 'opacity,visibility' });
    ScrollTrigger.refresh();
    if (!reducedMotion) scheduleBrandCycle(8.5);
  };

  const startCinematic = () => {
    if (reducedMotion || returningFromHistory || initialHashTarget || introWasBypassed || introSeenThisSession) {
      shell.setAttribute('data-home-intro', 'ready');
      markIntroReady();
      if (!reducedMotion) scheduleBrandCycle(8.5);
      return;
    }

    cinematicNode = document.createElement('div');
    cinematicNode.className = 'cinematic-intro';
    cinematicNode.dataset.cinematicIntro = '';
    cinematicNode.dataset.cinematicPhase = 'boot';
    cinematicNode.setAttribute('aria-hidden', 'true');
    cinematicNode.innerHTML = `
      <div class="cinematic-intro__backdrop" data-cinematic-backdrop></div>
      <div class="cinematic-intro__brand-stage" data-cinematic-stage>
        <div class="cinematic-intro__assembly" data-cinematic-assembly aria-hidden="true">
          <div class="cinematic-intro__slice-wordmark cinematic-intro__slice-wordmark--top" data-cinematic-slice="top"><span class="cinematic-intro__slice-x">X</span><span>O</span><span class="cinematic-intro__wordmark-space"></span><span>WEB</span></div>
          <div class="cinematic-intro__slice-wordmark cinematic-intro__slice-wordmark--middle" data-cinematic-slice="middle"><span class="cinematic-intro__slice-x">X</span><span>O</span><span class="cinematic-intro__wordmark-space"></span><span>WEB</span></div>
          <div class="cinematic-intro__slice-wordmark cinematic-intro__slice-wordmark--bottom" data-cinematic-slice="bottom"><span class="cinematic-intro__slice-x">X</span><span>O</span><span class="cinematic-intro__wordmark-space"></span><span>WEB</span></div>
        </div>
        <div class="cinematic-intro__wordmark" data-cinematic-wordmark>
          <span class="cinematic-intro__xo-pair" data-cinematic-xo-pair><span class="cinematic-intro__xo-x" data-cinematic-xo-x>X</span><span class="cinematic-intro__xo-o" data-cinematic-xo-o>O</span></span><span class="cinematic-intro__wordmark-space"></span><span>WEB</span>
        </div>
        <div class="cinematic-intro__descriptor-wrap" data-cinematic-descriptor-wrap>
          <p class="cinematic-intro__descriptor" data-cinematic-descriptor>
            <span class="cinematic-intro__descriptor-byline">BY VICTXR.LEV</span>
          </p>
        </div>
      </div>
    `;
    shell.prepend(cinematicNode);
    document.documentElement.classList.add('is-cinematic-intro');
    resetToTop();

    const backdrop = cinematicNode.querySelector<HTMLElement>('[data-cinematic-backdrop]');
    const wordmark = cinematicNode.querySelector<HTMLElement>('[data-cinematic-wordmark]');
    const introXoPair = cinematicNode.querySelector<HTMLElement>('[data-cinematic-xo-pair]');
    const introXoX = cinematicNode.querySelector<HTMLElement>('[data-cinematic-xo-x]');
    const introXoO = cinematicNode.querySelector<HTMLElement>('[data-cinematic-xo-o]');
    const descriptorWrap = cinematicNode.querySelector<HTMLElement>('[data-cinematic-descriptor-wrap]');
    const slices = cinematicNode.querySelectorAll<HTMLElement>('[data-cinematic-slice]');
    const compact = window.matchMedia('(max-width: 760px)').matches;

    if (!backdrop || !wordmark || !introXoPair || !introXoX || !introXoO || !descriptorWrap || slices.length !== 3 || !siteHeader || !siteBrand) {
      shell.setAttribute('data-home-intro', 'ready');
      markIntroReady();
      releaseCinematic();
      return;
    }

    const [topSlice, middleSlice, bottomSlice] = Array.from(slices);

    siteHeader.classList.add('is-intro-settled');
    gsap.set(siteHeader, { autoAlpha: 0 });
    if (headerSecondary.length) gsap.set(headerSecondary, { autoAlpha: 0 });

    gsap.set(wordmark, {
      autoAlpha: 0,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      filter: 'blur(0px)',
      clipPath: 'inset(0 0 0 0)',
      transformOrigin: '50% 50%',
    });
    gsap.set(topSlice, { autoAlpha: 0, x: compact ? -15 : -34, y: compact ? -1 : -2, filter: 'blur(2px)' });
    gsap.set(middleSlice, { autoAlpha: 0, x: compact ? 7 : 14, y: 0, filter: 'blur(1px)' });
    gsap.set(bottomSlice, { autoAlpha: 0, x: compact ? 17 : 38, y: compact ? 1 : 2, filter: 'blur(2px)' });
    gsap.set(descriptorWrap, { autoAlpha: 0, y: 6, filter: 'blur(1.5px)' });
    gsap.set([introXoPair, introXoX, introXoO], { clearProps: 'transform,opacity,visibility' });

    const syncDescriptorGeometry = () => {
      const rect = wordmark.getBoundingClientRect();
      const gap = Math.max(6, Math.min(18, rect.height * 0.045));
      descriptorWrap.style.width = `${rect.width}px`;
      descriptorWrap.style.left = `${rect.left}px`;
      descriptorWrap.style.top = `${rect.bottom + gap}px`;
    };

    const xoOverlap = () => Math.max(5, Math.min(compact ? 8 : 14, introXoPair.getBoundingClientRect().height * 0.18));
    const xoGlitch = (timeline: gsap.core.Timeline, position: number | string) => {
      timeline
        .to(introXoX, { keyframes: [
          { xPercent: 0, skewX: 0, duration: 0.01 },
          { xPercent: 7, skewX: -8, duration: 0.035, ease: 'steps(1)' },
          { xPercent: -5, skewX: 6, duration: 0.035, ease: 'steps(1)' },
          { xPercent: 0, skewX: 0, duration: 0.06 },
        ] }, position)
        .to(introXoO, { keyframes: [
          { xPercent: 0, skewX: 0, duration: 0.01 },
          { xPercent: -7, skewX: 8, duration: 0.035, ease: 'steps(1)' },
          { xPercent: 5, skewX: -6, duration: 0.035, ease: 'steps(1)' },
          { xPercent: 0, skewX: 0, duration: 0.06 },
        ] }, position);
    };
    let handoff = { x: 0, y: 0, scaleX: 1, scaleY: 1 };

    const settleIntroPair = () => {
      gsap.set([introXoPair, introXoX, introXoO], { clearProps: 'transform,opacity,visibility' });
    };

    const measureHandoff = () => {
      gsap.set(wordmark, { transformOrigin: '0 0' });
      const source = wordmark.getBoundingClientRect();
      const target = siteBrand.getBoundingClientRect();
      handoff = {
        x: target.left - source.left,
        y: target.top - source.top,
        scaleX: target.width / source.width,
        scaleY: target.height / source.height,
      };
    };

    introTimeline = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: releaseCinematic,
    });

    introTimeline
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'assemble'; }, [], 0.06)
      .to(topSlice, { autoAlpha: 1, x: 0, y: 0, filter: 'blur(0px)', duration: 0.55, ease: 'power4.out' }, 0.08)
      .to(middleSlice, { autoAlpha: 1, x: 0, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power4.out' }, 0.12)
      .to(bottomSlice, { autoAlpha: 1, x: 0, y: 0, filter: 'blur(0px)', duration: 0.58, ease: 'power4.out' }, 0.07)
      .set(wordmark, { autoAlpha: 1 }, 0.56)
      .to(slices, { autoAlpha: 0, duration: 0.15, ease: 'power1.out' }, 0.56)
      .call(syncDescriptorGeometry, [], 0.64)
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'logo'; }, [], 0.68)
      .to(descriptorWrap, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.33, ease: 'power2.out' }, 0.72);
    xoGlitch(introTimeline, 0.57);

    introTimeline
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'xo-approach'; }, [], 1.12)
      .to(introXoX, { x: () => xoOverlap(), y: -0.5, scale: 0.96, duration: 0.28, ease: 'power2.inOut' }, 1.14)
      .to(introXoO, { x: () => -xoOverlap(), y: 0.5, scale: 1.04, duration: 0.28, ease: 'power2.inOut' }, 1.14);
    xoGlitch(introTimeline, 1.37);
    introTimeline
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'xo-overlap'; }, [], 1.58)
      .to(introXoX, { x: () => xoOverlap() * 0.72, scale: 0.9, autoAlpha: 0.5, duration: 0.1, ease: 'power3.in' }, 1.58)
      .to(introXoO, { x: () => -xoOverlap() * 0.72, scale: 1.08, autoAlpha: 1, duration: 0.1, ease: 'power3.in' }, 1.58)
      .to([introXoX, introXoO], { x: 0, y: 0, xPercent: 0, skewX: 0, scale: 1, autoAlpha: 1, duration: 0.3, ease: 'back.out(1.8)' }, 1.72)
      .call(settleIntroPair, [], 2.08)
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'xo-rest'; }, [], 2.1)
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'xo-expand'; }, [], 2.34)
      .to(introXoX, { x: () => xoOverlap() * 0.78, y: 0.5, scale: 1.03, duration: 0.24, ease: 'power2.inOut' }, 2.34)
      .to(introXoO, { x: () => -xoOverlap() * 0.78, y: -0.5, scale: 0.96, duration: 0.24, ease: 'power2.inOut' }, 2.34);
    xoGlitch(introTimeline, 2.57);
    introTimeline
      .to([introXoX, introXoO], { x: 0, y: 0, xPercent: 0, skewX: 0, scale: 1, autoAlpha: 1, duration: 0.28, ease: 'back.out(1.8)' }, 2.76)
      .call(settleIntroPair, [], 3.08)
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'xo-final'; }, [], 3.1)
      .call(syncDescriptorGeometry, [], 3.43)
      .call(measureHandoff, [], 3.48)
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'handoff'; }, [], 3.5)
      .to(descriptorWrap, { autoAlpha: 0, y: -4, filter: 'blur(1.5px)', duration: 0.24, ease: 'power2.in' }, 3.42)
      .to(wordmark, {
        x: () => handoff.x,
        y: () => handoff.y,
        scaleX: () => handoff.scaleX,
        scaleY: () => handoff.scaleY,
        duration: 0.88,
        ease: 'power4.inOut',
      }, 3.54)
      .call(() => {
        markIntroSeen();
        markIntroReady();
        shell.setAttribute('data-home-intro', 'ready');
        if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'reveal';
      }, [], 4.1)
      .to(backdrop, { autoAlpha: 0, duration: 0.72, ease: 'power2.inOut' }, 4.1)
      .call(() => {
        if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'landed';
        gsap.set(wordmark, { autoAlpha: 0 });
        gsap.set(siteHeader, { autoAlpha: 1 });
      }, [], 4.42)
      .to(headerSecondary, { autoAlpha: 1, duration: 0.34, stagger: 0.04, ease: 'power2.out' }, 4.44)
      .to(cinematicNode, { autoAlpha: 0, duration: 0.24, ease: 'power1.out' }, 4.8);
  };

  startCinematic();

  const landOnInitialHash = () => {
    if (!initialHashTarget) return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const previousBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      initialHashTarget?.scrollIntoView({ block: 'start', behavior: 'auto' });
      document.documentElement.style.scrollBehavior = previousBehavior;
    }));
  };

  if (reducedMotion) {
    landOnInitialHash();
    return;
  }

  const stopJourney = () => {
    if (!journeyTween?.isActive()) return;
    journeyTween.kill();
    journeyTween = undefined;
  };

  const onScrollJourney = (event: MouseEvent) => {
    event.preventDefault();
    const target = document.querySelector<HTMLElement>('[data-disruption]');
    if (!target) return;
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const startY = window.scrollY;
    const top = target.getBoundingClientRect().top + window.scrollY;
    const targetY = top + window.innerHeight * (mobile ? 0.3 : 0.62);
    const state = { y: startY };
    const distance = Math.abs(targetY - startY);
    journeyTween?.kill();
    journeyTween = gsap.to(state, {
      y: targetY,
      duration: gsap.utils.clamp(mobile ? 1.7 : 2, mobile ? 2.45 : 3.2, distance / (mobile ? 530 : 610)),
      ease: mobile ? 'power2.inOut' : 'power3.inOut',
      onUpdate: () => {
        window.scrollTo(0, state.y);
        ScrollTrigger.update();
      },
      onComplete: () => { journeyTween = undefined; },
    });
  };

  scrollControl?.addEventListener('click', onScrollJourney);
  window.addEventListener('wheel', stopJourney, { passive: true });
  window.addEventListener('touchmove', stopJourney, { passive: true });
  window.addEventListener('keydown', stopJourney);

  const ctx = gsap.context(() => {
    const mm = gsap.matchMedia();

    mm.add('(min-width: 761px)', () => {
      const disruption = gsap.timeline({
        scrollTrigger: {
          trigger: '[data-disruption]',
          start: 'top top',
          end: '+=205%',
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });

      disruption
        .to({}, { duration: 0.18 })
        .to('[data-disruption-one]', { xPercent: -7, yPercent: -22, rotate: -1.6, scale: 0.96, duration: 0.42, ease: 'none' })
        .fromTo('[data-disruption-two]', { autoAlpha: 0, color: '#8d8a82', xPercent: 8, yPercent: 12 }, { autoAlpha: 1, color: '#0c0c0b', xPercent: 0, yPercent: 0, duration: 0.38, ease: 'none' }, '<18%')
        .to('[data-disruption-x]', { autoAlpha: 0.08, scale: 1.05, rotate: 6, duration: 0.38, ease: 'none' }, '<12%')
        .to('[data-disruption-caption]', { autoAlpha: 1, y: 0, duration: 0.25, ease: 'none' }, '<18%')
        .to({}, { duration: 0.22 })
        .to('[data-disruption-one]', { xPercent: -28, yPercent: -36, rotate: -3.2, duration: 0.36, ease: 'none' })
        .to('[data-disruption-two]', { xPercent: 22, yPercent: 20, rotate: 2.2, duration: 0.36, ease: 'none' }, '<')
        .to('[data-disruption-x]', { scale: 1.22, rotate: 13, autoAlpha: 0.13, duration: 0.36, ease: 'none' }, '<');
    });

    mm.add('(max-width: 760px)', () => {
      const disruption = gsap.timeline({
        scrollTrigger: {
          trigger: '[data-disruption]',
          start: 'top top',
          end: '+=220%',
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });

      disruption
        .to({}, { duration: 0.22 })
        .to('[data-disruption-one]', { xPercent: -14, yPercent: -12, rotate: -0.8, duration: 0.34, ease: 'none' })
        .fromTo('[data-disruption-two]', { autoAlpha: 0, color: '#aaa79f', filter: 'blur(2px)', xPercent: 15, yPercent: 10 }, { autoAlpha: 1, color: '#0c0c0b', filter: 'blur(0px)', xPercent: 0, yPercent: 0, duration: 0.42, ease: 'none' }, '<12%')
        .to('[data-disruption-x]', { autoAlpha: 0.075, scale: 1.04, rotate: 4, duration: 0.32, ease: 'none' }, '<12%')
        .to('[data-disruption-caption]', { autoAlpha: 1, y: 0, duration: 0.2, ease: 'none' }, '<16%')
        .to({}, { duration: 0.3 })
        .to('[data-disruption-one]', { xPercent: -34, yPercent: -24, rotate: -2.8, duration: 0.46, ease: 'none' })
        .to('[data-disruption-two]', { xPercent: 31, yPercent: 22, rotate: 2.2, duration: 0.46, ease: 'none' }, '<')
        .to('[data-disruption-x]', { scale: 1.13, rotate: 8, duration: 0.42, ease: 'none' }, '<')
        .to('[data-disruption-one]', { xPercent: -31, yPercent: -23, rotate: -2.8, duration: 0.34, ease: 'none' })
        .to('[data-disruption-two]', { xPercent: 28, yPercent: 18, rotate: 2.2, duration: 0.34, ease: 'none' }, '<')
        .to('[data-disruption-x]', { scale: 1.22, rotate: 13, duration: 0.34, ease: 'none' }, '<');
    });

    gsap.utils.toArray<HTMLElement>('[data-project]').forEach((project, index) => {
      const media = project.querySelector<HTMLElement>('[data-project-media]');
      const title = project.querySelector<HTMLElement>('[data-project-title]');
      if (media) {
        gsap.fromTo(media, { clipPath: 'inset(11% 9% 11% 9%)', scale: 0.96 }, {
          clipPath: 'inset(0% 0% 0% 0%)',
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: project, start: 'top 82%', end: 'top 20%', scrub: 0.8 },
        });
      }
      if (title) {
        gsap.fromTo(title, { xPercent: index === 0 ? 7 : -6 }, {
          xPercent: index === 0 ? -4 : 4,
          ease: 'none',
          scrollTrigger: { trigger: project, start: 'top bottom', end: 'bottom top', scrub: 1 },
        });
      }
    });

    gsap.from('[data-statement] span', {
      yPercent: 110,
      rotate: 1.8,
      stagger: 0.08,
      duration: 0.9,
      ease: 'power4.out',
      scrollTrigger: { trigger: '[data-statement]', start: 'top 82%', once: true },
    });

    gsap.utils.toArray<HTMLElement>('[data-approach-step]').forEach((step) => {
      gsap.fromTo(step, { xPercent: 4 }, {
        xPercent: 0,
        ease: 'none',
        scrollTrigger: { trigger: step, start: 'top 88%', end: 'center 58%', scrub: 0.55 },
      });
    });

    const anti = gsap.timeline({
      scrollTrigger: {
        trigger: '[data-anti-sales]',
        start: 'top top',
        end: window.matchMedia('(max-width: 760px)').matches ? '+=135%' : '+=170%',
        scrub: 0.8,
        pin: true,
        anticipatePin: 1,
      },
    });
    anti
      .to({}, { duration: 0.25 })
      .to('[data-anti-first]', { yPercent: -24, autoAlpha: 0, duration: 0.28, ease: 'none' })
      .fromTo('[data-anti-second]', { yPercent: 24, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.34, ease: 'none' }, '<8%')
      .fromTo('[data-anti-copy]', { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.24, ease: 'none' }, '<35%')
      .to({}, { duration: 0.25 });

    if (window.matchMedia('(pointer: fine)').matches) {
      document.querySelectorAll<HTMLElement>('[data-perspective-card]').forEach((card) => {
        const onMove = (event: PointerEvent) => {
          const rect = card.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width - 0.5;
          const py = (event.clientY - rect.top) / rect.height - 0.5;
          card.style.setProperty('--card-ry', `${px * 5}deg`);
          card.style.setProperty('--card-rx', `${py * -4}deg`);
        };
        const reset = () => {
          card.style.setProperty('--card-ry', '0deg');
          card.style.setProperty('--card-rx', '0deg');
        };
        card.addEventListener('pointermove', onMove);
        card.addEventListener('pointerleave', reset);
        pointerCleanups.push(() => {
          card.removeEventListener('pointermove', onMove);
          card.removeEventListener('pointerleave', reset);
        });
      });
    }

    return () => mm.revert();
  }, shell);

  if (initialHashTarget) {
    ScrollTrigger.refresh();
    landOnInitialHash();
  }

  return () => {
    introTimeline?.kill();
    cinematicNode?.remove();
    document.documentElement.classList.remove('is-cinematic-intro');
    brandIdle?.kill();
    brandCycle?.kill();
    settleBrandMotion();
    journeyTween?.kill();
    scrollControl?.removeEventListener('click', onScrollJourney);
    window.removeEventListener('wheel', stopJourney);
    window.removeEventListener('touchmove', stopJourney);
    window.removeEventListener('keydown', stopJourney);
    pointerCleanups.forEach((cleanup) => cleanup());
    delete shell.dataset.motionInitialized;
    ctx.revert();
  };
}
