import { useT } from '@/components/LanguageContext'
import type { WeeklyActivityDay } from '@/lib/weeklyActivity'

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

  return (
    <section className="glass p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-extrabold text-ink">{t('dashboard', 'weekActivity')}</h2>
        <span
          className={`rounded-pill px-2.5 py-1 text-xs font-bold ${
            diff > 0 ? 'bg-dash-teal/25 text-dash-teal-ink' : diff < 0 ? 'bg-card-border text-muted' : 'bg-card-border text-muted'
          }`}
        >
          {comparison}
        </span>
      </div>

      <div className="mt-6 flex items-end gap-2.5 sm:gap-3.5" style={{ height: '120px' }}>
        {days.map((day, i) => {
          const heightPct = Math.max((day.count / max) * 100, 4)
          const isPeak = hasPeak && i === peakIndex
          const label = new Date(`${day.date}T00:00:00Z`).toLocaleDateString(dateLocale, { weekday: 'short', timeZone: 'Africa/Dar_es_Salaam' })
          return (
            <div key={day.date} className="relative flex flex-1 flex-col items-center gap-2">
              {isPeak && (
                <div className="absolute -top-7 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[10.5px] font-bold text-white">
                  {t('dashboard', 'sentCount', { count: day.count })}
                </div>
              )}
              <div
                className={`w-full max-w-7 rounded-t-lg rounded-b-sm ${isPeak ? 'bg-dash-teal' : 'bg-card-border'}`}
                style={{ height: `${heightPct}%` }}
              />
              <span className={`text-[11px] font-semibold ${isPeak ? 'text-ink' : 'text-muted'}`}>{label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
