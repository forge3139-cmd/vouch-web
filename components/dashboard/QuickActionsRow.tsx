import Link from 'next/link'
import { useT } from '@/components/LanguageContext'

export default function QuickActionsRow() {
  const t = useT()

  return (
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Link
        href="/jobs"
        className="tap flex items-center justify-between rounded-[var(--radius-card)] bg-dash-mint p-5 text-[#10231e]"
      >
        <span>
          <span className="block text-[15px] font-extrabold">{t('dashboard', 'actionFindJobs')}</span>
          <span className="mt-0.5 block text-xs font-medium text-[#10231e]/70">{t('dashboard', 'actionFindJobsBody')}</span>
        </span>
        <ChevronCircle />
      </Link>

      <Link
        href="/request"
        className="tap flex items-center justify-between rounded-[var(--radius-card)] bg-dash-emerald p-5 text-[#0f2a1f]"
      >
        <span>
          <span className="block text-[15px] font-extrabold">{t('dashboard', 'actionPostRequest')}</span>
          <span className="mt-0.5 block text-xs font-medium text-[#0f2a1f]/70">{t('dashboard', 'actionPostRequestBody')}</span>
        </span>
        <ChevronCircle />
      </Link>
    </div>
  )
}

function ChevronCircle() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/50" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  )
}
