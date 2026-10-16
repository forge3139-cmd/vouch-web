import { useT } from '@/components/LanguageContext'
import { STATUS_LABEL_KEYS, STATUS_STEPS } from '@/lib/hiring'
import type { MyApplication } from '@/lib/myApplications'

/**
 * A quick-glance strip — percentage is just this application's position in
 * STATUS_STEPS, the same five stages ApplicationTimeline draws below in
 * full. Only applications still in progress show here; "Your applications"
 * further down has every application, including finished ones, with the
 * complete accessible timeline and the withdraw/access controls this strip
 * deliberately leaves out.
 */
export default function ActiveApplicationsStrip({ items }: { items: MyApplication[] }) {
  const t = useT()
  if (items.length === 0) return null

  return (
    <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      {items.slice(0, 3).map((item) => {
        const stepIndex = STATUS_STEPS.indexOf(item.status)
        const pct = Math.round((stepIndex / (STATUS_STEPS.length - 1)) * 100)
        return (
          <a key={item.id} href={`#app-${item.id}`} className="tap glass flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-xs font-extrabold text-white">
                {item.companyName.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold text-ink">{item.jobTitle}</span>
                <span className="block truncate text-[11px] text-muted">{item.companyName}</span>
              </span>
            </div>
            <div>
              <div className="h-1.5 w-full overflow-hidden rounded-pill bg-card-border">
                <div className="h-full rounded-pill bg-dash-teal" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] font-semibold text-dash-teal-ink">{t('applied', STATUS_LABEL_KEYS[item.status])}</p>
            </div>
          </a>
        )
      })}
    </div>
  )
}
