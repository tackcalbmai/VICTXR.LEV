type IntentId = 'zero' | 'fix' | 'unsure';

type RouterConfig = {
  starters: Record<IntentId, string>;
  prompts: {
    business: string;
    website: string;
    problem: string;
    change: string;
    zeroFallback: string[];
    fixFallback: string[];
    unsureFallback: string[];
  };
  copied: string;
};

function encodeMailto(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function encodeWhatsApp(number: string, body: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(body)}`;
}

export function initContactRouter() {
  document.querySelectorAll<HTMLElement>('[data-contact-page]').forEach((root) => {
    if (root.dataset.contactRouterReady === 'true') return;
    root.dataset.contactRouterReady = 'true';

    const configNode = root.querySelector<HTMLScriptElement>('[data-contact-router-config]');
    if (!configNode?.textContent) return;

    let config: RouterConfig;
    try {
      config = JSON.parse(configNode.textContent) as RouterConfig;
    } catch {
      return;
    }

    const email = root.dataset.contactEmail ?? '';
    const whatsappNumber = root.dataset.contactWhatsapp ?? '';
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-contact-intent]'));
    const selectionNodes = root.querySelectorAll<HTMLElement>('[data-contact-selection]');
    const whatsappLinks = root.querySelectorAll<HTMLAnchorElement>('[data-router-whatsapp]');
    const emailLinks = root.querySelectorAll<HTMLAnchorElement>('[data-router-email]');
    const briefForm = root.querySelector<HTMLFormElement>('[data-contact-brief]');
    const copyButton = root.querySelector<HTMLButtonElement>('[data-copy-brief]');
    const copyStatus = root.querySelector<HTMLElement>('[data-copy-brief-status]');

    const intentMap = new Map<IntentId, HTMLButtonElement>();
    buttons.forEach((button) => {
      const id = button.dataset.contactIntent as IntentId | undefined;
      if (id) intentMap.set(id, button);
    });

    const params = new URLSearchParams(window.location.search);
    const requestedIntent = params.get('intent') as IntentId | null;
    let activeIntent: IntentId = requestedIntent && intentMap.has(requestedIntent) ? requestedIntent : 'unsure';

    const getBriefValues = () => {
      const formData = briefForm ? new FormData(briefForm) : new FormData();
      return {
        business: String(formData.get('business') ?? '').trim(),
        website: String(formData.get('website') ?? '').trim(),
        problem: String(formData.get('problem') ?? '').trim(),
        change: String(formData.get('change') ?? '').trim(),
      };
    };

    const buildMessage = () => {
      const values = getBriefValues();
      const hasBrief = Object.values(values).some(Boolean);
      const lines = [config.starters[activeIntent]];

      if (hasBrief) {
        if (values.business) lines.push(`${config.prompts.business}: ${values.business}`);
        if (values.website) lines.push(`${config.prompts.website}: ${values.website}`);
        if (values.problem) lines.push(`${config.prompts.problem}:\n${values.problem}`);
        if (values.change) lines.push(`${config.prompts.change}:\n${values.change}`);
      } else {
        const fallback = activeIntent === 'zero'
          ? config.prompts.zeroFallback
          : activeIntent === 'fix'
            ? config.prompts.fixFallback
            : config.prompts.unsureFallback;
        lines.push(...fallback);
      }

      return lines.join('\n\n');
    };

    const updateLinks = () => {
      const activeButton = intentMap.get(activeIntent);
      const subject = activeButton?.dataset.contactSubject || 'Website project — XO WEB';
      const message = buildMessage();

      whatsappLinks.forEach((link) => {
        if (whatsappNumber) link.href = encodeWhatsApp(whatsappNumber, message);
      });
      emailLinks.forEach((link) => {
        if (email) link.href = encodeMailto(email, subject, message);
      });
    };

    const setIntent = (intent: IntentId, updateUrl = true) => {
      if (!intentMap.has(intent)) return;
      activeIntent = intent;
      buttons.forEach((button) => {
        const active = button.dataset.contactIntent === intent;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      const activeButton = intentMap.get(intent);
      const label = activeButton?.querySelector<HTMLElement>('.contact-intent__title')?.textContent?.trim() || '';
      selectionNodes.forEach((node) => { node.textContent = label; });

      if (updateUrl) {
        const url = new URL(window.location.href);
        url.searchParams.set('intent', intent);
        window.history.replaceState(window.history.state, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
      }
      updateLinks();
    };

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.contactIntent as IntentId | undefined;
        if (id) setIntent(id);
      });
    });

    briefForm?.addEventListener('input', updateLinks);
    briefForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const target = root.querySelector<HTMLAnchorElement>('[data-brief-whatsapp]');
      if (target?.href) window.open(target.href, '_blank', 'noopener,noreferrer');
    });

    copyButton?.addEventListener('click', async () => {
      const message = buildMessage();
      try {
        await navigator.clipboard.writeText(message);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = message;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      if (copyStatus) copyStatus.textContent = config.copied;
      const label = copyButton.querySelector<HTMLElement>('[data-copy-brief-label]');
      if (label) {
        const previous = label.textContent;
        label.textContent = config.copied;
        window.setTimeout(() => { label.textContent = previous; }, 1800);
      }
    });

    setIntent(activeIntent, false);
  });
}
