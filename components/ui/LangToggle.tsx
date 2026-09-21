'use client'

import { useLanguage } from '@/components/LanguageContext'

export default function LangToggle() {
  const { lang, setLang } = useLanguage()
  return (
    <div className="pill p-0.5 text-xs font-bold">
      {(['en', 'sw'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`tap rounded-pill px-3.5 py-1.5 ${lang === code ? 'bg-ink text-white' : 'text-muted'}`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
