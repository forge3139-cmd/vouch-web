'use client'

import Link from 'next/link'
import { useT } from '@/components/LanguageContext'
import type { PublicJob } from '@/lib/hiring'

export default function ApplicationSent({ job }: { job: PublicJob }) {
  const t = useT()

  return (
    <div className="form-shell justify-center text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-tint">
        <span className="text-2xl font-bold text-green">✓</span>
      </div>
      <h1 className="text-2xl font-extrabold text-ink">{t('job', 'sentTitle')}</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
        {t('job', 'sentBody', { company: job.company_name, title: job.title })}
      </p>

      <div className="glass mt-8 p-card text-left">
        <p className="text-sm text-ink">{t('job', 'sentSaveHint')}</p>
        <Link href="/applications" className="btn btn-dark tap mt-4 w-full py-4 text-base">
          {t('job', 'checkStatus')}
        </Link>
      </div>
    </div>
  )
}
