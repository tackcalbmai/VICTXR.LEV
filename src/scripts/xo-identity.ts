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
  let cinematicLetterObserver: MutationObserver | null = null;
  let identityTimer = 0;

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

  const detachCinematicObservers = () => {
    cinematicPhaseObserver?.disconnect();
    cinematicLetterObserver?.disconnect();
    cinematicPhaseObserver = null;
    cinematicLetterObserver = null;
    if (identityTimer) window.clearTimeout(identityTimer);
    identityTimer = 0;
    activeCinematic = null;
  };

  const attachCinematic = (cinematic: HTMLElement) => {
    if (activeCinematic === cinematic || cinematic.dataset.xoIdentityAttached === 'true') return;
    detachCinematicObservers();
    activeCinematic = cinematic;
    cinematic.dataset.xoIdentityAttached = 'true';

    const descriptorWrap = cinematic.querySelector<HTMLElement>('[data-cinematic-descriptor-wrap]');
    const descriptor = cinematic.querySelector<HTMLElement>('[data-cinematic-descriptor]');
    const introLetter = cinematic.querySelector<HTMLElement>('[data-cinematic-letter]');
    if (!descriptorWrap || !descriptor || !introLetter) return;

    const identity = document.createElement('div');
    identity.className = 'cinematic-intro__xo-identity';
    identity.dataset.cinematicXoIdentity = '';
    identity.innerHTML = `
      <span class="cinematic-intro__xo-mark" data-cinematic-xo-mark><b>X</b><b>O</b><i>·</i><b>WEB</b></span>
      <span class="cinematic-intro__xo-byline" data-cinematic-xo-byline>BY VICTXR.LEV</span>
    `;
    descriptorWrap.append(identity);

    const identityMark = identity.querySelector<HTMLElement>('[data-cinematic-xo-mark]');
    const identityByline = identity.querySelector<HTMLElement>('[data-cinematic-xo-byline]');
    if (!identityMark || !identityByline) return;

    let identityRevealed = false;
    let finalXSeen = false;

    const revealIntroIdentity = () => {
      if (identityRevealed || !cinematic.isConnected) return;
      identityRevealed = true;
      cinematic.dataset.xoIdentityState = 'revealing';
      identity.style.opacity = '1';

      const descriptorAnimation = descriptor.animate([
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-3px)' },
      ], { duration: 90, easing: 'ease-in', fill: 'forwards' });
      holdFinal(descriptorAnimation, descriptor, { opacity: '0', transform: 'translateY(-3px)' });

      const markAnimation = identityMark.animate([
        { opacity: 0, transform: 'translateY(4px) scaleX(0.94)', letterSpacing: '0.22em' },
        { opacity: 1, transform: 'translateY(0) scaleX(1)', letterSpacing: '0.13em' },
      ], { duration: 155, delay: 45, easing: premiumEase, fill: 'forwards' });
      holdFinal(markAnimation, identityMark, { opacity: '1', transform: 'none', letterSpacing: '0.13em' });

      const bylineAnimation = identityByline.animate([
        { opacity: 0, transform: 'translateY(3px)', filter: 'blur(1.5px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
      ], { duration: 145, delay: 105, easing: premiumEase, fill: 'forwards' });
      holdFinal(bylineAnimation, identityByline, { opacity: '1', transform: 'none', filter: 'blur(0px)' });

      window.setTimeout(() => {
        if (cinematic.isConnected) cinematic.dataset.xoIdentityState = 'ready';
      }, 270);
    };

    const scheduleIdentityReveal = () => {
      if (identityRevealed || identityTimer) return;
      identityTimer = window.setTimeout(() => {
        identityTimer = 0;
        revealIntroIdentity();
      }, 205);
    };

    cinematicLetterObserver = new MutationObserver(() => {
      const phase = cinematic.dataset.cinematicPhase;
      const letter = introLetter.textContent?.trim();
      if (phase === 'o-to-x' && letter === 'X' && !finalXSeen) {
        finalXSeen = true;
        scheduleIdentityReveal();
      }
    });
    cinematicLetterObserver.observe(introLetter, { childList: true, characterData: true, subtree: true });

    cinematicPhaseObserver = new MutationObserver(() => {
      const phase = cinematic.dataset.cinematicPhase;
      if (phase === 'x-rest' && !identityRevealed) revealIntroIdentity();
      if (phase === 'landed') revealHeaderSubmark(180);
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
      detachCinematicObservers();
    }
  });

  shellObserver.observe(shell, { childList: true, attributes: true, attributeFilter: ['data-home-intro'] });
}
