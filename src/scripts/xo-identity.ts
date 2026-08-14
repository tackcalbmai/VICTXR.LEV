type XoWindow = Window & { __xoIdentityInitialized?: boolean };

const premiumEase = 'cubic-bezier(0.16, 1, 0.3, 1)';

function holdFinal(animation: Animation, element: HTMLElement, styles: Partial<CSSStyleDeclaration>) {
  animation.finished.then(() => {
    Object.assign(element.style, styles);
    animation.cancel();
  }).catch(() => undefined);
}

export function initXoIdentity() {
  const xoWindow = window as XoWindow;
  if (xoWindow.__xoIdentityInitialized) return;
  xoWindow.__xoIdentityInitialized = true;

  const submark = document.querySelector<HTMLElement>('[data-xo-submark]');
  const submarkCore = document.querySelector<HTMLElement>('[data-xo-submark-core]');
  const submarkTail = document.querySelector<HTMLElement>('[data-xo-submark-tail]');
  if (!submark || !submarkCore || !submarkTail) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shell = document.querySelector<HTMLElement>('[data-home-intro]');
  let headerRevealStarted = false;
  let activeCinematic: HTMLElement | null = null;
  let cinematicPhaseObserver: MutationObserver | null = null;

  const showHeaderStatic = () => {
    headerRevealStarted = true;
    submark.style.opacity = '1';
    submark.style.transform = 'none';
    submarkCore.style.opacity = '1';
    submarkCore.style.transform = 'none';
    submarkTail.style.opacity = '1';
    submarkTail.style.transform = 'none';
    submark.dataset.xoSubmarkState = 'ready';
  };

  const revealHeaderSubmark = (delay = 180) => {
    if (headerRevealStarted) return;
    headerRevealStarted = true;

    if (reducedMotion) {
      showHeaderStatic();
      return;
    }

    window.setTimeout(() => {
      submark.style.opacity = '1';
      submark.dataset.xoSubmarkState = 'revealing';

      const coreAnimation = submarkCore.animate([
        { opacity: 0, transform: 'translateY(3px) scaleX(0.92)', letterSpacing: '0.24em' },
        { opacity: 1, transform: 'translateY(0) scaleX(1)', letterSpacing: '0.16em' },
      ], { duration: 190, easing: premiumEase, fill: 'forwards' });
      holdFinal(coreAnimation, submarkCore, { opacity: '1', transform: 'none', letterSpacing: '0.16em' });

      const tailAnimation = submarkTail.animate([
        { opacity: 0, transform: 'translateX(-5px)', filter: 'blur(2px)' },
        { opacity: 1, transform: 'translateX(0)', filter: 'blur(0px)' },
      ], { duration: 220, delay: 95, easing: premiumEase, fill: 'forwards' });
      holdFinal(tailAnimation, submarkTail, { opacity: '1', transform: 'none', filter: 'blur(0px)' });

      window.setTimeout(() => {
        submark.dataset.xoSubmarkState = 'ready';
      }, 340);
    }, delay);
  };

  const detachCinematicObserver = () => {
    cinematicPhaseObserver?.disconnect();
    cinematicPhaseObserver = null;
    activeCinematic = null;
  };

  const attachCinematic = (cinematic: HTMLElement) => {
    if (activeCinematic === cinematic || cinematic.dataset.xoIdentityAttached === 'true') return;
    detachCinematicObserver();
    activeCinematic = cinematic;
    cinematic.dataset.xoIdentityAttached = 'true';

    cinematicPhaseObserver = new MutationObserver(() => {
      if (cinematic.dataset.cinematicPhase === 'landed') revealHeaderSubmark(140);
    });
    cinematicPhaseObserver.observe(cinematic, { attributes: true, attributeFilter: ['data-cinematic-phase'] });
  };

  if (!shell || shell.dataset.homeIntro !== 'pending') {
    showHeaderStatic();
    return;
  }

  submark.style.opacity = '0';
  submarkCore.style.opacity = '0';
  submarkTail.style.opacity = '0';
  submark.dataset.xoSubmarkState = 'waiting';

  const existingCinematic = shell.querySelector<HTMLElement>('[data-cinematic-intro]');
  if (existingCinematic) attachCinematic(existingCinematic);

  const shellObserver = new MutationObserver(() => {
    const cinematic = shell.querySelector<HTMLElement>('[data-cinematic-intro]');
    if (cinematic) attachCinematic(cinematic);

    if (shell.dataset.homeIntro === 'ready' && !cinematic && !headerRevealStarted) {
      reducedMotion ? showHeaderStatic() : revealHeaderSubmark(0);
      detachCinematicObserver();
    }
  });

  shellObserver.observe(shell, { childList: true, attributes: true, attributeFilter: ['data-home-intro'] });
}
