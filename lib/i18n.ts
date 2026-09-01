export type Lang = 'en' | 'sw'

export const dictionaries = {
  en: {
    language: {
      english: 'English',
      kiswahili: 'Kiswahili',
    },
    ask: {
      pitch: 'VOUCH helps people prove the work they’ve actually done.',
      askedBy: '{name} is asking you to confirm some work.',
      theyClaim: 'They say:',
      timeEstimate: 'About 30 seconds.',
      seeMore: 'See more',
      seeLess: 'See less',
      trade: 'Trade',
      area: 'Area',
      onVouchSince: 'On VOUCH since {year}',
      recentConfirmed: 'Already confirmed by others',
      confirm: 'Yes, I can confirm this',
      decline: "I don't recognise this",
    },
    questions: {
      didHappenTitle: 'Did this work happen?',
      yes: 'Yes',
      no: 'No',
      whatTitle: 'What did they do?',
      whenTitle: 'When?',
      completedTitle: 'Was it completed?',
      completedYes: 'Yes, fully',
      completedPartly: 'Partly',
      ratingTitle: 'How was the work?',
      workAgainTitle: 'Would you work with them again?',
      workAgainYes: 'Yes',
      workAgainMaybe: 'Maybe',
      workAgainNo: 'No',
      photoTitle: 'Add a photo',
      photoOptional: 'Optional',
      photoHint: 'A photo of the finished work, if you have one.',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      submitting: 'Submitting...',
    },
    success: {
      title: 'Verification complete.',
      subtitle: '{name}’s verified record has been updated thanks to your vouch.',
      trustedNetwork: 'YOUR TRUSTED NETWORK',
      relationship: '{count} verified relationship established',
      relationships: '{count} verified relationships established',
      findPeople: 'Find verified people near you',
      createProfile: 'Create your own VOUCH profile',
    },
    decline: {
      title: "No problem — thanks for saying so.",
      body: "This doesn't accuse anyone of anything. It just tells us to look into it.",
      reasonLabel: 'Anything you want to add? (optional)',
      submit: 'Send',
      submitting: 'Sending...',
    },
    invalid: {
      title: 'This link isn’t valid.',
      body: 'Double check the link, or ask the person who sent it for a new one.',
    },
    expired: {
      title: 'This link has expired.',
      body: 'Confirmation links only work for 7 days. Ask the person who sent it for a new one.',
    },
    alreadyDone: {
      title: 'Already confirmed',
      body: 'You confirmed this on {date}.',
    },
    error: {
      generic: 'Something went wrong. Please try again.',
    },
  },
  sw: {
    language: {
      english: 'English',
      kiswahili: 'Kiswahili',
    },
    ask: {
      pitch: 'VOUCH husaidia watu kuthibitisha kazi waliyoifanya.',
      askedBy: '{name} anakuomba uthibitishe kazi fulani.',
      theyClaim: 'Wanasema:',
      timeEstimate: 'Takriban sekunde 30.',
      seeMore: 'Ona zaidi',
      seeLess: 'Ficha',
      trade: 'Ufundi',
      area: 'Eneo',
      onVouchSince: 'Kwenye VOUCH tangu {year}',
      recentConfirmed: 'Tayari amethibitishiwa na wengine',
      confirm: 'Ndiyo, naweza kuthibitisha hili',
      decline: 'Simfahamu huyu / sikumbuki hili',
    },
    questions: {
      didHappenTitle: 'Je, kazi hii ilifanyika?',
      yes: 'Ndiyo',
      no: 'Hapana',
      whatTitle: 'Walifanya nini?',
      whenTitle: 'Lini?',
      completedTitle: 'Je, ilikamilika?',
      completedYes: 'Ndiyo, kabisa',
      completedPartly: 'Kiasi',
      ratingTitle: 'Kazi ilikuwaje?',
      workAgainTitle: 'Ungependa kufanya nao kazi tena?',
      workAgainYes: 'Ndiyo',
      workAgainMaybe: 'Labda',
      workAgainNo: 'Hapana',
      photoTitle: 'Ongeza picha',
      photoOptional: 'Si lazima',
      photoHint: 'Picha ya kazi iliyokamilika, kama unayo.',
      back: 'Rudi',
      next: 'Endelea',
      submit: 'Tuma',
      submitting: 'Inatuma...',
    },
    success: {
      title: 'Uthibitisho umekamilika.',
      subtitle: 'Rekodi ya {name} iliyothibitishwa imesasishwa kwa sababu ya uthibitisho wako.',
      trustedNetwork: 'MTANDAO WAKO WA UAMINIFU',
      relationship: 'Uhusiano {count} ulioidhinishwa umeanzishwa',
      relationships: 'Mahusiano {count} yaliyoidhinishwa yameanzishwa',
      findPeople: 'Tafuta watu walioidhinishwa karibu nawe',
      createProfile: 'Tengeneza wasifu wako wa VOUCH',
    },
    decline: {
      title: 'Hakuna shida — asante kwa kutuambia.',
      body: 'Hili halimshtaki mtu yeyote. Linatusaidia tu kuchunguza.',
      reasonLabel: 'Kuna kitu ungependa kuongeza? (si lazima)',
      submit: 'Tuma',
      submitting: 'Inatuma...',
    },
    invalid: {
      title: 'Kiungo hiki si sahihi.',
      body: 'Angalia kiungo tena, au muombe aliyekutumia akutumie kingine.',
    },
    expired: {
      title: 'Kiungo hiki kimeisha muda wake.',
      body: 'Viungo vya uthibitisho hufanya kazi kwa siku 7 tu. Muombe aliyekutumia akutumie kingine.',
    },
    alreadyDone: {
      title: 'Tayari umethibitisha',
      body: 'Ulithibitisha hili tarehe {date}.',
    },
    error: {
      generic: 'Hitilafu imetokea. Tafadhali jaribu tena.',
    },
  },
} as const

type Dictionary = typeof dictionaries.en

export function t<S extends keyof Dictionary, K extends keyof Dictionary[S]>(
  lang: Lang,
  section: S,
  key: K,
  vars?: Record<string, string | number>
): string {
  const section_: Record<string, string> = dictionaries[lang][section]
  const raw = section_[key as string]
  if (!vars) return raw
  return Object.entries(vars).reduce(
    (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
    raw
  )
}
