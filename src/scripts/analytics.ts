type AnalyticsPrimitive = string | number | boolean;
type AnalyticsPayload = Record<string, AnalyticsPrimitive>;

type ZarazApi = {
  track: (eventName: string, properties?: AnalyticsPayload) => void;
};

declare global {
  interface Window {
    zaraz?: ZarazApi;
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    plausible?: (eventName: string, options?: { props?: AnalyticsPayload }) => void;
    umami?: { track: (eventName: string, properties?: AnalyticsPayload) => void };
  }
}

const pendingEvents: Array<{ name: string; payload: AnalyticsPayload }> = [];
const emittedKeys = new Set<string>();

function trackingIsAllowed() {
  const privacyNavigator = navigator as Navigator & { globalPrivacyControl?: boolean };
  return !privacyNavigator.globalPrivacyControl && navigator.doNotTrack !== '1';
}

function compactPayload(payload: AnalyticsPayload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== '' && value !== false),
  ) as AnalyticsPayload;
}

function sendToProvider(name: string, payload: AnalyticsPayload) {
  // Keep the local QA event available while respecting explicit browser-level
  // privacy signals for every external analytics provider.
  if (!trackingIsAllowed()) return true;
  try {
    if (window.zaraz?.track) {
      window.zaraz.track(name, payload);
      return true;
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, payload);
      return true;
    }
    if (typeof window.plausible === 'function') {
      window.plausible(name, { props: payload });
      return true;
    }
    if (window.umami?.track) {
      window.umami.track(name, payload);
      return true;
    }
    if (window.dataLayer) {
      window.dataLayer.push({ event: name, ...payload });
      return true;
    }
  } catch {
    // Measurement must never interrupt navigation or a contact action.
  }
  return false;
}

function flushPendingEvents() {
  if (!pendingEvents.length) return;
  const remaining = pendingEvents.splice(0);
  remaining.forEach((event) => {
    if (!sendToProvider(event.name, event.payload)) pendingEvents.push(event);
  });
}

export function trackAnalytics(
  name: string,
  properties: AnalyticsPayload = {},
  dedupeKey?: string,
) {
  if (!name) return;
  const key = dedupeKey ? `${name}:${dedupeKey}` : '';
  if (key && emittedKeys.has(key)) return;
  if (key) emittedKeys.add(key);

  const payload = compactPayload({
    page_path: window.location.pathname,
    language: document.documentElement.lang || 'en',
    ...properties,
  });

  window.dispatchEvent(new CustomEvent('xo:analytics', {
    detail: { event: name, properties: payload },
  }));

  if (!sendToProvider(name, payload)) pendingEvents.push({ name, payload });
}

function analyticsProperties(element: HTMLElement) {
  const payload: AnalyticsPayload = {};
  const mappings = [
    ['data-analytics-channel', 'channel'],
    ['data-analytics-intent', 'intent'],
    ['data-project-id', 'project_id'],
    ['data-contact-context', 'contact_context'],
    ['data-contact-channel', 'channel'],
    ['data-service-id', 'service_id'],
  ] as const;

  mappings.forEach(([attribute, key]) => {
    const value = element.getAttribute(attribute);
    if (value) payload[key] = value;
  });

  if (element instanceof HTMLAnchorElement) {
    const rawHref = element.getAttribute('href') ?? '';
    if (rawHref.startsWith('mailto:')) {
      payload.destination_type = 'email';
    } else if (rawHref.startsWith('tel:')) {
      payload.destination_type = 'phone';
    } else {
      try {
        const target = new URL(element.href, window.location.href);
        if (target.hostname === 'wa.me') payload.destination_type = 'whatsapp';
        else if (target.origin !== window.location.origin) payload.destination_type = 'external';
        else {
          payload.destination_type = 'internal';
          payload.target_path = target.pathname;
        }
      } catch {
        // A malformed optional link is handled by the browser, not analytics.
      }
    }
    const targetLanguage = element.getAttribute('hreflang') || element.getAttribute('lang');
    if (targetLanguage) payload.target_language = targetLanguage;
  }

  return payload;
}

function activeContactIntent(root: ParentNode = document) {
  return root.querySelector<HTMLElement>('[data-contact-intent].is-active')?.dataset.contactIntent ?? 'unsure';
}

export function initAnalytics() {
  if (document.documentElement.dataset.analyticsReady === 'true') return;
  document.documentElement.dataset.analyticsReady = 'true';

  const source = new URLSearchParams(window.location.search).get('from')?.match(/^[a-z0-9-]{1,48}$/i)?.[0] ?? '';
  trackAnalytics('xo_page_view', { source }, 'page');

  let lcp = 0;
  let cls = 0;
  let inp = 0;
  let vitalsFlushed = false;
  const performanceObservers: PerformanceObserver[] = [];
  const observe = (
    type: string,
    callback: (entry: PerformanceEntry & { value?: number; hadRecentInput?: boolean }) => void,
    options: PerformanceObserverInit = { type, buffered: true },
  ) => {
    try {
      const observer = new PerformanceObserver((list) => list.getEntries().forEach((entry) => callback(entry)));
      observer.observe(options);
      performanceObservers.push(observer);
    } catch {
      // Unsupported metrics are progressive enhancement, never a page error.
    }
  };
  observe('largest-contentful-paint', (entry) => { lcp = entry.startTime; });
  observe('layout-shift', (entry) => {
    if (!entry.hadRecentInput) cls += entry.value ?? 0;
  });
  observe('event', (entry) => { inp = Math.max(inp, entry.duration); }, {
    type: 'event',
    buffered: true,
    durationThreshold: 40,
  } as PerformanceObserverInit);

  const flushVitals = () => {
    if (vitalsFlushed || (!lcp && !cls && !inp)) return;
    vitalsFlushed = true;
    trackAnalytics('web_vitals', {
      lcp_ms: Math.round(lcp),
      cls: Number(cls.toFixed(3)),
      inp_ms: Math.round(inp),
    }, 'page');
  };
  const vitalsTimer = window.setTimeout(flushVitals, 8000);
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') flushVitals();
  };
  window.addEventListener('pagehide', flushVitals, { once: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

  const depthMarks = [25, 50, 75, 90];
  const reachedDepths = new Set<number>();
  let depthFrame = 0;
  const updateDepth = () => {
    depthFrame = 0;
    const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
    depthMarks.forEach((depth) => {
      if (progress < depth || reachedDepths.has(depth)) return;
      reachedDepths.add(depth);
      trackAnalytics('scroll_depth', { depth }, String(depth));
    });
    if (reachedDepths.size === depthMarks.length) window.removeEventListener('scroll', requestDepth);
  };
  const requestDepth = () => {
    if (depthFrame) return;
    depthFrame = window.requestAnimationFrame(updateDepth);
  };
  window.addEventListener('scroll', requestDepth, { passive: true });

  const contactPage = document.querySelector<HTMLElement>('[data-contact-page]');
  if (contactPage) trackAnalytics('contact_page_view', { source }, 'page');

  const casePage = document.querySelector<HTMLElement>('.case-page[data-project-id]');
  if (casePage?.dataset.projectId) {
    trackAnalytics('case_study_view', { project_id: casePage.dataset.projectId }, casePage.dataset.projectId);
  }

  const onTrackedClick = (event: MouseEvent) => {
    const origin = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-analytics-event]')
      : null;
    if (!origin) return;
    const eventName = origin.dataset.analyticsEvent;
    if (!eventName) return;
    const properties = analyticsProperties(origin);
    trackAnalytics(eventName, properties);

    if (eventName === 'case_study_click' && properties.project_id) {
      trackAnalytics('project_open', properties);
    }

    if (['contact_click', 'contact_brief_send'].includes(eventName)) {
      const channel = properties.channel || properties.destination_type;
      if (channel === 'whatsapp' || channel === 'email') {
        trackAnalytics(channel === 'whatsapp' ? 'whatsapp_click' : 'email_click', properties);
      }
    }

    if (!origin.closest('[data-contact-brief]')) return;
    if (!['contact_brief_send', 'copy_brief_click'].includes(eventName)) return;
    const form = origin.closest<HTMLFormElement>('[data-contact-brief]');
    if (!form) return;
    const data = new FormData(form);
    const values = ['business', 'website', 'problem', 'change']
      .map((field) => String(data.get(field) ?? '').trim());
    const hasUsefulBrief = values.slice(2).some(Boolean);
    if (!hasUsefulBrief) return;
    trackAnalytics('brief_builder_complete', {
      intent: activeContactIntent(contactPage ?? document),
      channel: origin.dataset.analyticsChannel || (eventName === 'copy_brief_click' ? 'clipboard' : ''),
      fields_completed: values.filter(Boolean).length,
    }, 'complete');
  };
  document.addEventListener('click', onTrackedClick);

  const brief = document.querySelector<HTMLFormElement>('[data-contact-brief]');
  const onBriefInput = () => {
    trackAnalytics('brief_builder_start', {
      intent: activeContactIntent(contactPage ?? document),
    }, 'start');
  };
  brief?.addEventListener('input', onBriefInput, { once: true });

  const viewedServices = new Set<string>();
  let serviceObserver: IntersectionObserver | undefined;
  const serviceNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-service-id]'));
  if (serviceNodes.length && 'IntersectionObserver' in window) {
    serviceObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.55) return;
        const node = entry.target as HTMLElement;
        const serviceId = node.dataset.serviceId;
        if (!serviceId || viewedServices.has(serviceId)) return;
        viewedServices.add(serviceId);
        trackAnalytics('service_interaction', { service_id: serviceId, interaction: 'view' }, serviceId);
        serviceObserver?.unobserve(node);
      });
    }, { threshold: [0.55] });
    serviceNodes.forEach((node) => serviceObserver?.observe(node));
  }

  const onTakeoverChange = (event: Event) => {
    const detail = (event as CustomEvent<{ projectId?: string }>).detail;
    if (!detail?.projectId) return;
    trackAnalytics('project_preview_view', { project_id: detail.projectId }, detail.projectId);
  };
  window.addEventListener('xo:takeover-change', onTakeoverChange);
  window.addEventListener('load', flushPendingEvents, { once: true });
  window.setTimeout(flushPendingEvents, 1600);

  return () => {
    document.removeEventListener('click', onTrackedClick);
    brief?.removeEventListener('input', onBriefInput);
    serviceObserver?.disconnect();
    window.removeEventListener('xo:takeover-change', onTakeoverChange);
    window.removeEventListener('scroll', requestDepth);
    window.removeEventListener('pagehide', flushVitals);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.clearTimeout(vitalsTimer);
    if (depthFrame) window.cancelAnimationFrame(depthFrame);
    performanceObservers.forEach((observer) => observer.disconnect());
    delete document.documentElement.dataset.analyticsReady;
  };
}
