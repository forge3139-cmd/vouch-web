'use client'

import Link from 'next/link'
import { useCallback, useSyncExternalStore } from 'react'
import { useT } from '@/components/LanguageContext'
import type { DirectoryEntry } from '@/lib/directory'
import { isWorkerSaved, subscribeSavedWorkers, toggleWorkerSaved } from '@/lib/savedWorkers'

export default function DirectoryCard({ entry }: { entry: DirectoryEntry }) {
  const { worker, evidence } = entry
  const t = useT()
  const saved = useSyncExternalStore(
    subscribeSavedWorkers,
    useCallback(() => isWorkerSaved(worker.id), [worker.id]),
    () => false
  )

  const initial = worker.display_name.charAt(0).toUpperCase()
  const subtitle = [worker.headline, worker.location].filter(Boolean).join(' · ')
  const recordsConfirmed = evidence?.records_confirmed ?? 0
  const repeatClients = evidence?.repeat_clients ?? 0

  return (
    <div className="rounded-2xl border border-card-border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-card-border text-lg font-bold text-ink">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-bold text-ink">{worker.display_name}</p>
            <button
              type="button"
              onClick={() => toggleWorkerSaved(worker.id)}
              aria-label={saved ? t('directory', 'saved') : t('directory', 'save')}
              aria-pressed={saved}
              className="shrink-0 text-muted"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill={saved ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
                className={saved ? 'text-orange' : 'text-faint'}
              >
                <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1z" />
              </svg>
            </button>
          </div>
          {!!subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}

          {recordsConfirmed > 0 ? (
            <div className="mt-1.5">
              <p className="text-xs font-semibold text-ink">
                {t('directory', 'evidenceCount', {
                  records: recordsConfirmed,
                  confirmers: evidence?.distinct_confirmers ?? 0,
                })}
              </p>
              {repeatClients > 0 && (
                <p className="mt-0.5 text-xs font-semibold text-green">
                  {t('directory', repeatClients === 1 ? 'repeatClient' : 'repeatClients', { count: repeatClients })}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-muted">{t('directory', 'newOnVouch')}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Link
          href={`/w/${worker.slug}`}
          className="rounded-full border border-card-border bg-cream px-4 py-1.5 text-xs font-bold text-ink active:opacity-70"
        >
          {t('directory', 'view')}
        </Link>
      </div>
    </div>
  )
}
