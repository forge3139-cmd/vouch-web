import Link from 'next/link'
import { useT } from '@/components/LanguageContext'

/** Two flat white cards — the quick way into the two things a signed-in
 * worker actually wants to do next. A teal chevron is the only colour
 * accent; the card itself is the same plain white as everything else
 * on the page. */
export default function QuickActionsRow() {
  const t = useT()

  return (
    <div className="flex flex-col gap-4">
      <Link href="/jobs" className="tap flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-dash-peach/60 p-4 text-ink">
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-extrabold">{t('dashboard', 'actionFindJobs')}</span>
          <span className="mt-0.5 block text-xs font-medium text-ink/60">{t('dashboard', 'actionFindJobsBody')}</span>
        </span>
        <ChevronCircle />
      </Link>

      <Link href="/request" className="tap flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-dash-navy-light p-4 text-ink">
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-extrabold">{t('dashboard', 'actionPostRequest')}</span>
          <span className="mt-0.5 block text-xs font-medium text-ink/60">{t('dashboard', 'actionPostRequestBody')}</span>
        </span>
        <ChevronCircle />
      </Link>
    </div>
  )
}

function ChevronCircle() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-light text-blue" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  )
}
