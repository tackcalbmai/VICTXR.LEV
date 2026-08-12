import type { Locale } from './site';

export type ContactChannel = 'email' | 'whatsapp' | 'instagram';

type ContactConfig = {
  email: string;
  whatsapp: string;
  instagram: string;
};

/**
 * The single source of truth for every public contact channel.
 *
 * Leave a future channel empty until the real account exists. Once a value is
 * added here, the shared contact UI exposes it everywhere it belongs without
 * placeholder links or component-level URL changes.
 */
export const contacts: ContactConfig = {
  email: 'viktors.levdanskis@inbox.lv',
  whatsapp: '',
  instagram: '',
};

const localizedCopy = {
  en: {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    socialLabel: 'Other ways to get in touch',
    whatsappMessage: 'Hey. I have a project in mind.',
  },
  lv: {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    socialLabel: 'Citi saziņas veidi',
    whatsappMessage: 'Sveiks. Man padomā ir projekts.',
  },
} as const;

export type SocialContactLink = {
  channel: Exclude<ContactChannel, 'email'>;
  label: string;
  display: string;
  href: string;
};

function getInstagramContact(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
    if (url.protocol !== 'https:' || hostname !== 'instagram.com') return null;
    const handle = url.pathname.split('/').filter(Boolean)[0];
    if (!handle) return null;
    return {
      display: `@${handle.replace(/^@/, '')}`,
      href: url.toString(),
    };
  } catch {
    return null;
  }
}

export function getSocialContactLinks(locale: Locale): SocialContactLink[] {
  const copy = localizedCopy[locale];
  const links: SocialContactLink[] = [];
  const whatsappNumber = contacts.whatsapp.replace(/\D/g, '');

  if (whatsappNumber) {
    links.push({
      channel: 'whatsapp',
      label: copy.whatsapp,
      display: `+${whatsappNumber}`,
      href: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(copy.whatsappMessage)}`,
    });
  }

  const instagram = getInstagramContact(contacts.instagram.trim());
  if (instagram) {
    links.push({
      channel: 'instagram',
      label: copy.instagram,
      display: instagram.display,
      href: instagram.href,
    });
  }

  return links;
}

export function getSocialContactLabel(locale: Locale) {
  return localizedCopy[locale].socialLabel;
}
