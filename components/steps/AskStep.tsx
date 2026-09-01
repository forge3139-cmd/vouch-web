'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/components/LanguageContext'
import Button from '@/components/ui/Button'
import { logStep } from '@/lib/actions'
import type { ConfirmationBundle } from '@/lib/types'

export default function AskStep({
  bundle,
  onConfirm,
  onDecline,
}: {
  bundle: ConfirmationBundle
  onConfirm: () => void
  onDecline: () => void
}) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const { worker, record, confirmedSamples, confirmedCount } = bundle

  useEffect(() => {
    logStep(bundle.link.token, 'ask')
  }, [bundle.link.token])

  const joinedYear = worker.created_at ? new Date(worker.created_at).getFullYear() : null
  const claim = record.title || record.role_title || record.description || ''

  return (
    <div className="flex min-h-dvh flex-col px-6 py-10">
      <p className="mb-8 text-sm font-medium text-muted">{t('ask', 'pitch')}</p>

      <div className="rounded-2xl border border-card-border bg-white p-5">
        <p className="text-lg font-bold text-ink">
          {t('ask', 'askedBy', { name: worker.display_name })}
        </p>

        <p className="mt-4 text-xs font-bold tracking-wide text-muted uppercase">
          {t('ask', 'theyClaim')}
        </p>
        <p className="mt-1 text-base font-semibold text-ink">{claim}</p>
        {record.description && record.description !== claim && (
          <p className="mt-1 text-sm text-muted">{record.description}</p>
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 text-sm font-bold text-orange"
        >
          {expanded ? t('ask', 'seeLess') : t('ask', 'seeMore')}
        </button>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-card-border pt-4">
            {worker.headline && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t('ask', 'trade')}</span>
                <span className="font-semibold text-ink">{worker.headline}</span>
              </div>
            )}
            {worker.location && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t('ask', 'area')}</span>
                <span className="font-semibold text-ink">{worker.location}</span>
              </div>
            )}
            {joinedYear && (
              <p className="text-sm text-muted">
                {t('ask', 'onVouchSince', { year: joinedYear })}
              </p>
            )}
            {confirmedCount > 0 && (
              <div>
                <p className="text-sm text-muted">{t('ask', 'recentConfirmed')}</p>
                <ul className="mt-2 space-y-1">
                  {confirmedSamples.map((sample) => (
                    <li key={sample.id} className="text-sm font-semibold text-ink">
                      {sample.title || sample.role_title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-muted">{t('ask', 'timeEstimate')}</p>

      <div className="mt-auto flex flex-col gap-3 pt-10">
        <Button variant="primary" onClick={onConfirm}>
          {t('ask', 'confirm')}
        </Button>
        <button
          type="button"
          onClick={onDecline}
          className="w-full rounded-2xl py-4 text-sm font-semibold text-muted"
        >
          {t('ask', 'decline')}
        </button>
      </div>
    </div>
  )
}
