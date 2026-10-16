import Link from 'next/link'
import { useT } from '@/components/LanguageContext'

/** Two bold solid cards — red and peach — the quick way into the two
 * things a signed-in worker actually wants to do next. */
export default function QuickActionsRow() {
  const t = useT()

  return (
    <div className="flex flex-col gap-4">
      <Link href="/jobs" className="tap flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-dash-red p-4 text-white">
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-extrabold">{t('dashboard', 'actionFindJobs')}</span>
          <span className="mt-0.5 block text-xs font-medium text-white/80">{t('dashboard', 'actionFindJobsBody')}</span>
        </span>
        <ChevronCircle />
      </Link>

      <Link href="/request" className="tap flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-dash-peach p-4 text-[#3a1d14]">
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-extrabold">{t('dashboard', 'actionPostRequest')}</span>
          <span className="mt-0.5 block text-xs font-medium text-[#3a1d14]/75">{t('dashboard', 'actionPostRequestBody')}</span>
        </span>
        <ChevronCircle dark />
      </Link>
    </div>
  )
}

function ChevronCircle({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-[#3a1d14]/12 text-[#3a1d14]' : 'bg-white/20 text-white'}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  )
}
