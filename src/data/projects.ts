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
        seoTitle: 'CATRIN case study — VICTXR.LEV',
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
        sections: [
          {
            label: 'The challenge',
            title: 'Make the digital experience feel as considered as the product.',
            text: 'A bridal salon sells trust, taste and a very personal appointment — not a catalogue. The website needed to carry that feeling while still explaining dresses, alterations, care and booking clearly.',
          },
          {
            label: 'What I saw',
            title: 'The strongest asset was not a feature. It was atmosphere.',
            text: 'The photography and the salon’s personal service already had emotional weight. The right move was to remove visual noise, give the imagery room and make every practical path feel calm and deliberate.',
          },
          {
            label: 'What changed',
            title: 'Editorial pacing, real localization and direct booking paths.',
            text: 'The result combines a curated lookbook, clear service pages, fitting information, reviews and contact routes across Latvian, English and Russian — with each language rendered as an indexable page, not a client-side patch.',
          },
          {
            label: 'Result',
            title: 'One coherent experience from first impression to fitting request.',
            text: 'CATRIN now has a complete multilingual presence that can carry premium imagery, answer practical questions and move a visitor toward a fitting without flattening the brand into a generic salon template.',
          },
        ],
        resultNote: 'No invented vanity metrics. The deliverable is live, indexable and built around the real customer journey.',
      },
      lv: {
        seoTitle: 'CATRIN projekts — VICTXR.LEV',
        seoDescription: 'Daudzvalodu redakcionāla mājaslapa kāzu salonam CATRIN Jelgavā.',
        eyebrow: 'Atlasītie darbi / 01',
        title: 'CATRIN',
        subtitle: 'Digitāla pielaikošanas telpa kāzu salonam ar savu raksturu.',
        location: 'Jelgava, Latvija',
        year: '2026',
        services: ['Stratēģija', 'Tīmekļa dizains', 'Izstrāde', 'Daudzvalodu UX'],
        liveLabel: 'Apmeklēt CATRIN',
        backLabel: 'Atpakaļ pie darbiem',
        nextLabel: 'Nākamais projekts — ANELIKA',
        sections: [
          {
            label: 'Uzdevums',
            title: 'Panākt, lai digitālā pieredze būtu tikpat pārdomāta kā pats produkts.',
            text: 'Kāzu salons pārdod uzticību, gaumi un ļoti personīgu vizīti — nevis katalogu. Mājaslapai bija jāsaglabā šī sajūta un vienlaikus skaidri jāizstāsta par kleitām, pielāgošanu, kopšanu un pierakstu.',
          },
          {
            label: 'Ko es ieraudzīju',
            title: 'Spēcīgākais resurss nebija funkcija. Tā bija atmosfēra.',
            text: 'Fotogrāfijas un salona personīgā attieksme jau radīja vajadzīgo emociju. Pareizais solis bija noņemt vizuālo troksni, dot attēliem telpu un katru praktisko soli padarīt skaidru un pārdomātu.',
          },
          {
            label: 'Kas mainījās',
            title: 'Redakcionāls ritms, īsta lokalizācija un tiešs ceļš uz pierakstu.',
            text: 'Rezultātā tapusi pārdomāta kleitu izlase, skaidras pakalpojumu lapas, informācija par pielaikošanu, atsauksmes un saziņas iespējas latviešu, angļu un krievu valodā. Katrai valodai ir sava pilnvērtīgi indeksējama lapa.',
          },
          {
            label: 'Rezultāts',
            title: 'Viena vienota pieredze no pirmā iespaida līdz pierakstam.',
            text: 'CATRIN tagad ir pilnvērtīga mājaslapa vairākās valodās. Tā izceļ augstvērtīgus attēlus, atbild uz praktiskiem jautājumiem un ved apmeklētāju uz pielaikošanu, nezaudējot zīmola raksturu.',
          },
        ],
        resultNote: 'Bez izdomātiem cipariem. Mājaslapa ir publicēta, indeksējama un veidota ap reālo klienta ceļu.',
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
        seoTitle: 'ANELIKA case study — VICTXR.LEV',
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
        sections: [
          {
            label: 'The challenge',
            title: 'Three service worlds. One business. Zero room for confusion.',
            text: 'Cleaning, territory maintenance and minor repair work attract different searches and different customers. A single generic services page would hide the range; a sprawling site would make it harder to choose.',
          },
          {
            label: 'What I saw',
            title: 'People do not browse property services for fun. They arrive with a job.',
            text: 'The site had to identify that job quickly, establish coverage and trust, then offer the shortest sensible path to a call or a detailed enquiry.',
          },
          {
            label: 'What changed',
            title: 'A modular service system with a commercial spine.',
            text: 'Distinct service hubs, supporting pages, responsive lead forms and multilingual content now share one visual and technical system. Structured metadata, canonical URLs and indexable service pages give search engines the same clarity as visitors.',
          },
          {
            label: 'Result',
            title: 'A practical business tool that can grow without turning into a maze.',
            text: 'ANELIKA can present a broad offer across Latvia while keeping every page focused on a real task, a clear next step and a clear reason to trust the business.',
          },
        ],
        resultNote: 'Different from CATRIN on purpose: less atmosphere, more orientation, proof and action.',
      },
      lv: {
        seoTitle: 'ANELIKA projekts — VICTXR.LEV',
        seoDescription: 'Uz pieteikumiem orientēta daudzvalodu pakalpojumu mājaslapa ANELIKA visā Latvijā.',
        eyebrow: 'Atlasītie darbi / 02',
        title: 'ANELIKA',
        subtitle: 'Plašs pakalpojumu bizness pārvērsts skaidrā ceļā no problēmas līdz pieteikumam.',
        location: 'Jelgava / visa Latvija',
        year: '2026',
        services: ['Informācijas arhitektūra', 'Tīmekļa dizains', 'Pieteikumu plūsma', 'Tehniskais SEO'],
        liveLabel: 'Apmeklēt ANELIKA',
        backLabel: 'Atpakaļ pie darbiem',
        nextLabel: 'Atpakaļ uz CATRIN',
        sections: [
          {
            label: 'Uzdevums',
            title: 'Trīs pakalpojumu pasaules. Viens uzņēmums. Nekādas vietas apjukumam.',
            text: 'Uzkopšana, teritoriju kopšana un sīki remontdarbi piesaista atšķirīgus meklējumus un klientus. Viena vispārīga pakalpojumu lapa paslēptu piedāvājumu, bet pārāk plaša struktūra apgrūtinātu izvēli.',
          },
          {
            label: 'Ko es ieraudzīju',
            title: 'Cilvēki nešķirsta īpašumu servisa lapas izklaidei. Viņiem ir konkrēts darbs.',
            text: 'Mājaslapai ātri jāatpazīst šis darbs, jāparāda darbības teritorija un uzticamība, pēc tam jādod īsākais loģiskais ceļš uz zvanu vai detalizētu pieteikumu.',
          },
          {
            label: 'Kas mainījās',
            title: 'Modulāra pakalpojumu sistēma ar skaidru komerciālo loģiku.',
            text: 'Atsevišķas pakalpojumu sadaļas, papildu lapas, responsīvas pieteikumu formas un daudzvalodu saturs tagad strādā vienā vizuālā un tehniskā sistēmā. Strukturēti metadati un indeksējamas lapas dod meklētājprogrammām tādu pašu skaidrību kā apmeklētājiem.',
          },
          {
            label: 'Rezultāts',
            title: 'Praktisks biznesa rīks, kas var augt, nepārvēršoties labirintā.',
            text: 'ANELIKA var parādīt plašu piedāvājumu visā Latvijā, vienlaikus katru lapu koncentrējot uz reālu uzdevumu, skaidru nākamo soli un iemeslu uzticēties uzņēmumam.',
          },
        ],
        resultNote: 'Apzināti citāds nekā CATRIN: mazāk atmosfēras, vairāk orientācijas, uzticības un darbības.',
      },
    },
  },
};

export function getProject(id: ProjectId) {
  return projects[id];
}
