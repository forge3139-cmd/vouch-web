'use client'

import Link from 'next/link'
import { useT } from '@/components/LanguageContext'
import type { IdentityRow } from '@/lib/types'

export default function SuccessStep({
  worker,
  confirmedCount,
}: {
  worker: IdentityRow
  confirmedCount: number
}) {
  const t = useT()
  const initial = worker.display_name.charAt(0).toUpperCase()

  return (
    <div className="form-shell">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-tint">
        <span className="text-2xl font-bold text-green">✓</span>
      </div>

      <h1 className="text-2xl font-extrabold text-ink">{t('success', 'title')}</h1>
      <p className="mt-2 text-sm text-muted">
        {t('success', 'subtitle', { name: worker.display_name })}
      </p>

      <div className="mt-8 glass overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <p className="text-[11px] font-bold tracking-wide text-muted">
            {t('success', 'trustedNetwork')}
          </p>
          <p className="mt-1 text-sm font-bold text-ink">
            {confirmedCount === 1
              ? t('success', 'relationship', { count: confirmedCount })
              : t('success', 'relationships', { count: confirmedCount })}
          </p>
        </div>
        <div className="flex items-center gap-3 border-t border-card-border bg-white/60 px-4 py-4">
          <div className="icon-circle icon-circle-orange h-10 w-10 text-sm font-bold">
            {initial}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">{worker.display_name}</p>
            <p className="text-xs text-muted">
              {[worker.headline, worker.location].filter(Boolean).join(' · ')}
            </p>
          </div>
          <span className="text-muted">›</span>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-10">
        <Link
          href="/discover"
          className="btn btn-dark tap w-full py-4 text-sm"
        >
          {t('success', 'findPeople')}
        </Link>
        <Link
          href="/join"
          className="btn btn-glass tap w-full py-4 text-sm"
        >
          {t('success', 'createProfile')}
        </Link>
      </div>
    </div>
  )
}
