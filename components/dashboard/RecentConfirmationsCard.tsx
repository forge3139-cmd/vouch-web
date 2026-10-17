import { useT } from '@/components/LanguageContext'
import type { PassportConfirmedWork } from '@/lib/passport'

export default function RecentConfirmationsCard({
  confirmedWork,
  fmt,
}: {
  confirmedWork: PassportConfirmedWork[]
  fmt: (iso: string) => string
}) {
  const t = useT()

  const recent = [...confirmedWork]
    .filter((w) => w.confirmed_at)
    .sort((a, b) => (b.confirmed_at as string).localeCompare(a.confirmed_at as string))
    .slice(0, 4)

  return (
    <section className="glass p-5">
      <h2 className="text-[14px] font-extrabold text-ink">{t('dashboard', 'recentConfirmations')}</h2>

      {recent.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t('dashboard', 'recentConfirmationsEmpty')}</p>
      ) : (
        <ul className="mt-3.5 flex flex-col gap-3.5">
          {recent.map((work, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange/30 text-xs font-extrabold text-ink">
                {(work.confirmer_name ?? '?').charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-bold text-ink">{work.confirmer_name ?? work.title}</span>
                <span className="block truncate text-[11px] text-muted">{work.title}</span>
              </span>
              {work.confirmed_at && <span className="shrink-0 text-[11px] text-muted">{fmt(work.confirmed_at)}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
