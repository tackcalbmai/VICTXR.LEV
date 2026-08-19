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
        sections: [
          {
            label: 'Problem',
            title: 'Make the digital experience feel as considered as the product.',
            text: 'A bridal salon sells trust, taste and a very personal appointment — not a catalogue. The website needed to carry that feeling while still explaining dresses, alterations, care and booking clearly.',
          },
          {
            label: 'Observation',
            title: 'The strongest asset was not a feature. It was atmosphere.',
            text: 'The photography and the salon’s personal service already had emotional weight. The right move was to remove visual noise, give the imagery room and make every practical path feel calm and deliberate.',
          },
          {
            label: 'Decision',
            title: 'Do not build a catalogue. Build a digital fitting room.',
            text: 'The experience would lead with feeling, then reveal practical information exactly when it becomes useful. The route to a fitting had to stay direct without turning the whole brand into a conversion template.',
          },
          {
            label: 'Design',
            title: 'Editorial pacing with quiet, deliberate routes.',
            text: 'A curated lookbook, restrained typography and generous image space carry the emotional layer. Service details, reviews and booking paths stay calm, legible and easy to reach.',
          },
          {
            label: 'Development',
            title: 'Three real language versions — not a translation widget.',
            text: 'Latvian, English and Russian content is rendered as responsive, indexable pages with stable navigation, metadata and direct contact routes. Optimized imagery preserves the atmosphere without making the experience heavy.',
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
        sections: [
          {
            label: 'Problēma',
            title: 'Panākt, lai digitālā pieredze būtu tikpat pārdomāta kā pats produkts.',
            text: 'Kāzu salonā svarīgas ir uzticība, gaume un ļoti personīga pieredze — nevis katalogs. Mājaslapai bija jārada tā pati sajūta un vienlaikus skaidri jāpastāsta par kleitām, to pielāgošanu, kopšanu un pierakstu.',
          },
          {
            label: 'Novērojums',
            title: 'Spēcīgākā priekšrocība nebija funkcija. Tā bija atmosfēra.',
            text: 'Fotogrāfijas un salona personīgā attieksme jau radīja vajadzīgo noskaņu. Pareizais solis bija mazināt vizuālo troksni, dot attēliem telpu un katru praktisko soli padarīt skaidru un pārdomātu.',
          },
          {
            label: 'Lēmums',
            title: 'Nevis katalogs, bet digitāla pielaikošanas telpa.',
            text: 'Pieredzei vispirms jārada sajūta un tikai tad jāatklāj praktiskā informācija. Ceļam uz pielaikošanu jābūt tiešam, nepārvēršot visu zīmolu par tipisku pārdošanas veidni.',
          },
          {
            label: 'Dizains',
            title: 'Redakcionāls ritms un mierīgi, apzināti ceļi.',
            text: 'Pārdomāta kleitu izlase, atturīga tipogrāfija un plaša vieta attēliem veido emocionālo slāni. Pakalpojumi, atsauksmes un pieraksta iespējas paliek skaidras un viegli atrodamas.',
          },
          {
            label: 'Izstrāde',
            title: 'Trīs īstas valodu versijas — nevis tulkošanas logrīks.',
            text: 'Saturs latviešu, angļu un krievu valodā ir veidots kā responsīvas un indeksējamas lapas ar stabilu navigāciju, metadatiem un tiešiem saziņas ceļiem. Optimizēti attēli saglabā atmosfēru, nepadarot pieredzi smagu.',
          },
          {
            label: 'Rezultāts',
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
        sections: [
          {
            label: 'Problem',
            title: 'Three service worlds. One business. Zero room for confusion.',
            text: 'Cleaning, territory maintenance and minor repair work attract different searches and different customers. A single generic services page would hide the range; a sprawling site would make it harder to choose.',
          },
          {
            label: 'Observation',
            title: 'People do not browse property services for fun. They arrive with a job.',
            text: 'The site had to identify that job quickly, establish coverage and trust, then offer the shortest sensible path to a call or a detailed enquiry.',
          },
          {
            label: 'Decision',
            title: 'Organize the website around jobs, not company departments.',
            text: 'Each service world needed a distinct entry point while sharing one commercial logic: identify the task, establish relevance and proof, then make the next action obvious.',
          },
          {
            label: 'Design',
            title: 'Orientation before persuasion.',
            text: 'A harder grid, modular service layers and clear coverage cues replace atmosphere with direction. Trust signals and calls to action appear where a visitor has enough context to use them.',
          },
          {
            label: 'Development',
            title: 'An indexable service architecture built to grow.',
            text: 'Distinct service hubs, supporting pages, responsive lead forms and multilingual content share one technical system. Structured metadata, canonical URLs and indexable pages give search engines the same clarity as visitors.',
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
        sections: [
          {
            label: 'Problēma',
            title: 'Trīs pakalpojumu jomas. Viens uzņēmums. Apjukumam nav vietas.',
            text: 'Uzkopšanu, teritoriju kopšanu un sīkus remontdarbus meklē atšķirīgi klienti ar atšķirīgām vajadzībām. Viena vispārīga pakalpojumu lapa noslēptu daļu piedāvājuma, savukārt pārāk sadrumstalota vietne apgrūtinātu izvēli.',
          },
          {
            label: 'Novērojums',
            title: 'Cilvēki pakalpojumu lapas nepārlūko izklaidei. Viņiem ir konkrēts darbs.',
            text: 'Mājaslapai ātri jāpalīdz atrast vajadzīgo pakalpojumu, jāparāda apkalpošanas teritorija un jārada uzticība. Pēc tam jānodrošina īsākais loģiskais ceļš uz zvanu vai detalizētu pieteikumu.',
          },
          {
            label: 'Lēmums',
            title: 'Sakārtot mājaslapu pēc klienta uzdevumiem, nevis uzņēmuma nodaļām.',
            text: 'Katrai pakalpojumu jomai vajadzēja savu skaidru ieejas punktu un vienotu komerciālo loģiku: atpazīt uzdevumu, parādīt atbilstību un uzticību, tad piedāvāt acīmredzamu nākamo soli.',
          },
          {
            label: 'Dizains',
            title: 'Vispirms orientācija, tikai tad pārliecināšana.',
            text: 'Stingrāks režģis, modulāri informācijas slāņi un skaidras apkalpošanas teritorijas norādes dod virzienu. Uzticības elementi un aicinājumi rīkoties parādās tad, kad apmeklētājam jau ir pietiekams konteksts.',
          },
          {
            label: 'Izstrāde',
            title: 'Indeksējama pakalpojumu arhitektūra, kas var augt.',
            text: 'Atsevišķas pakalpojumu sadaļas, papildu lapas, responsīvas pieteikumu formas un daudzvalodu saturs darbojas vienotā tehniskā sistēmā. Strukturēti metadati, kanoniskās adreses un indeksējamas lapas sniedz meklētājprogrammām tādu pašu skaidrību kā apmeklētājiem.',
          },
          {
            label: 'Rezultāts',
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
