import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initHomeMotion() {
  const homeShell = document.querySelector<HTMLElement>('[data-home-intro]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    homeShell?.setAttribute('data-home-intro', 'ready');
    return;
  }

  const ctx = gsap.context(() => {
    const finishIntro = () => {
      homeShell?.setAttribute('data-home-intro', 'ready');
      gsap.set(
        '[data-intro-header], [data-intro-line], [data-intro-footer], [data-side-note], [data-scroll-journey]',
        { clearProps: 'opacity,visibility,transform' },
      );
    };

    const intro = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: finishIntro,
    });

    intro
      .to('[data-intro-header]', {
        autoAlpha: 1,
        y: 0,
        duration: 0.62,
      })
      .to(
        '[data-intro-line]',
        {
          yPercent: 0,
          rotate: 0,
          duration: 1.12,
          stagger: 0.13,
        },
        0.08,
      )
      .to(
        '[data-intro-footer]',
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.72,
        },
        0.72,
      )
      .to(
        '[data-side-note]',
        {
          autoAlpha: 1,
          duration: 0.62,
        },
        1.08,
      )
      .to(
        '[data-scroll-journey]',
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.62,
        },
        1.32,
      )
      .to(
        '[data-intro-suffix]',
        {
          keyframes: [
            { x: 0, duration: 0.01 },
            { x: 4, skewX: -10, duration: 0.045, ease: 'steps(1)' },
            { x: -2, skewX: 7, duration: 0.045, ease: 'steps(1)' },
            { x: 0, skewX: 0, duration: 0.08 },
          ],
        },
        1.46,
      );

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
      const targetY = disruptionTop + window.innerHeight * (mobile ? 0.38 : 0.78);
      const distance = Math.abs(targetY - startY);
      const duration = gsap.utils.clamp(mobile ? 1.75 : 1.95, mobile ? 2.65 : 3.15, distance / (mobile ? 520 : 620));
      const state = { y: startY };

      journeyTween = gsap.to(state, {
        y: targetY,
        duration,
        ease: 'power3.inOut',
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
    window.addEventListener('touchstart', stopJourney, { passive: true });
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
        .to(
          '[data-disruption-two]',
          {
            autoAlpha: 1,
            xPercent: 2.2,
            yPercent: 8,
            rotate: 0.9,
            ease: 'none',
          },
          '<22%',
        )
        .to(
          '[data-disruption-x]',
          {
            autoAlpha: 0.085,
            scale: 1.04,
            rotate: 7,
            ease: 'none',
          },
          '<10%',
        )
        .to(
          '[data-disruption-caption]',
          {
            autoAlpha: 1,
            y: -6,
            duration: 0.34,
            ease: 'none',
          },
          '<4%',
        );

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
          start: 'top 82%',
          end: 'bottom 48%',
          scrub: 0.78,
        },
      });

      disruption
        .to('[data-disruption-one]', {
          xPercent: -10,
          yPercent: -8,
          rotate: -2.2,
          scale: 0.97,
          transformOrigin: 'left center',
          ease: 'none',
        })
        .to(
          '[data-disruption-two]',
          {
            autoAlpha: 1,
            xPercent: 7,
            yPercent: 4,
            rotate: 1.3,
            ease: 'none',
          },
          '<18%',
        )
        .to(
          '[data-disruption-x]',
          {
            autoAlpha: 0.085,
            scale: 1.12,
            rotate: 8,
            ease: 'none',
          },
          '<8%',
        )
        .to(
          '[data-disruption-caption]',
          {
            autoAlpha: 1,
            y: -4,
            ease: 'none',
          },
          '<24%',
        );

      const catrin = gsap.timeline({
        scrollTrigger: {
          trigger: '[data-catrin]',
          start: 'top 94%',
          end: 'bottom bottom',
          scrub: 0.82,
        },
      });

      catrin
        .fromTo('[data-catrin-title]', { x: '14vw' }, { x: '0vw', duration: 0.25, ease: 'none' })
        .to({}, { duration: 0.5 })
        .to('[data-catrin-title]', { x: '-18vw', duration: 0.25, ease: 'none' });
    });

    return () => {
      journeyTween?.kill();
      scrollControl?.removeEventListener('click', onScrollJourney);
      window.removeEventListener('wheel', stopJourney);
      window.removeEventListener('touchstart', stopJourney);
      window.removeEventListener('keydown', stopJourney);
    };
  });

  return () => ctx.revert();
}
