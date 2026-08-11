import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initHomeMotion() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) return;

  const ctx = gsap.context(() => {
    const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });

    intro
      .from('.site-header', { autoAlpha: 0, y: -12, duration: 0.8 })
      .from(
        '.hero__line-inner',
        {
          yPercent: 115,
          rotate: 1.5,
          duration: 1.25,
          stagger: 0.08,
        },
        0.06,
      )
      .from('.hero__footer', { autoAlpha: 0, y: 14, duration: 0.9 }, 0.42)
      .from('[data-side-note]', { autoAlpha: 0, x: 12, duration: 0.9 }, 0.68)
      .from('.hero__scroll', { autoAlpha: 0, y: 10, duration: 0.82 }, 0.84);

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
          end: 'center 18%',
          scrub: 0.9,
        },
      });

      catrin
        .fromTo('[data-catrin-title]', { x: '9vw' }, { x: '0vw', duration: 0.34, ease: 'none' })
        .to({}, { duration: 0.2 })
        .to('[data-catrin-title]', { x: '-12vw', duration: 0.46, ease: 'none' });

      const scrollControl = document.querySelector<HTMLAnchorElement>('[data-scroll-journey]');
      let journeyTween: gsap.core.Tween | undefined;

      const stopJourney = () => {
        if (journeyTween?.isActive()) journeyTween.kill();
      };

      const onScrollJourney = (event: MouseEvent) => {
        event.preventDefault();

        const targetSection = document.querySelector<HTMLElement>('[data-disruption]');
        if (!targetSection) return;

        journeyTween?.kill();

        const startY = window.scrollY;
        const disruptionTop = targetSection.getBoundingClientRect().top + window.scrollY;
        const targetY = disruptionTop + window.innerHeight * 0.78;
        const distance = Math.abs(targetY - startY);
        const duration = gsap.utils.clamp(1.9, 3.15, distance / 620);
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

      return () => {
        journeyTween?.kill();
        scrollControl?.removeEventListener('click', onScrollJourney);
        window.removeEventListener('wheel', stopJourney);
        window.removeEventListener('touchstart', stopJourney);
        window.removeEventListener('keydown', stopJourney);
      };
    });

    mm.add('(max-width: 760px)', () => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: '[data-disruption]',
            start: 'top 70%',
            end: 'bottom 65%',
            scrub: 0.7,
          },
        })
        .to('[data-disruption-one]', { xPercent: -4, rotate: -1.5, ease: 'none' })
        .to(
          '[data-disruption-two]',
          { autoAlpha: 1, xPercent: 3, rotate: 1, ease: 'none' },
          '<20%',
        )
        .to('[data-disruption-x]', { autoAlpha: 0.07, scale: 1, rotate: 6, ease: 'none' }, '<')
        .to('[data-disruption-caption]', { autoAlpha: 1, ease: 'none' }, '<45%');

      gsap.to('[data-catrin-title]', {
        x: '-28vw',
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-catrin]',
          start: 'top bottom',
          end: 'center center',
          scrub: 0.8,
        },
      });
    });
  });

  return () => ctx.revert();
}
