import { contactRoutes } from './architecture';
import type { Locale } from './site';

export type ContactIntentId = 'zero' | 'fix' | 'redesign' | 'unsure';
export type ContactContext = 'home' | 'work' | 'about' | 'services' | 'case' | 'default';

export const contactRouterCopy = {
  en: {
    dock: {
      label: 'Contact',
      title: 'Start with the problem.',
      text: 'Choose the route that feels easiest. You do not need a finished brief.',
      openRouter: 'Choose a starting point',
      whatsappNote: 'Fastest / prepared message',
      emailNote: 'Links / longer context',
      instagramNote: 'DM / follow',
    },
    talk: {
      kicker: 'XO / CONTACT ROUTER',
      title: ['How do you', 'want to talk?'],
      intro: 'WhatsApp is the fastest route. Use the short brief if you want help structuring the first message. Email works best for links, files or more context.',
      whatsapp: 'Start on WhatsApp',
      whatsappNote: 'A useful starter message is already prepared.',
      email: 'Send an email',
      emailNote: 'Best for links, files and a longer explanation.',
      brief: 'Build a short brief',
      briefNote: 'Four useful fields. No questionnaire theatre.',
      instagram: 'Instagram',
      instagramNote: 'DM or follow the work.',
    },
    brief: {
      kicker: 'Short brief / no form theatre',
      title: ['Give me', 'the useful part.'],
      intro: 'This does not upload anything or send data in the background. It simply turns your answers into a clean WhatsApp or email message.',
      business: 'Name / business',
      businessPlaceholder: 'Who am I talking to?',
      website: 'Current website',
      websitePlaceholder: 'https:// — optional',
      problem: 'What is not working?',
      problemPlaceholder: 'The business problem, not the feature list.',
      change: 'What should be different after this works?',
      changePlaceholder: 'More enquiries, clearer positioning, easier booking…',
      whatsapp: 'Continue in WhatsApp',
      email: 'Send by email',
      copy: 'Copy brief',
      copied: 'Brief copied',
      note: 'Nothing is stored on xoweb.lv. You decide where the message goes.',
    },
    starters: {
      zero: 'Hi! I’m starting a website project from zero.',
      fix: 'Hi! Something is not working on my current website.',
      redesign: 'Hi! I’d like to redesign an existing website.',
      unsure: 'Hi! I’m not sure what web solution I need yet.',
    },
    prompts: {
      business: 'Name / business',
      website: 'Current website',
      problem: 'What is not working',
      change: 'What should change',
      zeroFallback: ['Business:', 'What should the website help achieve:'],
      fixFallback: ['Current website:', 'Main problem:'],
      redesignFallback: ['Current website:', 'What should feel or work differently:'],
      unsureFallback: ['The business problem is:'],
    },
  },
  lv: {
    dock: {
      label: 'Sazināties',
      title: 'Sāc ar problēmu.',
      text: 'Izvēlies ērtāko ceļu. Gatavs tehniskais uzdevums nav vajadzīgs.',
      openRouter: 'Izvēlēties sākuma punktu',
      whatsappNote: 'Ātrākais / sagatavots ziņojums',
      emailNote: 'Saites / plašāks konteksts',
      instagramNote: 'DM / sekot',
    },
    talk: {
      kicker: 'XO / SAZIŅAS MARŠRUTS',
      title: ['Kā vēlies', 'sazināties?'],
      intro: 'WhatsApp ir ātrākais ceļš. Īsais brief palīdz sakārtot pirmo ziņu. E-pasts ir ērtāks saitēm, failiem un plašākam kontekstam.',
      whatsapp: 'Sākt WhatsApp',
      whatsappNote: 'Noderīgs sākuma ziņojums jau ir sagatavots.',
      email: 'Nosūtīt e-pastu',
      emailNote: 'Vislabāk saitēm, failiem un garākam aprakstam.',
      brief: 'Izveidot īso brief',
      briefNote: 'Četri jēgpilni lauki. Bez anketas izrādes.',
      instagram: 'Instagram',
      instagramNote: 'DM vai seko darbiem.',
    },
    brief: {
      kicker: 'Īsais brief / bez anketas izrādes',
      title: ['Iedod man', 'būtisko.'],
      intro: 'Šeit nekas netiek augšupielādēts vai nosūtīts fonā. Atbildes vienkārši pārvēršas sakārtotā WhatsApp vai e-pasta ziņā.',
      business: 'Vārds / uzņēmums',
      businessPlaceholder: 'Ar ko es runāju?',
      website: 'Esošā mājaslapa',
      websitePlaceholder: 'https:// — nav obligāti',
      problem: 'Kas šobrīd nestrādā?',
      problemPlaceholder: 'Biznesa problēma, nevis funkciju saraksts.',
      change: 'Kam jābūt citādi, kad viss strādā?',
      changePlaceholder: 'Vairāk pieteikumu, skaidrāka pozīcija, vienkāršāka rezervācija…',
      whatsapp: 'Turpināt WhatsApp',
      email: 'Nosūtīt e-pastā',
      copy: 'Kopēt brief',
      copied: 'Brief nokopēts',
      note: 'Nekas netiek glabāts xoweb.lv. Tu pats izvēlies, kur ziņa nonāk.',
    },
    starters: {
      zero: 'Sveiki! Vēlos sākt mājaslapas projektu no nulles.',
      fix: 'Sveiki! Manā esošajā mājaslapā kaut kas nestrādā.',
      redesign: 'Sveiki! Vēlos pārveidot esošu mājaslapu.',
      unsure: 'Sveiki! Vēl nezinu, kāds web risinājums man ir vajadzīgs.',
    },
    prompts: {
      business: 'Vārds / uzņēmums',
      website: 'Esošā mājaslapa',
      problem: 'Kas nestrādā',
      change: 'Kam jāmainās',
      zeroFallback: ['Uzņēmums:', 'Ko mājaslapai būtu jāpalīdz sasniegt:'],
      fixFallback: ['Esošā mājaslapa:', 'Galvenā problēma:'],
      redesignFallback: ['Esošā mājaslapa:', 'Kam būtu jāizskatās vai jāstrādā citādi:'],
      unsureFallback: ['Biznesa problēma ir:'],
    },
  },
} as const;

export const pageContactCopy = {
  en: {
    default: {
      eyebrow: 'Next step',
      title: ['Have a problem', 'worth fixing?'],
      text: 'Start with what is not working. A technical brief and a pre-written solution are not required.',
      cta: 'Tell me the problem',
    },
    work: {
      eyebrow: 'After the proof',
      title: ['Seen enough?', 'Bring me the problem.'],
      text: 'The next project should not look like CATRIN or ANELIKA. It should look like the right answer for your business.',
      cta: 'Discuss your project',
    },
    about: {
      eyebrow: 'If the thinking fits',
      title: ['Different view.', 'Same table.'],
      text: 'If you want someone who will question the brief before designing it, tell me what is stuck.',
      cta: 'Start a conversation',
    },
    services: {
      eyebrow: 'Not sure which service?',
      title: ['Good.', 'Start with the problem.'],
      text: 'You do not need to choose a package. Describe the situation and I will tell you what actually makes sense.',
      cta: 'Find the right route',
    },
    case: {
      eyebrow: 'After the project',
      title: ['Need this level', 'of thinking?'],
      text: 'Bring the business problem, not a request to copy this project. The answer should be specific to your situation.',
      cta: 'Discuss a project',
    },
  },
  lv: {
    default: {
      eyebrow: 'Nākamais solis',
      title: ['Ir problēma,', 'ko vērts salabot?'],
      text: 'Sāc ar to, kas nestrādā. Tehniskais uzdevums un gatavs risinājums nav nepieciešams.',
      cta: 'Pastāstīt par problēmu',
    },
    work: {
      eyebrow: 'Pēc pierādījumiem',
      title: ['Pietiek redzēts?', 'Atnes problēmu.'],
      text: 'Nākamajam projektam nav jāizskatās kā CATRIN vai ANELIKA. Tam jābūt pareizajai atbildei tavam biznesam.',
      cta: 'Pārrunāt savu projektu',
    },
    about: {
      eyebrow: 'Ja domāšana sakrīt',
      title: ['Cits skatījums.', 'Pie viena galda.'],
      text: 'Ja gribi, lai sākumā tiek apšaubīts uzdevums un tikai tad zīmēts risinājums, pastāsti, kas ir iestrēdzis.',
      cta: 'Sākt sarunu',
    },
    services: {
      eyebrow: 'Nezini, kuru pakalpojumu?',
      title: ['Labi.', 'Sāc ar problēmu.'],
      text: 'Tev nav jāizvēlas pakete. Apraksti situāciju, un es pateikšu, kam patiešām ir jēga.',
      cta: 'Atrast pareizo ceļu',
    },
    case: {
      eyebrow: 'Pēc projekta',
      title: ['Vajag šādu', 'domāšanas līmeni?'],
      text: 'Atnes biznesa problēmu, nevis lūgumu nokopēt šo projektu. Atbildei jābūt tavai situācijai.',
      cta: 'Pārrunāt projektu',
    },
  },
} as const;

export function getContactRouterCopy(locale: Locale) {
  return contactRouterCopy[locale];
}

export function getPageContactCopy(locale: Locale, context: ContactContext = 'default') {
  const resolved = context === 'home' ? 'default' : context;
  return pageContactCopy[locale][resolved as keyof typeof pageContactCopy.en] ?? pageContactCopy[locale].default;
}

export function normalizeContactSource(pathname: string) {
  const value = pathname
    .replace(/^\/lv\//, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\//g, '-')
    .trim();
  return value || 'home';
}

export function buildContactHref(locale: Locale, source = 'direct', intent?: ContactIntentId, hash: 'start' | 'talk' | 'brief' = 'talk') {
  const params = new URLSearchParams();
  if (source) params.set('from', source);
  if (intent) params.set('intent', intent);
  return `${contactRoutes[locale]}${params.size ? `?${params.toString()}` : ''}#${hash}`;
}
