export function initContactDock() {
  document.querySelectorAll<HTMLElement>('[data-contact-dock]').forEach((dock) => {
    if (dock.dataset.contactDockReady === 'true') return;
    dock.dataset.contactDockReady = 'true';

    const toggle = dock.querySelector<HTMLButtonElement>('[data-contact-dock-toggle]');
    const panel = dock.querySelector<HTMLElement>('[data-contact-dock-panel]');
    const closeTargets = dock.querySelectorAll<HTMLElement>('[data-contact-dock-close]');
    const defer = dock.dataset.deferUntilScroll === 'true';
    if (!toggle || !panel) return;

    const setOpen = (open: boolean) => {
      dock.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      panel.toggleAttribute('inert', !open);
      if (open) {
        window.requestAnimationFrame(() => panel.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true }));
      } else if (document.activeElement && panel.contains(document.activeElement)) {
        toggle.focus({ preventScroll: true });
      }
    };

    const updateVisibility = () => {
      const visible = !defer || window.scrollY > Math.min(420, window.innerHeight * 0.48);
      dock.classList.toggle('is-visible', visible);
      if (!visible) setOpen(false);
    };

    toggle.addEventListener('click', () => setOpen(!dock.classList.contains('is-open')));
    closeTargets.forEach((target) => target.addEventListener('click', () => setOpen(false)));
    panel.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && dock.classList.contains('is-open')) setOpen(false);
    });

    if (defer) {
      updateVisibility();
      window.addEventListener('scroll', updateVisibility, { passive: true });
      window.addEventListener('resize', updateVisibility, { passive: true });
    } else {
      dock.classList.add('is-visible');
    }
  });
}
