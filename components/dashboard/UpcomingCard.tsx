import Link from 'next/link'
import { useT } from '@/components/LanguageContext'
import type { MyApplication } from '@/lib/myApplications'
import type { PendingAssessment } from '@/lib/assessments'

/**
 * Only things that are genuinely true right now — no invented times.
 * VOUCH doesn't store a scheduled interview date anywhere, so this never
 * claims one; it shows WHAT needs attention (an assessment waiting, an
 * application at the interviewing stage), not a false "2:00 PM".
 */
export default function UpcomingCard({
  pendingAssessments,
  interviewing,
}: {
  pendingAssessments: PendingAssessment[]
  interviewing: MyApplication[]
}) {
  const t = useT()
  const isEmpty = pendingAssessments.length === 0 && interviewing.length === 0

  return (
    <section className="glass p-5">
      <h2 className="text-[14px] font-extrabold text-ink">{t('dashboard', 'upcoming')}</h2>

      {isEmpty ? (
        <p className="mt-3 text-sm text-muted">{t('dashboard', 'upcomingEmpty')}</p>
      ) : (
        <div className="mt-3.5 flex flex-col gap-2.5">
          {pendingAssessments.map((a) => (
            <Link
              key={a.applicationId}
              href={`/applications/assessment/${a.applicationId}`}
              className="tap flex items-center gap-3 rounded-2xl bg-white/8 p-2.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-dash-navy/12">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--dash-navy)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M9 15h6" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-bold text-ink">{t('dashboard', 'assessmentPending')}</span>
                <span className="block truncate text-[11px] text-muted">
                  {a.jobTitle} · {a.companyName}
                </span>
              </span>
            </Link>
          ))}

          {interviewing.map((item) => (
            <a key={item.id} href={`#app-${item.id}`} className="tap flex items-center gap-3 rounded-2xl bg-white/8 p-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-dash-red/12">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--dash-red)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                  <circle cx="10" cy="7" r="4" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-bold text-ink">{t('dashboard', 'interviewingLabel')}</span>
                <span className="block truncate text-[11px] text-muted">
                  {item.jobTitle} · {item.companyName}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
