import type { ImageMetadata } from 'astro';
import catrinDesktop from '../assets/projects/catrin-desktop.jpg';
import catrinMobile from '../assets/projects/catrin-mobile.jpg';
import catrinPortrait from '../assets/projects/catrin-portrait.jpg';
import catrinLookbook from '../assets/projects/catrin-lookbook.jpg';
import catrinDetail from '../assets/projects/catrin-detail.jpg';
import catrinSalon from '../assets/projects/catrin-salon.jpg';
import anelikaDesktop from '../assets/projects/anelika-desktop.jpg';
import anelikaMobile from '../assets/projects/anelika-mobile.jpg';
import anelikaMark from '../assets/projects/anelika-mark.svg';
import type { Locale } from './site';

export type ProjectId = 'catrin' | 'anelika';

type LocalizedCase = {
  seoTitle: string;
  seoDescription: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  location: string;
  year: string;
  services: string[];
  liveLabel: string;
  backLabel: string;
  nextLabel: string;
  decision: {
    rejectedLabel: string;
    rejectedTitle: string;
    rejectedText: string;
    chosenLabel: string;
    chosenTitle: string;
    chosenText: string;
  };
  proof: Array<{
    value: string;
    label: string;
  }>;
  sections: Array<{
    label: string;
    title: string;
    text: string;
  }>;
  resultNote: string;
};

export type Project = {
  id: ProjectId;
  liveUrl: string;
  theme: 'catrin' | 'anelika';
  hero: ImageMetadata;
  mobile: ImageMetadata;
  gallery: ImageMetadata[];
  mark?: ImageMetadata;
  content: Record<Locale, LocalizedCase>;
};

export const projects: Record<ProjectId, Project> = {
  catrin: {
    id: 'catrin',
    liveUrl: 'https://www.catrin.lv/',
    theme: 'catrin',
    hero: catrinDesktop,
    mobile: catrinMobile,
    gallery: [catrinPortrait, catrinLookbook, catrinDetail, catrinSalon],
    content: {
      en: {
        seoTitle: 'CATRIN case study — XO WEB | VICTXR.LEV',
        seoDescription: 'A multilingual editorial website for the CATRIN bridal salon in Jelgava.',
        eyebrow: 'Selected work / 01',
        title: 'CATRIN',
        subtitle: 'A digital fitting room for a bridal salon with a real point of view.',
        location: 'Jelgava, Latvia',
        year: '2026',
        services: ['Strategy', 'Web design', 'Development', 'Multilingual UX'],
        liveLabel: 'Visit CATRIN',
        backLabel: 'Back to work',
        nextLabel: 'Next case — ANELIKA',
        decision: {
          rejectedLabel: 'X / rejected default',
          rejectedTitle: 'A generic bridal catalogue.',
          rejectedText: 'More cards and filters would show inventory, but flatten the emotional reason people choose the salon.',
          chosenLabel: 'O / chosen direction',
          chosenTitle: 'An editorial journey to a fitting.',
          chosenText: 'Atmosphere earns attention; practical answers and direct booking paths turn that attention into a confident next step.',
        },
        proof: [
          { value: 'LIVE', label: 'Public website' },
          { value: '03', label: 'Language routes' },
          { value: '100%', label: 'Responsive system' },
          { value: 'INDEXABLE', label: 'Localized pages' },
        ],
        sections: [
          {
            label: '01 / Problem',
            title: 'Make the digital experience feel as considered as the product.',
            text: 'A bridal salon sells trust, taste and a very personal appointment — not a catalogue. The website needed to carry that feeling while still explaining dresses, alterations, care and booking clearly.',
          },
          {
            label: '02 / Observation',
            title: 'The strongest asset was not a feature. It was atmosphere.',
            text: 'The photography and the salon’s personal service already had emotional weight. The right move was to remove visual noise, give the imagery room and make every practical path feel calm and deliberate.',
          },
          {
            label: '03 / Decision',
            title: 'Reject the catalogue. Build around confidence.',
            text: 'The site would not compete with large dress directories. It would make the salon’s taste, care and fitting experience tangible, then remove uncertainty around the visit.',
          },
          {
            label: '04 / Design',
            title: 'Editorial restraint with practical information always within reach.',
            text: 'Large imagery, quiet typography and controlled pacing create the emotional layer. Clear service, fitting, care and contact paths keep the experience useful instead of merely atmospheric.',
          },
          {
            label: '05 / Development',
            title: 'Localization treated as architecture, not an overlay.',
            text: 'Latvian, English and Russian have dedicated routes, navigation and metadata. Responsive images, semantic content and direct contact paths keep the experience fast, accessible and indexable across devices.',
          },
          {
            label: '06 / Result',
            title: 'One coherent experience from first impression to fitting request.',
            text: 'CATRIN now has a complete multilingual presence that can carry premium imagery, answer practical questions and move a visitor toward a fitting without flattening the brand into a generic salon template.',
          },
        ],
        resultNote: 'No invented vanity metrics. The deliverable is live, indexable and built around the real customer journey.',
      },
      lv: {
        seoTitle: 'CATRIN projekts — XO WEB | VICTXR.LEV',
        seoDescription: 'Daudzvalodu mājaslapa kāzu salonam CATRIN Jelgavā.',
        eyebrow: 'Atlasītie darbi / 01',
        title: 'CATRIN',
        subtitle: 'Digitāla pielaikošanas telpa kāzu salonam ar savu raksturu.',
        location: 'Jelgava, Latvija',
        year: '2026',
        services: ['Stratēģija', 'Tīmekļa dizains', 'Izstrāde', 'Daudzvalodu UX'],
        liveLabel: 'Apmeklēt CATRIN',
        backLabel: 'Atpakaļ pie darbiem',
        nextLabel: 'Nākamais projekts — ANELIKA',
        decision: {
          rejectedLabel: 'X / noraidītais standarts',
          rejectedTitle: 'Vispārīgs kāzu kleitu katalogs.',
          rejectedText: 'Vairāk kartīšu un filtru parādītu piedāvājumu, bet pazaudētu emocionālo iemeslu, kāpēc kliente izvēlas tieši šo salonu.',
          chosenLabel: 'O / izvēlētais virziens',
          chosenTitle: 'Redakcionāls ceļš līdz pielaikošanai.',
          chosenText: 'Atmosfēra piesaista uzmanību, bet praktiskas atbildes un tiešs ceļš uz pierakstu pārvērš to pārliecinošā nākamajā solī.',
        },
        proof: [
          { value: 'LIVE', label: 'Publiska mājaslapa' },
          { value: '03', label: 'Valodu maršruti' },
          { value: '100%', label: 'Responsīva sistēma' },
          { value: 'INDEKSĒJAMA', label: 'Lokalizētas lapas' },
        ],
        sections: [
          {
            label: '01 / Problēma',
            title: 'Panākt, lai digitālā pieredze būtu tikpat pārdomāta kā pats produkts.',
            text: 'Kāzu salonā svarīgas ir uzticība, gaume un ļoti personīga pieredze — nevis katalogs. Mājaslapai bija jārada tā pati sajūta un vienlaikus skaidri jāpastāsta par kleitām, to pielāgošanu, kopšanu un pierakstu.',
          },
          {
            label: '02 / Novērojums',
            title: 'Spēcīgākā priekšrocība nebija funkcija. Tā bija atmosfēra.',
            text: 'Fotogrāfijas un salona personīgā attieksme jau radīja vajadzīgo noskaņu. Pareizais solis bija mazināt vizuālo troksni, dot attēliem telpu un katru praktisko soli padarīt skaidru un pārdomātu.',
          },
          {
            label: '03 / Lēmums',
            title: 'Atteikties no kataloga. Veidot ap pārliecību.',
            text: 'Mājaslapai nebija jāsacenšas ar lieliem kleitu katalogiem. Tai bija jāpadara redzama salona gaume, attieksme un pielaikošanas pieredze, pēc tam jānovērš neskaidrība par vizīti.',
          },
          {
            label: '04 / Dizains',
            title: 'Redakcionāls atturīgums ar praktisko informāciju rokas stiepiena attālumā.',
            text: 'Lieli attēli, mierīga tipogrāfija un kontrolēts ritms veido emocionālo slāni. Skaidri pakalpojumu, pielaikošanas, kopšanas un saziņas ceļi saglabā pieredzi noderīgu.',
          },
          {
            label: '05 / Izstrāde',
            title: 'Lokalizācija kā arhitektūra, nevis virsū uzlikts logrīks.',
            text: 'Latviešu, angļu un krievu valodai ir atsevišķi maršruti, navigācija un metadati. Responsīvi attēli, semantisks saturs un tieši saziņas ceļi saglabā vietni ātru, piekļūstamu un indeksējamu.',
          },
          {
            label: '06 / Rezultāts',
            title: 'Viena vienota pieredze no pirmā iespaida līdz pierakstam.',
            text: 'CATRIN tagad ir pilnvērtīga mājaslapa vairākās valodās. Tā izceļ kvalitatīvus attēlus, atbild uz praktiskiem jautājumiem un ved apmeklētāju uz pielaikošanu, nezaudējot zīmola raksturu.',
          },
        ],
        resultNote: 'Bez izdomātiem skaitļiem. Mājaslapa ir publicēta, indeksējama un veidota atbilstoši reālajam klienta ceļam.',
      },
    },
  },
  anelika: {
    id: 'anelika',
    liveUrl: 'https://www.anelika.lv/',
    theme: 'anelika',
    hero: anelikaDesktop,
    mobile: anelikaMobile,
    gallery: [anelikaDesktop, anelikaMobile],
    mark: anelikaMark,
    content: {
      en: {
        seoTitle: 'ANELIKA case study — XO WEB | VICTXR.LEV',
        seoDescription: 'A conversion-focused, multilingual service website for ANELIKA across Latvia.',
        eyebrow: 'Selected work / 02',
        title: 'ANELIKA',
        subtitle: 'A broad service business turned into a clear route from problem to enquiry.',
        location: 'Jelgava / across Latvia',
        year: '2026',
        services: ['Information architecture', 'Web design', 'Lead generation', 'Technical SEO'],
        liveLabel: 'Visit ANELIKA',
        backLabel: 'Back to work',
        nextLabel: 'Back to CATRIN',
        decision: {
          rejectedLabel: 'X / rejected default',
          rejectedTitle: 'One page that lists everything.',
          rejectedText: 'A long service dump would make a broad offer look simpler to build, but harder for customers and search engines to understand.',
          chosenLabel: 'O / chosen direction',
          chosenTitle: 'A task-led service architecture.',
          chosenText: 'Separate service routes identify the job quickly, build trust in context and keep the next action obvious.',
        },
        proof: [
          { value: 'LIVE', label: 'Public website' },
          { value: '03', label: 'Service systems' },
          { value: 'MULTI', label: 'Language routes' },
          { value: 'DIRECT', label: 'Enquiry paths' },
        ],
        sections: [
          {
            label: '01 / Problem',
            title: 'Three service worlds. One business. Zero room for confusion.',
            text: 'Cleaning, territory maintenance and minor repair work attract different searches and different customers. A single generic services page would hide the range; a sprawling site would make it harder to choose.',
          },
          {
            label: '02 / Observation',
            title: 'People do not browse property services for fun. They arrive with a job.',
            text: 'The site had to identify that job quickly, establish coverage and trust, then offer the shortest sensible path to a call or a detailed enquiry.',
          },
          {
            label: '03 / Decision',
            title: 'Organize around customer jobs, not the company’s internal list.',
            text: 'Each main service world needed its own clear route while remaining visibly part of one business. The structure had to scale without creating a maze.',
          },
          {
            label: '04 / Design',
            title: 'A rational interface with trust and action built into the hierarchy.',
            text: 'Sharper geometry, modular service blocks, visible coverage and restrained brand cues keep orientation fast. Every page explains the job before asking for an enquiry.',
          },
          {
            label: '05 / Development',
            title: 'Reusable service modules with a technical search foundation.',
            text: 'Service hubs, supporting pages, responsive lead forms and multilingual content share one system. Structured metadata, canonical URLs and indexable pages give search engines the same clarity as visitors.',
          },
          {
            label: '06 / Result',
            title: 'A practical business tool that can grow without turning into a maze.',
            text: 'ANELIKA can present a broad offer across Latvia while keeping every page focused on a real task, a clear next step and a clear reason to trust the business.',
          },
        ],
        resultNote: 'Different from CATRIN on purpose: less atmosphere, more orientation, proof and action.',
      },
      lv: {
        seoTitle: 'ANELIKA projekts — XO WEB | VICTXR.LEV',
        seoDescription: 'Uz pieteikumiem orientēta daudzvalodu pakalpojumu mājaslapa ANELIKA visā Latvijā.',
        eyebrow: 'Atlasītie darbi / 02',
        title: 'ANELIKA',
        subtitle: 'Plašs pakalpojumu klāsts sakārtots skaidrā ceļā no problēmas līdz pieteikumam.',
        location: 'Jelgava / visā Latvijā',
        year: '2026',
        services: ['Informācijas arhitektūra', 'Tīmekļa dizains', 'Klientu piesaiste', 'Tehniskais SEO'],
        liveLabel: 'Apmeklēt ANELIKA',
        backLabel: 'Atpakaļ pie darbiem',
        nextLabel: 'Atpakaļ uz CATRIN',
        decision: {
          rejectedLabel: 'X / noraidītais standarts',
          rejectedTitle: 'Viena lapa ar visu pakalpojumu sarakstu.',
          rejectedText: 'Garš pakalpojumu uzskaitījums būtu vienkāršāk uzbūvējams, bet grūtāk saprotams gan klientiem, gan meklētājprogrammām.',
          chosenLabel: 'O / izvēlētais virziens',
          chosenTitle: 'Ar uzdevumiem vadīta pakalpojumu arhitektūra.',
          chosenText: 'Atsevišķi pakalpojumu ceļi ātri identificē vajadzību, rada uzticību konkrētajā kontekstā un saglabā nākamo darbību acīmredzamu.',
        },
        proof: [
          { value: 'LIVE', label: 'Publiska mājaslapa' },
          { value: '03', label: 'Pakalpojumu sistēmas' },
          { value: 'MULTI', label: 'Valodu maršruti' },
          { value: 'TIEŠI', label: 'Pieteikumu ceļi' },
        ],
        sections: [
          {
            label: '01 / Problēma',
            title: 'Trīs pakalpojumu jomas. Viens uzņēmums. Apjukumam nav vietas.',
            text: 'Uzkopšanu, teritoriju kopšanu un sīkus remontdarbus meklē atšķirīgi klienti ar atšķirīgām vajadzībām. Viena vispārīga pakalpojumu lapa noslēptu daļu piedāvājuma, savukārt pārāk sadrumstalota vietne apgrūtinātu izvēli.',
          },
          {
            label: '02 / Novērojums',
            title: 'Cilvēki pakalpojumu lapas nepārlūko izklaidei. Viņiem ir konkrēts darbs.',
            text: 'Mājaslapai ātri jāpalīdz atrast vajadzīgo pakalpojumu, jāparāda apkalpošanas teritorija un jārada uzticība. Pēc tam jānodrošina īsākais loģiskais ceļš uz zvanu vai detalizētu pieteikumu.',
          },
          {
            label: '03 / Lēmums',
            title: 'Kārtot pēc klienta uzdevuma, nevis uzņēmuma iekšējā saraksta.',
            text: 'Katrai galvenajai pakalpojumu jomai vajadzēja savu skaidru ceļu, vienlaikus saglabājot redzamu saikni ar vienu uzņēmumu. Struktūrai bija jāaug, neveidojot labirintu.',
          },
          {
            label: '04 / Dizains',
            title: 'Racionāla saskarne ar uzticību un darbību pašā hierarhijā.',
            text: 'Asāka ģeometrija, modulāri pakalpojumu bloki, redzama darbības teritorija un atturīgas zīmola zīmes ļauj ātri orientēties. Katra lapa vispirms izskaidro darbu un tikai tad prasa pieteikumu.',
          },
          {
            label: '05 / Izstrāde',
            title: 'Atkārtoti izmantojami pakalpojumu moduļi ar tehnisku pamatu meklēšanai.',
            text: 'Pakalpojumu sadaļas, papildu lapas, responsīvas pieteikumu formas un daudzvalodu saturs darbojas vienotā sistēmā. Strukturēti metadati, kanoniskās adreses un indeksējamas lapas sniedz vienādu skaidrību cilvēkiem un meklētājprogrammām.',
          },
          {
            label: '06 / Rezultāts',
            title: 'Praktisks biznesa rīks, kas var augt, nepārvēršoties labirintā.',
            text: 'ANELIKA var parādīt plašu piedāvājumu visā Latvijā, vienlaikus katrai lapai saglabājot skaidru uzdevumu, nākamo soli un iemeslu uzticēties uzņēmumam.',
          },
        ],
        resultNote: 'Apzināti atšķirīgs no CATRIN: mazāk atmosfēras, vairāk skaidrības, uzticības un rīcības.',
      },
    },
  },
};

export function getProject(id: ProjectId) {
  return projects[id];
}
