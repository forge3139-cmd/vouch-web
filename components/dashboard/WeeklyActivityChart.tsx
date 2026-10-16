import { useT } from '@/components/LanguageContext'
import type { WeeklyActivityDay } from '@/lib/weeklyActivity'

/** The dashboard's focal card — a solid navy fill, white chart on top,
 * the one bold-red bar marking the week's busiest day. Real weekly
 * application counts, never a fabricated trend line — the three footer
 * numbers are the same `days` array summarised three ways, not three
 * separate data sources. */
export default function WeeklyActivityChart({
  days,
  total,
  previousTotal,
  dateLocale,
}: {
  days: WeeklyActivityDay[]
  total: number
  previousTotal: number
  dateLocale: string
}) {
  const t = useT()
  const diff = total - previousTotal
  const comparison =
    diff > 0
      ? t('dashboard', 'weekActivityMore', { count: diff })
      : diff < 0
        ? t('dashboard', 'weekActivityFewer', { count: Math.abs(diff) })
        : t('dashboard', 'weekActivitySame')

  const max = Math.max(...days.map((d) => d.count), 1)
  const peakIndex = days.reduce((best, d, i) => (d.count > days[best].count ? i : best), 0)
  const hasPeak = days[peakIndex].count > 0
  const peakLabel = hasPeak
    ? new Date(`${days[peakIndex].date}T00:00:00Z`).toLocaleDateString(dateLocale, { weekday: 'short', timeZone: 'Africa/Dar_es_Salaam' })
    : '—'

  return (
    <section className="rounded-[var(--radius-hero)] bg-dash-navy p-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-extrabold">{t('dashboard', 'weekActivity')}</h2>
        <span className="rounded-pill bg-white/15 px-2.5 py-1 text-xs font-bold">{comparison}</span>
      </div>

      <div className="mt-7 flex items-end gap-2.5 sm:gap-4" style={{ height: '120px' }}>
        {days.map((day, i) => {
          const heightPct = Math.max((day.count / max) * 100, 5)
          const isPeak = hasPeak && i === peakIndex
          const label = new Date(`${day.date}T00:00:00Z`).toLocaleDateString(dateLocale, { weekday: 'short', timeZone: 'Africa/Dar_es_Salaam' })
          return (
            <div key={day.date} className="relative flex flex-1 flex-col items-center gap-2">
              {isPeak && (
                <div className="absolute -top-7 whitespace-nowrap rounded-lg bg-dash-red px-2 py-1 text-[10.5px] font-bold text-white">
                  {t('dashboard', 'sentCount', { count: day.count })}
                </div>
              )}
              <div
                className={`w-full max-w-7 rounded-t-lg rounded-b-sm ${isPeak ? 'bg-dash-red' : 'bg-white/20'}`}
                style={{ height: `${heightPct}%` }}
              />
              <span className={`text-[11px] font-semibold ${isPeak ? 'text-white' : 'text-white/60'}`}>{label}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex items-center gap-6 border-t border-white/15 pt-4">
        <div>
          <p className="text-lg font-extrabold leading-none">{total}</p>
          <p className="mt-1 text-[11px] font-semibold text-white/65">{t('dashboard', 'weekActivity')}</p>
        </div>
        <div>
          <p className="text-lg font-extrabold leading-none">{peakLabel}</p>
          <p className="mt-1 text-[11px] font-semibold text-white/65">{t('dashboard', 'peakDay')}</p>
        </div>
        <div>
          <p className="text-lg font-extrabold leading-none">{previousTotal}</p>
          <p className="mt-1 text-[11px] font-semibold text-white/65">{t('dashboard', 'lastWeek')}</p>
        </div>
      </div>
    </section>
  )
}
