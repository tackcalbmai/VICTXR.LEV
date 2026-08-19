type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

type AnalyticsWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
  plausible?: (event: string, options?: { props?: AnalyticsPayload }) => void;
};

function trackingIsAllowed() {
  const privacyNavigator = navigator as Navigator & { globalPrivacyControl?: boolean };
  return !privacyNavigator.globalPrivacyControl && navigator.doNotTrack !== '1';
}

export function initAnalytics() {
  const root = document.documentElement;
  if (root.dataset.analyticsReady === 'true') return;
  root.dataset.analyticsReady = 'true';

  const source = new URLSearchParams(location.search).get('from') ?? undefined;
  const base = {
    language: root.lang || 'en',
    path: location.pathname,
    source,
  };

  const emit = (event: string, payload: AnalyticsPayload = {}) => {
    const detail = { event, ...base, ...payload };
    window.dispatchEvent(new CustomEvent('xo:analytics', { detail }));
    if (!trackingIsAllowed()) return;

    const analyticsWindow = window as AnalyticsWindow;
    analyticsWindow.dataLayer?.push(detail);
    analyticsWindow.plausible?.(event, { props: detail });
  };

  emit('xo_page_view');

  let lcp = 0;
  let cls = 0;
  let inp = 0;
  let vitalsFlushed = false;
  const observe = (type: string, callback: (entry: PerformanceEntry & { value?: number; hadRecentInput?: boolean }) => void, options: PerformanceObserverInit = { type, buffered: true }) => {
    try {
      const observer = new PerformanceObserver((list) => list.getEntries().forEach((entry) => callback(entry)));
      observer.observe(options);
    } catch {
      // Older browsers simply skip the unsupported metric.
    }
  };
  observe('largest-contentful-paint', (entry) => { lcp = entry.startTime; });
  observe('layout-shift', (entry) => {
    if (!entry.hadRecentInput) cls += entry.value ?? 0;
  });
  observe('event', (entry) => { inp = Math.max(inp, entry.duration); }, { type: 'event', buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
  const flushVitals = () => {
    if (vitalsFlushed || (!lcp && !cls && !inp)) return;
    vitalsFlushed = true;
    emit('web_vitals', {
      lcp_ms: Math.round(lcp),
      cls: Number(cls.toFixed(3)),
      inp_ms: Math.round(inp),
    });
  };
  window.setTimeout(flushVitals, 8000);
  window.addEventListener('pagehide', flushVitals, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushVitals();
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-analytics-event]') : null;
    if (!target) return;
    emit(target.dataset.analyticsEvent ?? 'interaction', {
      channel: target.dataset.analyticsChannel,
      project: target.dataset.projectId,
      service: target.dataset.serviceId,
      context: target.dataset.contactContext,
      intent: target.dataset.contactIntent,
    });
  });

  const brief = document.querySelector<HTMLFormElement>('[data-contact-brief]');
  let briefStarted = false;
  brief?.addEventListener('input', () => {
    if (briefStarted) return;
    briefStarted = true;
    emit('contact_brief_start');
  }, { passive: true });

  const depths = [25, 50, 75, 90];
  const reached = new Set<number>();
  let frame = 0;
  const updateDepth = () => {
    frame = 0;
    const scrollable = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
    const progress = Math.min(100, Math.round((scrollY / scrollable) * 100));
    depths.forEach((depth) => {
      if (progress < depth || reached.has(depth)) return;
      reached.add(depth);
      emit('scroll_depth', { depth });
    });
    if (reached.size === depths.length) window.removeEventListener('scroll', requestDepth);
  };
  const requestDepth = () => {
    if (frame) return;
    frame = requestAnimationFrame(updateDepth);
  };
  window.addEventListener('scroll', requestDepth, { passive: true });

  return { emit };
}
