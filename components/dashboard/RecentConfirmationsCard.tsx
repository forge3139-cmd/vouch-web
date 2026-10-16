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
    .slice(0, 3)

  return (
    <section className="glass p-5">
      <h2 className="text-[14px] font-extrabold text-ink">{t('dashboard', 'recentConfirmations')}</h2>

      {recent.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t('dashboard', 'recentConfirmationsEmpty')}</p>
      ) : (
        <div className="mt-3.5 flex flex-col gap-3">
          {recent.map((work, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <svg
                viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-dash-teal-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true" className="mt-0.5 shrink-0"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-ink">
                  {work.title}
                  {work.confirmer_name && <span className="text-muted"> — {t('dashboard', 'confirmedBy', { name: work.confirmer_name })}</span>}
                </p>
                {work.confirmed_at && <p className="mt-0.5 text-[11px] text-muted">{fmt(work.confirmed_at)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
