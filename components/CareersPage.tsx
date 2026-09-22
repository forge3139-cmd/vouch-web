'use client'

import Link from 'next/link'
import { LanguageProvider, useT } from '@/components/LanguageContext'
import LangToggle from '@/components/ui/LangToggle'
import { EMPLOYMENT_LABEL_KEYS, formatSalary, type PublicJob } from '@/lib/hiring'
import type { CareersPoster } from '@/lib/jobs'

const ACCENTS = ['orange', 'blue', 'green'] as const

/**
 * Every open job from one poster, at their existing /w/{slug}. A permanent
 * link — it's a live query (see loadCareersJobs), so it reflects whatever
 * they've posted or closed since anyone last opened it. No open jobs is a
 * normal state here, not an error.
 */
export default function CareersPage({ poster, jobs }: { poster: CareersPoster; jobs: PublicJob[] }) {
  return (
    <LanguageProvider>
      <CareersInner poster={poster} jobs={jobs} />
    </LanguageProvider>
  )
}

function CareersInner({ poster, jobs }: { poster: CareersPoster; jobs: PublicJob[] }) {
  const t = useT()
  const initial = poster.displayName.charAt(0).toUpperCase()

  return (
    <div className="flex min-h-dvh flex-col pb-12">
      <div className="page-container pt-5 sm:pt-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="link-hover tap flex items-center text-sm font-extrabold text-ink">
            VOUCH
          </Link>
          <LangToggle />
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-card-border text-2xl font-bold text-ink">
            {poster.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
              <img src={poster.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
              {t('careers', 'heading', { name: poster.displayName })}
            </h1>
            <p className="mt-1 text-sm text-muted">{t('careers', 'subtitle')}</p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="glass mt-8 p-card text-center">
            <p className="text-base font-bold text-ink">{t('careers', 'noJobsTitle')}</p>
            <p className="mt-1 text-sm text-muted">{t('careers', 'noJobsBody')}</p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {jobs.map((job, i) => (
              <li
                key={job.slug}
                className={`glass-solid lift accent-bar accent-${ACCENTS[i % 3]} flex flex-col p-card`}
              >
                <p className="text-base font-extrabold text-ink">{job.title}</p>
                <p className="mt-1 text-sm text-muted">{job.location}</p>
                <p className="mt-2 text-xs font-semibold text-neutral">
                  {t('job', EMPLOYMENT_LABEL_KEYS[job.employment_type])}
                  {formatSalary(job) ? ` · ${formatSalary(job)}` : ''}
                </p>
                <Link href={`/j/${job.slug}`} className="btn btn-dark tap mt-4 px-5 py-2.5 text-xs">
                  {t('careers', 'view')}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
