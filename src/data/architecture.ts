import type { Locale } from './site';

export const contactRoutes: Record<Locale, string> = {
  en: '/contact/',
  lv: '/lv/kontakti/',
};

export const homeV2Copy = {
  en: {
    workLabel: 'Selected work / proof, not promises',
    workTitle: ['Two businesses.', 'Two different answers.'],
    workText: 'The surface changes because the problem changes. CATRIN needs emotion and restraint. ANELIKA needs clarity, structure and action.',
    workCta: 'See all work',
    workScenes: {
      wrongLabel: 'Wrong assumption',
      focusLabel: 'Chosen focus',
      catrin: {
        wrong: 'A bridal salon needs a catalogue.',
        focus: 'Atmosphere → trust → fitting.',
      },
      anelika: {
        wrong: 'One generic services page.',
        focus: 'Task → clarity → enquiry.',
      },
    },
    perspectiveLabel: 'Different perspective',
    perspectiveTitle: ['You asked for', 'a website.', 'I might tell you', 'not to build one.'],
    perspectiveText: 'The brief is a starting point, not a command. I question what is actually broken, remove what does not earn its place and build the smallest strong answer.',
    aboutCta: 'How I think',
    servicesCta: 'What I actually do',
    closeEyebrow: 'Enough scrolling. Now the useful part.',
    closeTitle: ['Have a problem', 'worth fixing?'],
    closeText: 'Tell me what is not working. You do not need a polished brief or a list of features.',
    closeCta: 'Start with the problem',
  },
  lv: {
    workLabel: 'Atlasītie darbi / pierādījumi, nevis solījumi',
    workTitle: ['Divi biznesi.', 'Divas dažādas atbildes.'],
    workText: 'Vizuālā valoda mainās, jo mainās problēma. CATRIN vajag emociju un atturību. ANELIKA — skaidrību, struktūru un darbību.',
    workCta: 'Skatīt visus darbus',
    workScenes: {
      wrongLabel: 'Nepareizais pieņēmums',
      focusLabel: 'Izvēlētais fokuss',
      catrin: {
        wrong: 'Kāzu salonam vajag katalogu.',
        focus: 'Atmosfēra → uzticība → pielaikošana.',
      },
      anelika: {
        wrong: 'Viena vispārīga pakalpojumu lapa.',
        focus: 'Uzdevums → skaidrība → pieteikums.',
      },
    },
    perspectiveLabel: 'Cits skatījums',
    perspectiveTitle: ['Tu prasīji', 'mājaslapu.', 'Es varu pateikt,', 'ka to nevajag.'],
    perspectiveText: 'Sākotnējais uzdevums ir sākuma punkts, nevis pavēle. Vispirms saprotu, kas patiesībā nestrādā, izmetu lieko un uzbūvēju vienkāršāko spēcīgo risinājumu.',
    aboutCta: 'Kā es domāju',
    servicesCta: 'Ko es reāli daru',
    closeEyebrow: 'Pietiek ritināt. Tagad pie lietas.',
    closeTitle: ['Ir problēma,', 'ko vērts salabot?'],
    closeText: 'Pastāsti, kas nestrādā. Tev nav vajadzīgs noslīpēts tehniskais uzdevums vai funkciju saraksts.',
    closeCta: 'Sākt ar problēmu',
  },
} as const;

export const contactPageCopy = {
  en: {
    seoTitle: 'Contact — XO WEB',
    seoDescription: 'Start a website, redesign or digital project conversation with XO WEB by Victxr Lev. Begin with the business problem, not a pre-written solution.',
    eyebrow: 'Contact / 04',
    title: ['Tell me the', 'problem.', 'Not the solution.'],
    intro: 'You do not need to know whether you need a redesign, a new website or less website. That is part of the job.',
    chooseLabel: 'Where are you starting from?',
    options: [
      {
        id: 'zero',
        index: '01',
        title: 'I need a new website',
        text: 'There is no useful website yet, or the business has changed enough that the old foundation no longer helps.',
        subject: 'New website — starting from zero',
      },
      {
        id: 'fix',
        index: '02',
        title: 'Something is wrong',
        text: 'The current site may only need a focused diagnosis and targeted changes — not a full rebuild.',
        subject: 'Existing website — something is not working',
      },
      {
        id: 'redesign',
        index: '03',
        title: 'I need a redesign',
        text: 'The foundation still has value, but the structure, visual language or user path needs a coherent rethink.',
        subject: 'Website redesign — rethink what exists',
      },
      {
        id: 'unsure',
        index: '04',
        title: 'I’m not sure yet',
        text: 'You know the business problem, but not the right web solution. Good. That is enough to start.',
        subject: 'Website project — not sure about the solution yet',
      },
    ],
    selectedLabel: 'Selected starting point',
    emailCta: 'Write the short version',
    directLabel: 'Or go direct',
    expectation: 'Useful first message: what the business does, what is not working and what should change. Three sentences is enough.',
    note: 'No sales funnel. No discovery-call theatre. If I think you need less than you asked for, I will say it.',
  },
  lv: {
    seoTitle: 'Kontakti — XO WEB',
    seoDescription: 'Sāc sarunu par jaunu mājaslapu, pārveidi vai digitālu projektu ar XO WEB / Victxr Lev. Sāc ar biznesa problēmu, nevis gatavu risinājumu.',
    eyebrow: 'Kontakti / 04',
    title: ['Pastāsti par', 'problēmu.', 'Nevis risinājumu.'],
    intro: 'Tev nav iepriekš jāzina, vai vajag jaunu mājaslapu, pārveidi vai vienkāršāku risinājumu. To noskaidrosim, sākot ar problēmu.',
    chooseLabel: 'No kurienes sākam?',
    options: [
      {
        id: 'zero',
        index: '01',
        title: 'Vajag jaunu mājaslapu',
        text: 'Noderīgas mājaslapas vēl nav, vai arī bizness ir mainījies tik ļoti, ka vecais pamats vairs nepalīdz.',
        subject: 'Jauna mājaslapa — sākt no nulles',
      },
      {
        id: 'fix',
        index: '02',
        title: 'Kaut kas nestrādā',
        text: 'Iespējams, esošajai vietnei vajag precīzu diagnostiku un mērķētus labojumus, nevis pilnīgu pārbūvi.',
        subject: 'Esošā mājaslapa — kaut kas nestrādā',
      },
      {
        id: 'redesign',
        index: '03',
        title: 'Vajag pārveidi',
        text: 'Pamatā ir vērtība, bet struktūrai, vizuālajai valodai vai lietotāja ceļam vajag vienotu pārdomāšanu.',
        subject: 'Mājaslapas pārveide — pārdomāt esošo',
      },
      {
        id: 'unsure',
        index: '04',
        title: 'Vēl nezinu',
        text: 'Biznesa problēma ir skaidra, bet pareizais tīmekļa risinājums vēl nav zināms. Ar to pilnīgi pietiek, lai sāktu.',
        subject: 'Mājaslapas projekts — risinājums vēl nav skaidrs',
      },
    ],
    selectedLabel: 'Izvēlētais sākuma punkts',
    emailCta: 'Uzrakstīt īso versiju',
    directLabel: 'Vai sazinies uzreiz',
    expectation: 'Labs pirmais ziņojums: ko dara bizness, kas šobrīd nestrādā un kam būtu jāmainās. Pietiek ar trim teikumiem.',
    note: 'Bez pārdošanas piltuvēm un teatrālām iepazīšanās sarunām. Ja domāšu, ka tev vajag mazāk nekā prasīts, pateikšu.',
  },
} as const;

export function getHomeV2Copy(locale: Locale) {
  return homeV2Copy[locale];
}

export function getContactPageCopy(locale: Locale) {
  return contactPageCopy[locale];
}
