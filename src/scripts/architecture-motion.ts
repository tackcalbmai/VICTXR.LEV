const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function initArchitectureMotion() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-motion-reveal]'));

  if (reducedMotion) {
    revealNodes.forEach((node) => node.classList.add('is-xo-visible'));
    return;
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add('is-xo-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealNodes.forEach((node) => observer.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add('is-xo-visible'));
  }

  const shiftNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-motion-shift]'));
  const takeoverLayers = Array.from(document.querySelectorAll<HTMLElement>('[data-takeover-layer]'));
  if (!shiftNodes.length && !takeoverLayers.length) return;

  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  const update = () => {
    frame = 0;
    const viewportCenter = window.innerHeight / 2;

    shiftNodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const progress = clamp((center - viewportCenter) / Math.max(window.innerHeight, 1), -1, 1);
      node.style.setProperty('--xo-shift-y', `${progress * -14}px`);
      node.style.setProperty('--xo-shift-x', `${progress * 7}px`);
    });

    takeoverLayers.forEach((node, index) => {
      const host = node.closest<HTMLElement>('[data-takeover-zone]') ?? node;
      const rect = host.getBoundingClientRect();
      const travel = Math.max(rect.height - window.innerHeight, 1);
      const progress = clamp((-rect.top) / travel, 0, 1);
      const direction = index % 2 === 0 ? -1 : 1;
      const scrollX = direction * (progress - 0.5) * 34;
      const scrollY = (0.5 - progress) * (index % 2 === 0 ? 22 : 30);
      const pointerScale = index % 2 === 0 ? 0.35 : 0.5;
      node.style.setProperty('--xo-shift-x', `${scrollX + pointerX * pointerScale}px`);
      node.style.setProperty('--xo-shift-y', `${scrollY + pointerY * pointerScale}px`);
    });
  };

  const requestUpdate = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!finePointer) return;
    pointerX = clamp((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 18, -9, 9);
    pointerY = clamp((event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 14, -7, 7);
    requestUpdate();
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  if (finePointer) window.addEventListener('pointermove', onPointerMove, { passive: true });
  update();
}
