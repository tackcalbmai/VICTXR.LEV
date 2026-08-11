import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initHomeMotion() {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    root.classList.remove('intro-pending');
    return;
  }

  const ctx = gsap.context(() => {
    gsap.set('.site-header', { autoAlpha: 0, y: -14 });
    gsap.set('.hero__line-inner', { autoAlpha: 0, yPercent: 112, rotate: 1.4 });
    gsap.set('.hero__intro, .hero__actions', { autoAlpha: 0, y: 14 });
    gsap.set('[data-side-note]', { autoAlpha: 0, filter: 'blur(4px)' });
    gsap.set('.hero__scroll', { autoAlpha: 0, y: 14 });

    const intro = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: () => {
        root.classList.remove('intro-pending');
        ScrollTrigger.refresh();
      },
    });

    intro
      .to('.site-header', { autoAlpha: 1, y: 0, duration: 0.62 })
      .to(
        '.hero__line-inner',
        {
          autoAlpha: 1,
          yPercent: 0,
          rotate: 0,
          duration: 1.05,
          stagger: 0.11,
        },
        0.08,
      )
      .to('.hero__intro', { autoAlpha: 1, y: 0, duration: 0.66 }, 0.66)
      .to('.hero__actions', { autoAlpha: 1, y: 0, duration: 0.66 }, 0.78)
      .to('[data-side-note]', { autoAlpha: 1, filter: 'blur(0px)', duration: 0.72 }, 0.93)
      .to('.hero__scroll', { autoAlpha: 1, y: 0, duration: 0.72 }, 1.08)
      .to('.site-header__dot', { opacity: 1, duration: 0.055, repeat: 3, yoyo: true, ease: 'none' }, 1.04);

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

      const startY = window.scrollY;
      const disruptionTop = targetSection.getBoundingClientRect().top + window.scrollY;
      const mobile = window.matchMedia('(max-width: 760px)').matches;
      const targetY = disruptionTop + window.innerHeight * (mobile ? 0.42 : 0.78);
      const distance = Math.abs(targetY - startY);
      const duration = gsap.utils.clamp(mobile ? 1.65 : 1.9, mobile ? 2.6 : 3.15, distance / 620);
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
          start: 'top 72%',
          end: 'bottom 56%',
          scrub: 0.75,
        },
      });

      disruption
        .to('[data-disruption-one]', {
          xPercent: -5,
          yPercent: -4,
          rotate: -1.8,
          ease: 'none',
        })
        .to(
          '[data-disruption-two]',
          { autoAlpha: 1, xPercent: 4, yPercent: 2, rotate: 1.1, ease: 'none' },
          '<18%',
        )
        .to('[data-disruption-x]', { autoAlpha: 0.075, scale: 1.08, rotate: 7, ease: 'none' }, '<')
        .to('[data-disruption-caption]', { autoAlpha: 1, y: -4, ease: 'none' }, '<42%');

      const catrin = gsap.timeline({
        scrollTrigger: {
          trigger: '[data-catrin]',
          start: 'top 92%',
          end: 'bottom bottom',
          scrub: 0.8,
        },
      });

      catrin
        .fromTo('[data-catrin-title]', { x: '8vw' }, { x: '0vw', duration: 0.24, ease: 'none' })
        .to({}, { duration: 0.56 })
        .to('[data-catrin-title]', { x: '-10vw', duration: 0.2, ease: 'none' });
    });

    return () => {
      journeyTween?.kill();
      scrollControl?.removeEventListener('click', onScrollJourney);
      window.removeEventListener('wheel', stopJourney);
      window.removeEventListener('touchstart', stopJourney);
      window.removeEventListener('keydown', stopJourney);
      mm.revert();
    };
  });

  return () => ctx.revert();
}
