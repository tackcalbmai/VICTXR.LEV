const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const smoothstep = (start: number, end: number, value: number) => {
  const progress = clamp((value - start) / Math.max(end - start, 0.001), 0, 1);
  return progress * progress * (3 - 2 * progress);
};

export function initArchitectureMotion() {
  const pageRoot = document.documentElement;
  if (pageRoot.dataset.architectureMotionReady === 'true') return;
  pageRoot.dataset.architectureMotionReady = 'true';
  pageRoot.classList.add('js');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-motion-reveal]'));
  const takeoverSections = Array.from(document.querySelectorAll<HTMLElement>('[data-takeover-zone].home-v2-work'));
  let revealObserver: IntersectionObserver | undefined;

  if (reducedMotion) {
    revealNodes.forEach((node) => node.classList.add('is-xo-visible'));
    takeoverSections.forEach((section) => {
      section.dataset.theme = 'dark';
      delete section.dataset.takeoverReady;
    });
    return;
  }

  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add('is-xo-visible');
        revealObserver?.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealNodes.forEach((node) => revealObserver?.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add('is-xo-visible'));
  }

  const shiftNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-motion-shift]'));
  const takeoverLayers = Array.from(document.querySelectorAll<HTMLElement>('[data-takeover-layer]'));
  if (!shiftNodes.length && !takeoverLayers.length && !takeoverSections.length) return;

  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let pointerLayerVisible = false;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const reportedProjects = new Map<HTMLElement, Set<string>>();
  const focusCleanups: Array<() => void> = [];

  const updateTakeoverSection = (section: HTMLElement) => {
    const cinematicLayout = window.innerWidth > 900;
    if (!cinematicLayout) {
      delete section.dataset.takeoverReady;
      delete section.dataset.activeProject;
      section.dataset.theme = 'dark';
      for (const property of [
        '--takeover-heading-opacity',
        '--catrin-opacity',
        '--anelika-opacity',
        '--catrin-scale',
        '--anelika-scale',
        '--catrin-inset',
        '--anelika-inset',
        '--takeover-progress',
      ]) section.style.removeProperty(property);
      return;
    }

    section.dataset.takeoverReady = 'true';
    const rect = section.getBoundingClientRect();
    const travel = Math.max(rect.height - window.innerHeight, 1);
    const progress = clamp(-rect.top / travel, 0, 1);
    const catrinEnter = smoothstep(0.035, 0.16, progress);
    const projectSwitch = smoothstep(0.46, 0.59, progress);
    const anelikaEnter = smoothstep(0.44, 0.61, progress);
    let catrinOpacity = catrinEnter * (1 - projectSwitch);
    let anelikaOpacity = anelikaEnter;
    let headingOpacity = 1 - smoothstep(0.025, 0.15, progress);
    const focusedProject = section.dataset.focusProject;
    const activeProject = focusedProject === 'catrin' || focusedProject === 'anelika'
      ? focusedProject
      : projectSwitch < 0.5 ? 'catrin' : 'anelika';
    if (focusedProject === 'catrin') {
      catrinOpacity = 1;
      anelikaOpacity = 0;
      headingOpacity = 0;
    } else if (focusedProject === 'anelika') {
      catrinOpacity = 0;
      anelikaOpacity = 1;
      headingOpacity = 0;
    }

    section.dataset.activeProject = activeProject;
    section.dataset.theme = activeProject === 'anelika' ? 'anelika' : 'light';
    section.style.setProperty('--takeover-progress', progress.toFixed(4));
    section.style.setProperty('--takeover-heading-opacity', headingOpacity.toFixed(4));
    section.style.setProperty('--catrin-opacity', catrinOpacity.toFixed(4));
    section.style.setProperty('--anelika-opacity', anelikaOpacity.toFixed(4));
    section.style.setProperty('--catrin-scale', focusedProject === 'catrin' ? '1' : (0.94 + catrinEnter * 0.06).toFixed(4));
    section.style.setProperty('--anelika-scale', focusedProject === 'anelika' ? '1' : (0.93 + anelikaEnter * 0.07).toFixed(4));
    section.style.setProperty('--catrin-inset', focusedProject === 'catrin' ? '0%' : `${((1 - catrinEnter) * 7).toFixed(2)}%`);
    section.style.setProperty('--anelika-inset', focusedProject === 'anelika' ? '0%' : `${((1 - anelikaEnter) * 6).toFixed(2)}%`);

    const isVisible = rect.bottom > window.innerHeight * 0.12 && rect.top < window.innerHeight * 0.88;
    const isProjectReadable = activeProject === 'catrin' ? catrinOpacity > 0.55 : anelikaOpacity > 0.55;
    if (!isVisible || !isProjectReadable) return;
    const reported = reportedProjects.get(section) ?? new Set<string>();
    if (reported.has(activeProject)) return;
    reported.add(activeProject);
    reportedProjects.set(section, reported);
    window.dispatchEvent(new CustomEvent('xo:takeover-change', {
      detail: { projectId: activeProject },
    }));
  };

  const update = () => {
    frame = 0;
    pointerLayerVisible = false;
    const viewportCenter = window.innerHeight / 2;

    shiftNodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const progress = clamp((center - viewportCenter) / Math.max(window.innerHeight, 1), -1, 1);
      node.style.setProperty('--xo-shift-y', `${progress * -14}px`);
      node.style.setProperty('--xo-shift-x', `${progress * 7}px`);
    });

    takeoverSections.forEach(updateTakeoverSection);

    takeoverLayers.forEach((node, index) => {
      const host = node.closest<HTMLElement>('[data-takeover-zone]') ?? node;
      const rect = host.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) pointerLayerVisible = true;
      const travel = Math.max(rect.height - window.innerHeight, 1);
      const progress = clamp(-rect.top / travel, 0, 1);
      const direction = index % 2 === 0 ? -1 : 1;
      const scrollX = direction * (progress - 0.5) * 34;
      const scrollY = (0.5 - progress) * (index % 2 === 0 ? 22 : 30);
      const pointerScale = index % 2 === 0 ? 0.35 : 0.5;
      const x = scrollX + pointerX * pointerScale;
      const y = scrollY + pointerY * pointerScale;
      node.style.setProperty('--xo-shift-x', `${x}px`);
      node.style.setProperty('--xo-shift-y', `${y}px`);
      node.style.setProperty('--xo-layer-x', `${x * 0.35}px`);
      node.style.setProperty('--xo-layer-y', `${y * 0.35}px`);
    });
  };

  const requestUpdate = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  };

  takeoverSections.forEach((section) => {
    section.querySelectorAll<HTMLAnchorElement>('[data-project-id]').forEach((link) => {
      const onFocus = () => {
        section.dataset.focusProject = link.dataset.projectId ?? '';
        requestUpdate();
      };
      const onBlur = () => {
        delete section.dataset.focusProject;
        requestUpdate();
      };
      link.addEventListener('focus', onFocus);
      link.addEventListener('blur', onBlur);
      focusCleanups.push(() => {
        link.removeEventListener('focus', onFocus);
        link.removeEventListener('blur', onBlur);
      });
    });
  });

  const onPointerMove = (event: PointerEvent) => {
    if (!finePointer || !pointerLayerVisible) return;
    pointerX = clamp((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 18, -9, 9);
    pointerY = clamp((event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 14, -7, 7);
    requestUpdate();
  };

  const cleanup = () => {
    if (frame) window.cancelAnimationFrame(frame);
    revealObserver?.disconnect();
    window.removeEventListener('scroll', requestUpdate);
    window.removeEventListener('resize', requestUpdate);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pagehide', onPageHide);
    focusCleanups.splice(0).forEach((remove) => remove());
    takeoverSections.forEach((section) => {
      delete section.dataset.takeoverReady;
      delete section.dataset.activeProject;
      delete section.dataset.focusProject;
    });
    delete pageRoot.dataset.architectureMotionReady;
  };

  const onPageHide = (event: PageTransitionEvent) => {
    // BFCache keeps this document alive; its listeners must stay intact for the
    // back/forward return path. A normal unload can release everything now.
    if (!event.persisted) cleanup();
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  if (finePointer) window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pagehide', onPageHide, { once: true });
  update();

  return cleanup;
}
