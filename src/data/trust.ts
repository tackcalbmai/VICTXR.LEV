import type { Locale } from './site';

export const trustLedgerCopy = {
  en: {
    eyebrow: 'Proof / open to inspection',
    title: ['Not a promise.', 'A working system.'],
    intro: 'The projects are public. The reasoning is documented. The technical foundation is visible in how the work behaves — not in a wall of badges.',
    liveLabel: 'Open live website',
    items: [
      {
        index: '01',
        title: 'Real work, already live.',
        text: 'CATRIN and ANELIKA are finished websites for operating Latvian businesses — not speculative mock-ups.',
      },
      {
        index: '02',
        title: 'Different answers on purpose.',
        text: 'One project is emotional and editorial. The other is rational and task-led. The system follows the business problem.',
      },
      {
        index: '03',
        title: 'One chain of responsibility.',
        text: 'Strategy, structure, visual direction and production code stay connected instead of being translated across departments.',
      },
      {
        index: '04',
        title: 'No decorative credibility.',
        text: 'No invented testimonials, inflated team size or performance numbers without data. Inspect the shipped work and the decisions behind it.',
      },
    ],
  },
  lv: {
    eyebrow: 'Pierādījumi / atvērti pārbaudei',
    title: ['Nevis solījums.', 'Strādājoša sistēma.'],
    intro: 'Projekti ir publiski. Lēmumu loģika ir aprakstīta. Tehniskais pamats ir redzams tajā, kā darbs uzvedas — nevis tehnoloģiju nozīmīšu sienā.',
    liveLabel: 'Atvērt publisko mājaslapu',
    items: [
      {
        index: '01',
        title: 'Reāls darbs, kas jau ir publicēts.',
        text: 'CATRIN un ANELIKA ir pabeigtas mājaslapas strādājošiem Latvijas uzņēmumiem — nevis izdomāti maketi.',
      },
      {
        index: '02',
        title: 'Atšķirīgas atbildes ar nodomu.',
        text: 'Viens projekts ir emocionāls un redakcionāls. Otrs — racionāls un vadīts pēc klienta uzdevuma. Sistēma seko biznesa problēmai.',
      },
      {
        index: '03',
        title: 'Viena atbildības ķēde.',
        text: 'Stratēģija, struktūra, vizuālais virziens un gatavais kods paliek savienoti, nevis tiek pārtulkoti starp nodaļām.',
      },
      {
        index: '04',
        title: 'Bez dekoratīvas uzticamības.',
        text: 'Nav izdomātu atsauksmju, uzpūsta komandas izmēra vai skaitļu bez datiem. Pārbaudi publicēto darbu un lēmumus aiz tā.',
      },
    ],
  },
} as const;

export function getTrustLedgerCopy(locale: Locale) {
  return trustLedgerCopy[locale];
}
