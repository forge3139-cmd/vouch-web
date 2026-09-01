'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { dictionaries, t as translate, type Lang } from '@/lib/i18n'

type Dictionary = typeof dictionaries.en

const LanguageContext = createContext<{
  lang: Lang
  setLang: (lang: Lang) => void
} | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  const value = useMemo(() => ({ lang, setLang }), [lang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

export function useT() {
  const { lang } = useLanguage()
  return <S extends keyof Dictionary, K extends keyof Dictionary[S]>(
    section: S,
    key: K,
    vars?: Record<string, string | number>
  ) => translate(lang, section, key, vars)
}
