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
    if (!reducedMotion) brandIdle = gsap.delayedCall(0.55, runBrandCycle);
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
      <div class="cinematic-intro__hud cinematic-intro__hud--top" data-cinematic-hud>
        <span>VICTXR.LEV</span><span>X / O</span>
      </div>
      <div class="cinematic-intro__hud cinematic-intro__hud--bottom" data-cinematic-hud>
        <span>00—01</span><span>LV / WORLDWIDE</span>
      </div>
      <span class="cinematic-intro__axis cinematic-intro__axis--x" data-cinematic-axis-x></span>
      <span class="cinematic-intro__axis cinematic-intro__axis--y" data-cinematic-axis-y></span>
      <div class="cinematic-intro__symbol" data-cinematic-symbol>
        <span class="cinematic-intro__glyph cinematic-intro__glyph--x" data-cinematic-x>X</span>
        <span class="cinematic-intro__glyph cinematic-intro__glyph--o" data-cinematic-o>O</span>
      </div>
      <div class="cinematic-intro__wordmark" data-cinematic-wordmark>
        <span>VICT</span><span class="cinematic-intro__wordmark-x" data-cinematic-wordmark-x>X</span><span>R</span><i>.</i><span>LEV</span>
      </div>
    `;
    shell.prepend(cinematicNode);
    document.documentElement.classList.add('is-cinematic-intro');
    window.scrollTo(0, 0);

    const x = cinematicNode.querySelector<HTMLElement>('[data-cinematic-x]');
    const o = cinematicNode.querySelector<HTMLElement>('[data-cinematic-o]');
    const wordmark = cinematicNode.querySelector<HTMLElement>('[data-cinematic-wordmark]');
    const wordmarkX = cinematicNode.querySelector<HTMLElement>('[data-cinematic-wordmark-x]');
    const hud = cinematicNode.querySelectorAll<HTMLElement>('[data-cinematic-hud]');
    const axisX = cinematicNode.querySelector<HTMLElement>('[data-cinematic-axis-x]');
    const axisY = cinematicNode.querySelector<HTMLElement>('[data-cinematic-axis-y]');
    const panelTop = cinematicNode.querySelector<HTMLElement>('[data-cinematic-panel-top]');
    const panelBottom = cinematicNode.querySelector<HTMLElement>('[data-cinematic-panel-bottom]');
    const compact = window.matchMedia('(max-width: 760px)').matches;

    if (!x || !o || !wordmark || !wordmarkX || !axisX || !axisY || !panelTop || !panelBottom) {
      shell.setAttribute('data-home-intro', 'ready');
      releaseCinematic();
      return;
    }

    gsap.set(hud, { autoAlpha: 0, y: 8 });
    gsap.set(axisX, { scaleX: 0, transformOrigin: '50% 50%' });
    gsap.set(axisY, { scaleY: 0, transformOrigin: '50% 50%' });
    gsap.set(x, { autoAlpha: 0, scale: 0.28, rotation: -18, filter: 'blur(7px)' });
    gsap.set(o, { autoAlpha: 0, scale: 0.62, rotation: 26, filter: 'blur(5px)' });
    gsap.set(wordmark, { autoAlpha: 0, yPercent: 90, clipPath: 'inset(0 0 100% 0)' });

    introTimeline = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: releaseCinematic,
    });

    introTimeline
      .to(hud, { autoAlpha: 0.62, y: 0, duration: 0.36, stagger: 0.04 }, 0.04)
      .to(axisX, { scaleX: 1, duration: 0.42 }, 0.08)
      .to(axisY, { scaleY: 1, duration: 0.42 }, 0.11)
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'x'; }, [], 0.16)
      .to(x, { autoAlpha: 1, scale: 1, rotation: 0, filter: 'blur(0px)', duration: 0.42, ease: 'back.out(1.7)' }, 0.18)
      .to(x, {
        keyframes: [
          { x: 0, skewX: 0, scaleX: 1, duration: 0.02 },
          { x: compact ? 4 : 8, skewX: -13, scaleX: 1.08, autoAlpha: 0.42, duration: 0.045, ease: 'steps(1)' },
          { x: compact ? -3 : -6, skewX: 9, scaleX: 0.92, autoAlpha: 1, duration: 0.045, ease: 'steps(1)' },
          { x: 0, skewX: 0, scaleX: 1, autoAlpha: 1, duration: 0.065 },
        ],
      }, 0.59)
      .to(x, { rotation: -118, scale: 1.32, autoAlpha: 0.08, filter: 'blur(4px)', duration: 0.2, ease: 'power4.in' }, 0.77)
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'o'; }, [], 0.82)
      .to(o, { autoAlpha: 1, scale: 1, rotation: 0, filter: 'blur(0px)', duration: 0.3, ease: 'back.out(2)' }, 0.82)
      .to(o, {
        keyframes: [
          { x: compact ? -2 : -4, skewX: 8, autoAlpha: 0.55, duration: 0.045, ease: 'steps(1)' },
          { x: compact ? 2 : 5, skewX: -10, autoAlpha: 1, duration: 0.045, ease: 'steps(1)' },
          { x: 0, skewX: 0, autoAlpha: 1, duration: 0.07 },
        ],
      }, 1.05)
      .to([x, o], { autoAlpha: 0, scale: 0.84, filter: 'blur(3px)', duration: 0.16, ease: 'power3.in' }, 1.22)
      .call(() => { if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'wordmark'; }, [], 1.24)
      .to(wordmark, { autoAlpha: 1, yPercent: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.5, ease: 'power4.out' }, 1.24)
      .to(wordmarkX, {
        keyframes: [
          { x: 0, skewX: 0, duration: 0.02 },
          { x: compact ? 3 : 6, skewX: -12, autoAlpha: 0.35, duration: 0.04, ease: 'steps(1)' },
          { x: compact ? -2 : -4, skewX: 8, autoAlpha: 1, duration: 0.04, ease: 'steps(1)' },
          { x: 0, skewX: 0, autoAlpha: 1, duration: 0.07 },
        ],
      }, 1.63)
      .to({}, { duration: 0.22 })
      .call(() => {
        if (cinematicNode) cinematicNode.dataset.cinematicPhase = 'reveal';
        shell.setAttribute('data-home-intro', 'ready');
      }, [], 1.92)
      .to([hud, axisX, axisY, wordmark], { autoAlpha: 0, duration: 0.16, ease: 'power2.in' }, 1.93)
      .to(panelTop, { yPercent: -102, duration: 0.62, ease: 'power4.inOut' }, 1.96)
      .to(panelBottom, { yPercent: 102, duration: 0.62, ease: 'power4.inOut' }, 1.96);

    if (compact) introTimeline.timeScale(1.12);
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