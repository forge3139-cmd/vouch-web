'use client'

import { useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
import type { IdentityEvidenceRow, IdentityRow } from '@/lib/types'

export default function RequestIntroStep({
  worker,
  evidence,
  onStart,
}: {
  worker: IdentityRow
  evidence: IdentityEvidenceRow | null
  onStart: () => void
}) {
  const t = useT()
  const initial = worker.display_name.charAt(0).toUpperCase()
  const hasEvidence = !!evidence && evidence.records_confirmed > 0

  return (
    <div className="flex min-h-dvh flex-col px-6 py-10">
      <p className="mb-8 text-sm font-medium text-muted">{t('request', 'intro')}</p>

      <div className="rounded-2xl border border-card-border bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card-border text-lg font-bold text-ink">
            {initial}
          </div>
          <div>
            <p className="text-lg font-bold text-ink">{worker.display_name}</p>
            <p className="text-sm text-muted">
              {[worker.headline, worker.location].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-card-border pt-4">
          <p className="text-sm font-semibold text-ink">
            {hasEvidence
              ? t('request', 'evidenceCount', {
                  records: evidence!.records_confirmed,
                  confirmers: evidence!.distinct_confirmers,
                })
              : t('request', 'evidenceNone')}
          </p>
        </div>
      </div>

      <div className="mt-auto pt-10">
        <Button type="button" variant="primary" onClick={onStart}>
          {t('request', 'requestWork')}
        </Button>
      </div>
    </div>
  )
}
