import type { Locale } from './site';

export const pageRoutes = {
  en: {
    home: '/',
    work: '/work/',
    about: '/about/',
    services: '/services/',
  },
  lv: {
    home: '/lv/',
    work: '/lv/darbi/',
    about: '/lv/par-mani/',
    services: '/lv/pakalpojumi/',
  },
} as const;

export const multipageCopy = {
  en: {
    work: {
      seoTitle: 'Selected work — XO WEB',
      seoDescription: 'Selected XO WEB projects by Victxr Lev. Different businesses, different problems, different answers.',
      eyebrow: 'Selected work / 01',
      title: ['Different problems', 'deserve different', 'websites.'],
      intro: 'I do not design one look and sell it twice. Each project starts with what the business actually needs to make clearer, stronger or easier to act on.',
      proof: 'Two finished projects. Two deliberately different systems.',
      projectLabel: 'Case study',
      liveLabel: 'Live website',
      closing: ['No house style.', 'A point of view.'],
      closingText: 'The consistent part is not the surface. It is the level of attention, the reasoning behind decisions and the refusal to ship something generic.',
    },
    about: {
      seoTitle: 'About Victxr Lev — XO WEB',
      seoDescription: 'XO WEB is an independent web practice by Victxr Lev, focused on clear thinking, distinctive design and technically finished websites.',
      eyebrow: 'XO WEB / Victxr Lev',
      title: ['The perspective', 'behind the work.'],
      lead: 'I do not start with a website. I start with what is actually wrong, unclear, slow, generic or unnecessary.',
      identityTitle: ['XO WEB is the work.', 'Victxr Lev is the perspective behind it.'],
      identityText: 'I work independently, which keeps the chain between the problem, the decision and the final build short. No account-manager translation layer. No pretending to be a twelve-person studio.',
      principles: [
        {
          index: '01',
          title: 'Question the brief.',
          text: 'A requested feature is not automatically the right solution. I want to understand the business problem before deciding what deserves to exist on the page.',
        },
        {
          index: '02',
          title: 'Remove before adding.',
          text: 'More pages, more motion and more functionality are not signs of quality. If something does not improve understanding, trust or action, it is a candidate for deletion.',
        },
        {
          index: '03',
          title: 'Make the unusual earn its place.',
          text: 'I like breaking visual rules, but only when the result becomes clearer, more memorable or more appropriate for the business. Weird for the sake of weird is just decoration.',
        },
        {
          index: '04',
          title: 'Finish the boring parts too.',
          text: 'Responsive behavior, loading, accessibility, metadata, localization and edge cases are part of the design. The premium feeling disappears the moment the site starts behaving badly.',
        },
      ],
      standardTitle: ['Good design should', 'survive the question', '“why?”'],
      standardText: 'If I cannot explain why a decision is there, it probably should not be there.',
      bridgeLabel: 'What this means for a client',
      bridgeText: 'You get one person thinking across strategy, structure, design and implementation — and someone willing to say when the simpler solution is the stronger one.',
    },
    services: {
      seoTitle: 'Web design services — XO WEB',
      seoDescription: 'Websites from scratch, redesigns, landing pages, multilingual websites, technical SEO and ongoing development by XO WEB.',
      eyebrow: 'Services / 03',
      title: ['What do you', 'actually need?'],
      intro: 'A new website is one possible answer. It is not the starting assumption.',
      services: [
        {
          index: '01',
          title: 'Website from scratch',
          when: 'When there is no useful foundation to keep, or the business has outgrown what exists.',
          result: 'Strategy, information architecture, visual system and a production-ready website built as one coherent product.',
        },
        {
          index: '02',
          title: 'Website redesign',
          when: 'When the current site has value, but the structure, visual language or user path is holding it back.',
          result: 'Keep the useful parts, remove the dead weight and rebuild only what needs rebuilding.',
        },
        {
          index: '03',
          title: 'Landing page',
          when: 'When one offer, launch or campaign needs a focused path to one meaningful action.',
          result: 'A page with a clear argument, deliberate hierarchy and no decorative detours.',
        },
        {
          index: '04',
          title: 'Multilingual website',
          when: 'When different audiences need a real localized experience rather than a translation widget.',
          result: 'Structured language routes, localized navigation, metadata and typography that actually fit each language.',
        },
        {
          index: '05',
          title: 'SEO & technical setup',
          when: 'When the site needs a solid technical foundation before search, analytics or content work can produce useful results.',
          result: 'Indexable structure, canonical and language signals, metadata, performance, accessibility and measurement foundations.',
        },
        {
          index: '06',
          title: 'Ongoing development',
          when: 'When the website is already live and should improve with the business instead of becoming a frozen launch artifact.',
          result: 'Measured changes, new sections, technical maintenance and design improvements without rebuilding everything every year.',
        },
      ],
      antiTitle: ['Sometimes the answer', 'is less website.'],
      antiText: 'If a redesign is enough, I will not sell a rebuild. If one page is enough, I will not invent ten. The job is to solve the business problem, not maximize the invoice.',
      processLabel: 'How projects start',
      processTitle: 'Problem first. Scope second.',
      processText: 'Send the short version: what the business does, what is not working and what should change. A polished technical brief is not required.',
    },
  },
  lv: {
    work: {
      seoTitle: 'Atlasītie darbi — XO WEB',
      seoDescription: 'XO WEB atlasītie Victxr Lev projekti. Atšķirīgi uzņēmumi, atšķirīgas problēmas un atšķirīgi risinājumi.',
      eyebrow: 'Atlasītie darbi / 01',
      title: ['Dažādām problēmām', 'vajag dažādas', 'mājaslapas.'],
      intro: 'Es neizveidoju vienu vizuālo stilu un nepārdodu to atkārtoti. Katrs projekts sākas ar to, kas konkrētajam biznesam patiesībā jāpadara skaidrāks, spēcīgāks vai vienkāršāk izdarāms.',
      proof: 'Divi pabeigti projekti. Divas apzināti atšķirīgas sistēmas.',
      projectLabel: 'Projekts',
      liveLabel: 'Dzīvā mājaslapa',
      closing: ['Nav viena stila.', 'Ir savs skatījums.'],
      closingText: 'Konsekvence nav ārējā izskatā. Tā ir uzmanībā pret detaļām, lēmumu loģikā un atteikumā publicēt kaut ko vispārīgu.',
    },
    about: {
      seoTitle: 'Par Victxr Lev — XO WEB',
      seoDescription: 'XO WEB ir Victxr Lev neatkarīgs web projekts, kura pamatā ir skaidra domāšana, atšķirīgs dizains un tehniski pabeigtas mājaslapas.',
      eyebrow: 'XO WEB / Victxr Lev',
      title: ['Skatījums', 'aiz visa darba.'],
      lead: 'Es nesāku ar mājaslapu. Es sāku ar to, kas biznesā digitāli ir neskaidrs, vājš, lēns, pārāk vispārīgs vai vienkārši lieks.',
      identityTitle: ['XO WEB ir darbs.', 'Victxr Lev ir skatījums aiz tā.'],
      identityText: 'Es strādāju neatkarīgi, tāpēc ceļš no problēmas līdz lēmumam un gatavam risinājumam ir īss. Nav starpnieka, kas pārtulko domas starp klientu un cilvēku, kurš patiesībā būvē mājaslapu. Un nav izlikšanās par divpadsmit cilvēku aģentūru.',
      principles: [
        {
          index: '01',
          title: 'Apšaubīt uzdevumu.',
          text: 'Tas, ka funkcija ir ierakstīta sākotnējā vēlmju sarakstā, nenozīmē, ka tā ir pareizā atbilde. Vispirms jāizprot biznesa problēma.',
        },
        {
          index: '02',
          title: 'Vispirms atņemt.',
          text: 'Vairāk lapu, vairāk animācijas un vairāk funkciju nav kvalitātes pazīme. Ja kaut kas nepalīdz saprast, uzticēties vai rīkoties, to drīkst izmest.',
        },
        {
          index: '03',
          title: 'Neparastajam jābūt pamatotam.',
          text: 'Man patīk lauzt vizuālos noteikumus, bet tikai tad, ja rezultāts kļūst skaidrāks, atmiņā paliekošāks vai atbilstošāks biznesam. Dīvainība dīvainības pēc ir tikai dekors.',
        },
        {
          index: '04',
          title: 'Pabeigt arī garlaicīgās detaļas.',
          text: 'Responsivitāte, ielāde, piekļūstamība, metadati, lokalizācija un malas gadījumi ir daļa no dizaina. Premium sajūta pazūd tajā brīdī, kad mājaslapa sāk uzvesties slikti.',
        },
      ],
      standardTitle: ['Labam dizainam', 'jāiztur jautājums', '“kāpēc?”'],
      standardText: 'Ja es nevaru pamatot, kāpēc konkrēts risinājums tur atrodas, iespējams, tam tur nav jābūt.',
      bridgeLabel: 'Ko tas nozīmē klientam',
      bridgeText: 'Viens cilvēks domā par stratēģiju, struktūru, dizainu un realizāciju — un ir gatavs pateikt, ja vienkāršāks risinājums patiesībā ir stiprāks.',
    },
    services: {
      seoTitle: 'Mājaslapu pakalpojumi — XO WEB',
      seoDescription: 'Mājaslapas no nulles, redesign, landing lapas, daudzvalodu mājaslapas, tehniskais SEO un turpmāka izstrāde no XO WEB.',
      eyebrow: 'Pakalpojumi / 03',
      title: ['Kas tev', 'patiesībā', 'ir vajadzīgs?'],
      intro: 'Jauna mājaslapa ir viena iespējamā atbilde. Tā nav sākotnējā pieņēmuma vieta.',
      services: [
        {
          index: '01',
          title: 'Mājaslapa no nulles',
          when: 'Ja nav jēgpilna pamata, ko saglabāt, vai uzņēmums jau ir izaudzis no esošās mājaslapas.',
          result: 'Stratēģija, informācijas arhitektūra, vizuālā sistēma un publicēšanai gatava mājaslapa kā viens vienots produkts.',
        },
        {
          index: '02',
          title: 'Mājaslapas pārveide',
          when: 'Ja esošajā mājaslapā ir vērtīgas daļas, bet struktūra, vizuālā valoda vai lietotāja ceļš bremzē rezultātu.',
          result: 'Saglabāt to, kas strādā, izmest lieko un pārbūvēt tikai to, ko patiešām vajag pārbūvēt.',
        },
        {
          index: '03',
          title: 'Pārdošanas lapa',
          when: 'Ja vienam piedāvājumam, kampaņai vai palaišanai vajag koncentrētu ceļu līdz vienai jēgpilnai darbībai.',
          result: 'Lapa ar skaidru argumentu, apzinātu hierarhiju un bez dekoratīviem apkārtceļiem.',
        },
        {
          index: '04',
          title: 'Daudzvalodu mājaslapa',
          when: 'Ja dažādām auditorijām vajag īstu lokalizētu pieredzi, nevis tulkošanas logrīku virs vienas lapas.',
          result: 'Atsevišķi valodu maršruti, lokalizēta navigācija, metadati un tipogrāfija, kas reāli pielāgota katrai valodai.',
        },
        {
          index: '05',
          title: 'SEO un tehniskā bāze',
          when: 'Ja pirms satura, reklāmas vai meklētāju darba mājaslapai vajag sakārtotu tehnisko pamatu.',
          result: 'Indeksējama struktūra, canonical un valodu signāli, metadati, veiktspēja, piekļūstamība un analītikas pamati.',
        },
        {
          index: '06',
          title: 'Turpmāka attīstība',
          when: 'Ja mājaslapa jau ir publicēta un tai jāaug kopā ar biznesu, nevis jāsastingst palaišanas dienā.',
          result: 'Izmērāmi uzlabojumi, jaunas sadaļas, tehniskā uzturēšana un dizaina attīstība bez pilnīgas pārbūves katru gadu.',
        },
      ],
      antiTitle: ['Dažreiz vajag', 'mazāk mājaslapas.'],
      antiText: 'Ja pietiek ar pārveidi, es nepārdošu pilnu pārbūvi. Ja pietiek ar vienu lapu, neizdomāšu desmit. Uzdevums ir atrisināt biznesa problēmu, nevis maksimāli palielināt rēķinu.',
      processLabel: 'Kā sākas projekts',
      processTitle: 'Vispirms problēma. Tad apjoms.',
      processText: 'Atsūti īso versiju: ko dara uzņēmums, kas šobrīd nestrādā un kam būtu jāmainās. Perfekts tehniskais uzdevums nav vajadzīgs.',
    },
  },
} as const;

export function getMultipageCopy(locale: Locale) {
  return multipageCopy[locale];
}
