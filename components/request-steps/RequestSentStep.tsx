'use client'

import { useT } from '@/components/LanguageContext'

export default function RequestSentStep({ workerName }: { workerName: string }) {
  const t = useT()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-tint">
        <span className="text-2xl font-bold text-green">✓</span>
      </div>
      <h1 className="text-xl font-extrabold text-ink">{t('request', 'sentTitle')}</h1>
      <p className="mt-3 max-w-sm text-sm text-muted">
        {t('request', 'sentBody', { name: workerName })}
      </p>
    </div>
  )
}
