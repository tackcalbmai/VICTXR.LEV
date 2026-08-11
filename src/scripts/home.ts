import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initHomeMotion() {
  const homeShell = document.querySelector<HTMLElement>('[data-home-intro]');
  const brandLetter = document.querySelector<HTMLElement>('[data-brand-letter]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  if (reducedMotion) {
    homeShell?.setAttribute('data-home-intro', 'ready');
    return;
  }

  const ctx = gsap.context(() => {
    let brandIdle: gsap.core.Tween | undefined;
    let brandCycle: gsap.core.Timeline | undefined;
    let brandIntroStart: gsap.core.Tween | undefined;

    const scheduleBrandCycle = (delay = 7.5) => {
      brandIdle?.kill();
      brandIdle = gsap.delayedCall(delay, () => runBrandCycle());
    };

    const glitchBrandLetter = (timeline: gsap.core.Timeline, position: number | string) => {
      if (!brandLetter) return;
      timeline.to(
        brandLetter,
        {
          keyframes: [
            { x: 0, skewX: 0, autoAlpha: 1, duration: 0.01 },
            { x: 2.5, skewX: -17, autoAlpha: 0.28, duration: 0.035, ease: 'steps(1)' },
            { x: -2, skewX: 12, autoAlpha: 1, duration: 0.035, ease: 'steps(1)' },
            { x: 0, skewX: 0, autoAlpha: 1, duration: 0.06 },
          ],
        },
        position,
      );
    };

    const runBrandCycle = () => {
      if (!brandLetter || document.hidden) {
        scheduleBrandCycle(5);
        return;
      }

      brandCycle?.kill();
      brandCycle = gsap.timeline({ onComplete: () => scheduleBrandCycle(9.5) });

      brandCycle
        .to(brandLetter, {
          rotation: -105,
          duration: 0.48,
          ease: 'power1.in',
          transformOrigin: '50% 52%',
        })
        .to(brandLetter, { rotation: -360, duration: 0.25, ease: 'power4.in' });

      glitchBrandLetter(brandCycle, '<-0.11');

      brandCycle
        .call(() => {
          brandLetter.textContent = 'O';
          gsap.set(brandLetter, { rotation: 0 });
        })
        .to(brandLetter, { x: 0, skewX: 0, autoAlpha: 1, duration: 0.16, ease: 'power2.out' })
        .to({}, { duration: 1.35 })
        .to(brandLetter, {
          rotation: -120,
          duration: 0.42,
          ease: 'power1.in',
          transformOrigin: '50% 52%',
        })
        .to(brandLetter, { rotation: -360, duration: 0.23, ease: 'power4.in' });

      glitchBrandLetter(brandCycle, '<-0.11');

      brandCycle
        .call(() => {
          brandLetter.textContent = 'X';
          gsap.set(brandLetter, { rotation: 0 });
        })
        .to(brandLetter, { x: 0, skewX: 0, autoAlpha: 1, duration: 0.16, ease: 'power2.out' });
    };

    const finishIntro = () => {
      homeShell?.setAttribute('data-home-intro', 'ready');
      gsap.set(
        '[data-intro-header], [data-intro-line], [data-intro-footer], [data-side-note], [data-scroll-journey]',
        { clearProps: 'opacity,visibility,transform,clipPath,filter' },
      );
      ScrollTrigger.refresh();
      if (brandLetter) brandIntroStart = gsap.delayedCall(0.34, runBrandCycle);
    };

    const intro = gsap.timeline({
      paused: true,
      defaults: { ease: 'power4.out' },
      onComplete: finishIntro,
    });

    intro
      .to('[data-intro-header]', { autoAlpha: 1, y: 0, duration: 0.38 }, 0)
      .to(
        '[data-intro-line]',
        {
          autoAlpha: 1,
          yPercent: 0,
          rotate: 0,
          clipPath: 'inset(0% 0% 0% 0%)',
          filter: 'blur(0px)',
          duration: 0.86,
          stagger: 0.16,
        },
        0.02,
      )
      .to(
        '[data-intro-line]',
        {
          keyframes: [
            { x: 0, skewX: 0, duration: 0.01 },
            { x: 6, skewX: -8, duration: 0.035, ease: 'steps(1)' },
            { x: -4, skewX: 6, duration: 0.035, ease: 'steps(1)' },
            { x: 2, skewX: -3, duration: 0.03, ease: 'steps(1)' },
            { x: 0, skewX: 0, duration: 0.11, ease: 'power2.out' },
          ],
          stagger: 0.055,
        },
        0.78,
      )
      .to('[data-intro-footer]', { autoAlpha: 1, y: 0, duration: 0.5 }, 0.72)
      .to(
        '[data-side-note]',
        {
          autoAlpha: 1,
          clipPath: 'inset(0% 0% 0% 0%)',
          filter: 'blur(0px)',
          duration: 0.7,
        },
        0.74,
      )
      .to('[data-scroll-journey]', { autoAlpha: 1, y: 0, duration: 0.48 }, 0.96)
      .to(
        '[data-intro-suffix]',
        {
          keyframes: [
            { x: 0, skewX: 0, duration: 0.01 },
            { x: 4, skewX: -10, duration: 0.04, ease: 'steps(1)' },
            { x: -2, skewX: 7, duration: 0.04, ease: 'steps(1)' },
            { x: 0, skewX: 0, duration: 0.075 },
          ],
        },
        1.08,
      );

    requestAnimationFrame(() => {
      requestAnimationFrame(() => intro.play(0));
    });

    const scrollControl = document.querySelector<HTMLAnchorElement>('[data-scroll-journey]');
    let journeyTween: gsap.core.Tween | undefined;

    const stopJourney = () => {
      if (journeyTween?.isActive()) {
        journeyTween.kill();
        journeyTween = undefined;
      }
    };

    const onScrollJourney = (event: MouseEvent) => {
      event.preventDefault();
      const targetSection = document.querySelector<HTMLElement>('[data-disruption]');
      if (!targetSection) return;

      journeyTween?.kill();
      const mobile = window.matchMedia('(max-width: 760px)').matches;
      const startY = window.scrollY;
      const disruptionTop = targetSection.getBoundingClientRect().top + window.scrollY;
      const targetY = disruptionTop + window.innerHeight * (mobile ? 0.29 : 0.78);
      const distance = Math.abs(targetY - startY);
      const duration = gsap.utils.clamp(
        mobile ? 1.65 : 1.95,
        mobile ? 2.25 : 3.15,
        distance / (mobile ? 560 : 620),
      );
      const state = { y: startY };

      journeyTween = gsap.to(state, {
        y: targetY,
        duration,
        ease: mobile ? 'power2.inOut' : 'power3.inOut',
        onUpdate: () => {
          window.scrollTo(0, state.y);
          ScrollTrigger.update();
        },
        onComplete: () => {
          journeyTween = undefined;
        },
      });
    };

    scrollControl?.addEventListener('click', onScrollJourney);
    window.addEventListener('wheel', stopJourney, { passive: true });
    window.addEventListener('touchmove', stopJourney, { passive: true });
    window.addEventListener('keydown', stopJourney);

    const mm = gsap.matchMedia();

    mm.add('(min-width: 761px)', () => {
      const disruption = gsap.timeline({
        scrollTrigger: {
          trigger: '[data-disruption]',
          start: 'top top',
          end: '+=165%',
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });

      disruption
        .to('[data-disruption-one]', {
          xPercent: -4.5,
          yPercent: -23,
          rotate: -1.8,
          scale: 0.94,
          transformOrigin: 'left center',
          ease: 'none',
        })
        .to('[data-disruption-two]', { autoAlpha: 1, xPercent: 2.2, yPercent: 8, rotate: 0.9, ease: 'none' }, '<22%')
        .to('[data-disruption-x]', { autoAlpha: 0.085, scale: 1.04, rotate: 7, ease: 'none' }, '<10%')
        .to('[data-disruption-caption]', { autoAlpha: 1, y: -6, duration: 0.34, ease: 'none' }, '<4%');

      const catrin = gsap.timeline({
        scrollTrigger: {
          trigger: '[data-catrin]',
          start: 'top 92%',
          end: 'bottom bottom',
          scrub: 0.9,
        },
      });

      catrin
        .fromTo('[data-catrin-title]', { x: '9vw' }, { x: '0vw', duration: 0.18, ease: 'none' })
        .to({}, { duration: 0.6 })
        .to('[data-catrin-title]', { x: '-12vw', duration: 0.22, ease: 'none' });
    });

    mm.add('(max-width: 760px)', () => {
      const disruption = gsap.timeline({
        scrollTrigger: {
          trigger: '[data-disruption]',
          start: 'top 86%',
          end: 'bottom 8%',
          scrub: 1.05,
        },
      });

      disruption
        .fromTo(
          '[data-disruption-one]',
          { xPercent: 0, yPercent: 0, rotate: 0, scale: 1 },
          {
            xPercent: -6,
            yPercent: -5,
            rotate: -0.9,
            scale: 0.99,
            transformOrigin: 'left center',
            duration: 0.28,
            ease: 'none',
          },
        )
        .fromTo(
          '[data-disruption-two]',
          { autoAlpha: 0.12, color: '#98968f', xPercent: 5, yPercent: 4, rotate: 0.25 },
          {
            autoAlpha: 1,
            color: '#0a0a0a',
            xPercent: 0,
            yPercent: 0,
            rotate: 0,
            duration: 0.32,
            ease: 'none',
          },
          '<16%',
        )
        .to('[data-disruption-x]', {
          autoAlpha: 0.08,
          scale: 1.05,
          rotate: 5,
          duration: 0.28,
          ease: 'none',
        }, '<12%')
        .to('[data-disruption-caption]', {
          autoAlpha: 1,
          y: -3,
          duration: 0.2,
          ease: 'none',
        }, '<18%')
        .to('[data-disruption-one]', {
          xPercent: -12,
          yPercent: -9,
          rotate: -1.45,
          duration: 0.44,
          ease: 'none',
        })
        .to('[data-disruption-two]', {
          xPercent: 9,
          yPercent: 5,
          rotate: 0.9,
          duration: 0.44,
          ease: 'none',
        }, '<')
        .to('[data-disruption-x]', {
          scale: 1.11,
          rotate: 7,
          duration: 0.44,
          ease: 'none',
        }, '<')
        .to('[data-disruption-one]', {
          xPercent: -24,
          yPercent: -15,
          rotate: -2.5,
          duration: 0.34,
          ease: 'none',
        })
        .to('[data-disruption-two]', {
          xPercent: 22,
          yPercent: 12,
          rotate: 1.8,
          duration: 0.34,
          ease: 'none',
        }, '<')
        .to('[data-disruption-x]', {
          scale: 1.2,
          rotate: 11,
          duration: 0.34,
          ease: 'none',
        }, '<');

      const catrin = gsap.timeline({
        scrollTrigger: {
          trigger: '[data-catrin]',
          start: 'top 94%',
          end: 'bottom bottom',
          scrub: 0.88,
        },
      });

      catrin
        .fromTo('[data-catrin-title]', { x: '10vw' }, { x: '0vw', duration: 0.24, ease: 'none' })
        .to({}, { duration: 0.58 })
        .to('[data-catrin-title]', { x: '-13vw', duration: 0.18, ease: 'none' });
    });

    return () => {
      intro.kill();
      brandIntroStart?.kill();
      brandIdle?.kill();
      brandCycle?.kill();
      journeyTween?.kill();
      scrollControl?.removeEventListener('click', onScrollJourney);
      window.removeEventListener('wheel', stopJourney);
      window.removeEventListener('touchmove', stopJourney);
      window.removeEventListener('keydown', stopJourney);
      mm.revert();
    };
  });

  return () => ctx.revert();
}
