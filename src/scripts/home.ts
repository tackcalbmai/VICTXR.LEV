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
      .from('.micro-note', { autoAlpha: 0, x: 8, duration: 0.8 }, 0.62);

    const mm = gsap.matchMedia();

    mm.add('(min-width: 761px)', () => {
      const disruption = gsap.timeline({
        scrollTrigger: {
          trigger: '[data-disruption]',
          start: 'top top',
          end: '+=170%',
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });

      disruption
        .to('[data-disruption-one]', {
          xPercent: -7,
          yPercent: -25,
          rotate: -2.2,
          scale: 0.92,
          transformOrigin: 'left center',
          ease: 'none',
        })
        .to(
          '[data-disruption-two]',
          {
            autoAlpha: 1,
            xPercent: 3,
            yPercent: 12,
            rotate: 1.3,
            ease: 'none',
          },
          '<20%',
        )
        .to(
          '[data-disruption-x]',
          {
            autoAlpha: 0.08,
            scale: 1,
            rotate: 8,
            ease: 'none',
          },
          '<10%',
        )
        .to(
          '[data-disruption-caption]',
          {
            autoAlpha: 1,
            y: -10,
            ease: 'none',
          },
          '<45%',
        );

      gsap.to('[data-catrin-title]', {
        x: '-18vw',
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-catrin]',
          start: 'top bottom',
          end: 'center center',
          scrub: 1,
        },
      });
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
