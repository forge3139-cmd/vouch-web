import Link from 'next/link'
import { useT } from '@/components/LanguageContext'

/** Two glass cards — the quick way into the two things a signed-in
 * worker actually wants to do next. An ice-blue chevron is the only
 * colour accent; the card itself is the same translucent glass as
 * everything else on the page. */
export default function QuickActionsRow() {
  const t = useT()

  return (
    <div className="flex flex-col gap-4">
      <Link href="/jobs" className="glass tap flex items-center justify-between gap-3 p-4 text-white">
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-extrabold">{t('dashboard', 'actionFindJobs')}</span>
          <span className="mt-0.5 block text-xs font-medium text-white/60">{t('dashboard', 'actionFindJobsBody')}</span>
        </span>
        <ChevronCircle />
      </Link>

      <Link href="/request" className="glass tap flex items-center justify-between gap-3 p-4 text-white">
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-extrabold">{t('dashboard', 'actionPostRequest')}</span>
          <span className="mt-0.5 block text-xs font-medium text-white/60">{t('dashboard', 'actionPostRequestBody')}</span>
        </span>
        <ChevronCircle />
      </Link>
    </div>
  )
}

function ChevronCircle() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange/15 text-orange" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  )
}
