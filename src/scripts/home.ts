import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '../styles/cinematic.css';

gsap.registerPlugin(ScrollTrigger);

export function initHomeMotion() {
  const shell = document.querySelector<HTMLElement>('[data-home-intro]');
  if (!shell) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const brandLetter = document.querySelector<HTMLElement>('[data-brand-letter]');
  const brandMotion = brandLetter?.closest<HTMLElement>('.site-brand__letter-wrap') ?? brandLetter;
  const scrollControl = document.querySelector<HTMLAnchorElement>('[data-scroll-journey]');
  let introTimeline: gsap.core.Timeline | undefined;
  let cinematicNode: HTMLElement | undefined;
  let brandIdle: gsap.core.Tween | undefined;
  let brandCycle: gsap.core.Timeline | undefined;
  let journeyTween: gsap.core.Tween | undefined;

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
    ScrollTrigger.refresh();
    if (!reducedMotion) brandIdle = gsap.delayedCall(0.7, runBrandCycle);
  };

  const startCinematic = () => {
    if (reducedMotion) {
      shell.setAttribute('data-home-intro', 'ready');
      return;
    }

    cinematicNode = document.createElement('div');
    cinematicNode.className = 'cinematic-intro';
    cinematicNode.dataset.cinematicIntro = '';
    cinematicNode.dataset.cinematicPhase = 'boot';
    cinematicNode.setAttribute('aria-hidden', 'true');
    cinematicNode.innerHTML = `
      <div class="cinematic-intro__panel cinematic-intro__panel--top" data-cinematic-panel-top></div>
      <div class="cinematic-intro__panel cinematic-intro__panel--bottom" data-cinematic-panel-bottom></div>
      <div class="cinematic-intro__grid" data-cinematic-grid>
        <span class="cinematic-intro__grid-line cinematic-intro__grid-line--v"></span>
        <span class="cinematic-intro__grid-line cinematic-intro__grid-line--v"></span>
        <span class="cinematic-intro__grid-line cinematic-intro__grid-line--v"></span>
        <span class="cinematic-intro__grid-line cinematic-intro__grid-line--v"></span>
        <span class="cinematic-intro__grid-line cinematic-intro__grid-line--v"></span>
        <span class="cinematic-intro__grid-line cinematic-intro__grid-line--h"></span>
        <span class="cinematic-intro__grid-line cinematic-intro__grid-line--h"></span>
        <span class="cinematic-intro__grid-line cinematic-intro__grid-line--h"></span>
      </div>
      <div class="cinematic-intro__hud cinematic-intro__hud--top" data-cinematic-hud>
        <span>STANDARD / EXPECTED / SAFE</span><span>01 / NORMAL</span>
      </div>
      <div class="cinematic-intro__hud cinematic-intro__hud--bottom" data-cinematic-hud>
        <span>VICTOR.LEV</span><span>EVERYTHING IN ITS PLACE</span>
      </div>
      <div class="cinematic-intro__wordmark" data-cinematic-wordmark>
        <span>VICT</span><span class="cinematic-intro__letter-slot"><span data-cinematic-o>O</span><span class="cinematic-intro__letter-x" data-cinematic-x>X</span></span><span>R</span><i>.</i><span>LEV</span>
      </div>
      <p class="cinematic-intro__wrong" data-cinematic-wrong>SOMETHING LOOKS WRONG.</p>
      <p class="cinematic-intro__good" data-cinematic-good>GOOD.</p>
      <span class="cinematic-intro__intruder" data-cinematic-intruder>X</span>
      <p class="cinematic-intro__differently" data-cinematic-differently>DIFFERENTLY.</p>
    `;
    shell.prepend(cinematicNode);
    document.documentElement.classList.add('is-cinematic-intro');
    window.scrollTo(0, 0);

    const grid = cinematicNode.querySelector<HTMLElement>('[data-cinematic-grid]');
    const gridLines = cinematicNode.querySelectorAll<HTMLElement>('.cinematic-intro__grid-line');
    const hud = cinematicNode.querySelectorAll<HTMLElement>('[data-cinematic-hud]');
    const wordmark = cinematicNode.querySelector<HTMLElement>('[data-cinematic-wordmark]');
    const o = cinematicNode.querySelector<HTMLElement>('[data-cinematic-o]');
    const x = cinematicNode.querySelector<HTMLElement>('[data-cinematic-x]');
    const wrong = cinematicNode.querySelector<HTMLElement>('[data-cinematic-wrong]');
    const good = cinematicNode.querySelector<HTMLElement>('[data-cinematic-good]');
    const intruder = cinematicNode.querySelector<HTMLElement>('[data-cinematic-intruder]');
    const differently = cinematicNode.querySelector<HTMLElement>('[data-cinematic-differently]');
    const panelTop = cinematicNode.querySelector<HTMLElement>('[data-cinematic-panel-top]');
    const panelBottom = cinematicNode.querySelector<HTMLElement>('[data-cinematic-panel-bottom]');
    const compact = window.matchMedia('(max-width: 760px)').matches;

    if (!grid || !wordmark || !o || !x || !wrong || !good || !intruder || !differently || !panelTop || !panelBottom) {
      shell.setAttribute('data-home-intro', 'ready');
      releaseCinematic();
      return;
    }

    gsap.set(grid, { autoAlpha: 0 });
    gsap.set(gridLines, { scale: 0, transformOrigin: '50% 50%' });
    gsap.set(hud, { autoAlpha: 0, y: 7 });
    gsap.set(wordmark, { autoAlpha: 0, yPercent: 28, clipPath: 'inset(0 0 100% 0)' });
    gsap.set(o, { autoAlpha: 1, x: 0, y: 0, rotation: 0 });
    gsap.set(x, { autoAlpha: 0, x: 0, y: 0, rotation: -12, scale: 0.9 });
    gsap.set(wrong, { autoAlpha: 0, y: 10, clipPath: 'inset(0 0 100% 0)' });
    gsap.set(good, { autoAlpha: 0, y: 8 });
    gsap.set(intruder, {
      autoAlpha: 0,
      x: compact ? '42vw' : '46vw',
      y: compact ? '-38vh' : '-42vh',
      rotation: -26,
      scale: 0.52,
      filter: 'blur(3px)',
    });
    gsap.set(differently, { autoAlpha: 0, xPercent: 7, clipPath: 'inset(0 100% 0 0)' });

    introTimeline = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: releaseCinematic,
    });

    introTimeline
      .to(grid, { autoAlpha: 1, duration: 0.28 }, 0.04)
      .to(gridLines, { scale: 1, duration: 0.42, stagger: 0.018, ease: 'power3.out' }, 0.04)
      .to(hud, { autoAlpha: 0.58, y: 0, duration: 0.34, stagger: 0.04 }, 0.12)
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'normal'; }, [], 0.24)
      .to(wordmark, { autoAlpha: 1, yPercent: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.58 }, 0.26)
      .to({}, { duration: 0.38 })
      .to(o, { x: compact ? 1.5 : 2.5, y: compact ? -2 : -3, rotation: -2.2, duration: 0.26, ease: 'power2.inOut' }, 1.04)
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'wrong'; }, [], 1.2)
      .to(wrong, { autoAlpha: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.38 }, 1.22)
      .to({}, { duration: 0.32 })
      .to(wrong, { autoAlpha: 0.54, y: -3, duration: 0.22, ease: 'power2.out' }, 1.9)
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'good'; }, [], 1.98)
      .to(good, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'back.out(1.8)' }, 1.99)
      .to({}, { duration: 0.22 })
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'x'; }, [], 2.27)
      .to(intruder, { autoAlpha: 0.16, x: 0, y: 0, rotation: 0, scale: 1, filter: 'blur(0px)', duration: 0.36, ease: 'power4.inOut' }, 2.24)
      .to(gridLines, {
        keyframes: [
          { x: compact ? 2 : 4, y: compact ? -1 : -2, opacity: 0.55, duration: 0.045, ease: 'steps(1)' },
          { x: compact ? -2 : -5, y: compact ? 1 : 2, opacity: 1, duration: 0.045, ease: 'steps(1)' },
          { x: 0, y: 0, opacity: 1, duration: 0.08 },
        ],
      }, 2.46)
      .to(o, { x: compact ? 26 : 42, y: compact ? -15 : -24, rotation: -25, scale: 0.82, autoAlpha: 0, filter: 'blur(3px)', duration: 0.22, ease: 'power4.in' }, 2.49)
      .to(x, { autoAlpha: 1, rotation: 0, scale: 1, duration: 0.22, ease: 'back.out(2.3)' }, 2.55)
      .to(x, {
        keyframes: [
          { x: compact ? 2 : 4, skewX: -12, autoAlpha: 0.45, duration: 0.04, ease: 'steps(1)' },
          { x: compact ? -1 : -3, skewX: 8, autoAlpha: 1, duration: 0.04, ease: 'steps(1)' },
          { x: 0, skewX: 0, autoAlpha: 1, duration: 0.07 },
        ],
      }, 2.7)
      .to([wrong, good], { autoAlpha: 0, y: -7, duration: 0.2, ease: 'power2.in' }, 2.62)
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'victxr'; }, [], 2.8)
      .to(intruder, { autoAlpha: 0.055, scale: 1.08, rotation: 4, duration: 0.28, ease: 'power2.out' }, 2.72)
      .to({}, { duration: 0.18 })
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'differently'; }, [], 3.08)
      .to(wordmark, { yPercent: -34, scale: 0.92, autoAlpha: 0.24, duration: 0.36, ease: 'power3.inOut' }, 3.08)
      .to(intruder, { autoAlpha: 0, scale: 1.18, duration: 0.24, ease: 'power2.in' }, 3.08)
      .to(differently, { autoAlpha: 1, xPercent: 0, clipPath: 'inset(0 0% 0 0)', duration: 0.44, ease: 'power4.out' }, 3.1)
      .to({}, { duration: 0.18 })
      .call(() => {
        if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'reveal';
        shell.setAttribute('data-home-intro', 'ready');
      }, [], 3.52)
      .to([hud, grid, wordmark, differently], { autoAlpha: 0, duration: 0.18, ease: 'power2.in' }, 3.52)
      .to(panelTop, { yPercent: -102, duration: 0.62, ease: 'power4.inOut' }, 3.58)
      .to(panelBottom, { yPercent: 102, duration: 0.62, ease: 'power4.inOut' }, 3.58);
  };

  startCinematic();

  if (reducedMotion) return;

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
        .to('[data-disruption-one]', { xPercent: -3, yPercent: -4, rotate: -0.5, duration: 0.28, ease: 'none' })
        .fromTo('[data-disruption-two]', { autoAlpha: 0, color: '#aaa79f', xPercent: 7, yPercent: 6 }, { autoAlpha: 1, color: '#0c0c0b', xPercent: 0, yPercent: 0, duration: 0.34, ease: 'none' }, '<12%')
        .to('[data-disruption-x]', { autoAlpha: 0.075, scale: 1.04, rotate: 4, duration: 0.32, ease: 'none' }, '<12%')
        .to('[data-disruption-caption]', { autoAlpha: 1, y: 0, duration: 0.2, ease: 'none' }, '<16%')
        .to({}, { duration: 0.3 })
        .to('[data-disruption-one]', { xPercent: -14, yPercent: -12, rotate: -1.5, duration: 0.42, ease: 'none' })
        .to('[data-disruption-two]', { xPercent: 11, yPercent: 9, rotate: 1.1, duration: 0.42, ease: 'none' }, '<')
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
      });
    }

    return () => mm.revert();
  }, shell);

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
    ctx.revert();
  };
}
