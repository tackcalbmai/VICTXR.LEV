export function initCaseStudyStory() {
  document.querySelectorAll<HTMLElement>('[data-case-story]').forEach((story) => {
    if (story.dataset.caseStoryReady === 'true') return;
    story.dataset.caseStoryReady = 'true';

    const stages = Array.from(story.querySelectorAll<HTMLElement>('[data-case-stage]'));
    const links = Array.from(story.querySelectorAll<HTMLAnchorElement>('[data-case-stage-link]'));
    if (!stages.length || !links.length) return;

    const setActive = (index: string) => {
      links.forEach((link) => {
        const active = link.dataset.caseStageLink === index;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'step');
        else link.removeAttribute('aria-current');
      });
      story.style.setProperty('--case-stage-progress', String((Number(index) - 1) / Math.max(stages.length - 1, 1)));
    };

    if (!('IntersectionObserver' in window)) return;

    const visible = new Map<Element, number>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.set(entry.target, entry.intersectionRatio);
        else visible.delete(entry.target);
      });
      const active = [...visible.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as HTMLElement | undefined;
      if (active?.dataset.caseStage) setActive(active.dataset.caseStage);
    }, { rootMargin: '-20% 0px -45% 0px', threshold: [0.05, 0.2, 0.45, 0.7] });

    stages.forEach((stage) => observer.observe(stage));
    setActive('1');
  });
}
