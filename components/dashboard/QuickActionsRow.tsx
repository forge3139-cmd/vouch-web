import Link from 'next/link'
import { useT } from '@/components/LanguageContext'

/** Glass cards, like every other dashboard card — the red/navy chevron
 * circle is the one solid-coloured "interactive target" each card is
 * built around, not the card's own background. */
export default function QuickActionsRow() {
  const t = useT()

  return (
    <div className="flex flex-col gap-4">
      <Link href="/jobs" className="tap glass flex items-center justify-between gap-3 p-4">
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-extrabold text-ink">{t('dashboard', 'actionFindJobs')}</span>
          <span className="mt-0.5 block text-xs font-medium text-muted">{t('dashboard', 'actionFindJobsBody')}</span>
        </span>
        <ChevronCircle tone="red" />
      </Link>

      <Link href="/request" className="tap glass flex items-center justify-between gap-3 p-4">
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-extrabold text-ink">{t('dashboard', 'actionPostRequest')}</span>
          <span className="mt-0.5 block text-xs font-medium text-muted">{t('dashboard', 'actionPostRequestBody')}</span>
        </span>
        <ChevronCircle tone="navy" />
      </Link>
    </div>
  )
}

function ChevronCircle({ tone }: { tone: 'red' | 'navy' }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${tone === 'red' ? 'bg-dash-red' : 'bg-dash-navy'}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  )
}
