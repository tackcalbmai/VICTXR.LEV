let siteInitialized = false;

export function initSiteUI() {
  if (siteInitialized) return;
  siteInitialized = true;

  const header = document.querySelector<HTMLElement>('[data-site-header]');
  const menu = document.querySelector<HTMLElement>('[data-mobile-menu]');
  const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menuLabel = document.querySelector<HTMLElement>('[data-menu-label]');
  const main = document.querySelector<HTMLElement>('main');
  let menuWasOpened = false;
  let frame = 0;
  const usesCompactNavigation = () => window.matchMedia('(max-width: 760px), (max-width: 900px) and (max-height: 500px)').matches;

  const updateHeader = () => {
    frame = 0;
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 18);
    const sample = document.elementFromPoint(
      Math.min(window.innerWidth / 2, window.innerWidth - 1),
      Math.min(header.offsetHeight + 2, window.innerHeight - 1),
    );
    const themed = sample?.closest<HTMLElement>('[data-theme]');
    header.dataset.overTheme = themed?.dataset.theme ?? 'light';
  };

  const requestHeaderUpdate = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(updateHeader);
  };

  updateHeader();
  window.addEventListener('scroll', requestHeaderUpdate, { passive: true });
  window.addEventListener('resize', requestHeaderUpdate, { passive: true });

  const setMenu = (open: boolean) => {
    if (!menu || !menuToggle) return;
    document.documentElement.classList.toggle('menu-is-open', open);
    document.body.classList.toggle('menu-is-open', open);
    header?.classList.toggle('is-menu-open', open);
    // The header participates in both the cinematic handoff and section-theme
    // transitions. Pin the open-menu surface at inline-important priority so
    // no animation frame or cascade order can make the close control float on
    // transparent page content; clear only this state-owned property on close.
    if (open) header?.style.setProperty('background-color', 'var(--paper)', 'important');
    else header?.style.removeProperty('background-color');
    menuToggle.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    if (main) main.inert = open;
    if (menuLabel) menuLabel.textContent = open ? menuLabel.dataset.closeLabel ?? 'Close' : menuLabel.dataset.openLabel ?? 'Menu';
    if (open) {
      menuWasOpened = true;
      menu.querySelector<HTMLAnchorElement>('a')?.focus();
    }
  };

  menuToggle?.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  menu?.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => link.addEventListener('click', () => {
    const target = new URL(link.href, location.href);
    const staysOnPage = target.origin === location.origin && target.pathname === location.pathname;
    setMenu(false);
    if (staysOnPage) window.requestAnimationFrame(() => menuToggle?.focus({ preventScroll: true }));
  }));
  window.addEventListener('keydown', (event) => {
    const open = menuToggle?.getAttribute('aria-expanded') === 'true';
    if (event.key === 'Escape' && open) {
      setMenu(false);
      menuToggle?.focus();
    }
    if (event.key !== 'Tab' || !open || !menu || !menuToggle) return;
    const focusable = [menuToggle, ...menu.querySelectorAll<HTMLElement>('a, button')];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (!usesCompactNavigation() && menuWasOpened) setMenu(false);
  }, { passive: true });

  document.querySelectorAll<HTMLElement>('[data-current-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  document.querySelectorAll<HTMLButtonElement>('[data-copy-email]').forEach((button) => {
    button.addEventListener('click', async () => {
      const email = button.dataset.email;
      const text = button.querySelector<HTMLElement>('[data-copy-text]');
      const status = document.querySelector<HTMLElement>('[data-copy-status]');
      if (!email) return;
      try {
        await navigator.clipboard.writeText(email);
        const copied = button.dataset.copiedLabel ?? 'Copied';
        if (text) text.textContent = copied;
        if (status) status.textContent = copied;
        button.classList.add('is-copied');
        window.setTimeout(() => {
          if (text) text.textContent = button.dataset.copyLabel ?? 'Copy email';
          button.classList.remove('is-copied');
        }, 2200);
      } catch {
        window.location.href = `mailto:${email}`;
      }
    });
  });

  const revealElements = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealElements.forEach((element) => observer.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add('is-revealed'));
  }
}
