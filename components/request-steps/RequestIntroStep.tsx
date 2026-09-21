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
    <div className="form-shell">
      <p className="mb-8 text-sm font-medium text-muted">{t('request', 'intro')}</p>

      <div className="glass p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="icon-circle icon-circle-orange h-12 w-12 text-lg font-bold">
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
