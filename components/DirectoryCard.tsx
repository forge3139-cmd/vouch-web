import Link from 'next/link'
import { useT } from '@/components/LanguageContext'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import type { DirectoryEntry } from '@/lib/directory'

const AVATAR_TINTS = ['bg-dash-navy-mid text-dash-navy', 'bg-dash-peach text-[#7a4a1f]', 'bg-orange/55 text-ink']

export default function DirectoryCard({ entry, index = 0 }: { entry: DirectoryEntry; index?: number }) {
  const { worker, evidence } = entry
  const t = useT()
  const ref = useScrollReveal<HTMLDivElement>(index)

  const initial = worker.display_name.charAt(0).toUpperCase()
  const tint = AVATAR_TINTS[[...worker.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TINTS.length]
  const subtitle = [worker.headline, worker.location].filter(Boolean).join(' · ')
  const recordsConfirmed = evidence?.records_confirmed ?? 0
  const distinctConfirmers = evidence?.distinct_confirmers ?? 0
  const repeatClients = evidence?.repeat_clients ?? 0
  const isActive = recordsConfirmed > 0

  return (
    <div ref={ref} className="reveal-on-scroll glass-solid flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${tint}`}>
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold text-ink">{worker.display_name}</p>
            {!!subtitle && <p className="truncate text-xs font-medium text-muted">{subtitle}</p>}
          </div>
        </div>
        {isActive && (
          <span className="shrink-0 rounded-pill bg-orange px-2.5 py-1 text-[11px] font-bold text-ink">
            {t('directory', 'activeBadge')}
          </span>
        )}
      </div>

      <div className="mt-3 flex-1">
        {isActive ? (
          <p className="text-[13px] leading-relaxed text-muted">
            {t('directory', 'evidenceCount', { records: recordsConfirmed, confirmers: distinctConfirmers })}
            {repeatClients > 0 && (
              <>
                {', '}
                <span className="font-bold text-ink">{t('directory', 'hiredAgain', { count: repeatClients })}</span>
              </>
            )}
          </p>
        ) : (
          <p className="text-[13px] font-semibold text-blue">{t('directory', 'newOnVouch')}</p>
        )}
      </div>

      <Link href={`/w/${worker.slug}`} className="link-hover tap mt-3 inline-flex items-center gap-1 text-sm font-extrabold text-ink">
        {t('directory', 'viewRecord')} <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}
