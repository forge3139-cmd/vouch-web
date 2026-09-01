'use client'

import { useLanguage, useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
import type { Lang } from '@/lib/i18n'

export default function LanguageStep({ onChosen }: { onChosen: (lang: Lang) => void }) {
  const { setLang } = useLanguage()
  const t = useT()

  const choose = (lang: Lang) => {
    setLang(lang)
    onChosen(lang)
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-16">
      <h1 className="mb-16 text-3xl font-extrabold tracking-tight text-ink">VOUCH</h1>

      <div className="flex flex-col gap-3">
        <Button variant="primary" onClick={() => choose('en')}>
          {t('language', 'english')}
        </Button>
        <Button variant="light" onClick={() => choose('sw')}>
          {t('language', 'kiswahili')}
        </Button>
      </div>
    </div>
  )
}
