'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { LanguageProvider, useLanguage, useT } from '@/components/LanguageContext'
import LangToggle from '@/components/ui/LangToggle'
import { CATEGORY_LABELS, CATEGORY_VALUES, type Category } from '@/lib/categories'
import { EMPLOYMENT_LABEL_KEYS, formatSalary, type PublicJob } from '@/lib/hiring'

const ACCENTS = ['orange', 'blue', 'green'] as const

/**
 * The public jobs board: every open job VOUCH knows about, filterable by
 * trade. Not personalised, and no free-text search — "nothing smarter
 * yet". Filtering happens client-side against the one list already
 * loaded, since a launch-stage set of open postings is small; revisit if
 * that stops being true.
 */
export default function JobsBoard({ jobs }: { jobs: PublicJob[] }) {
  return (
    <LanguageProvider>
      <BoardInner jobs={jobs} />
    </LanguageProvider>
  )
}

function BoardInner({ jobs }: { jobs: PublicJob[] }) {
  const { lang } = useLanguage()
  const t = useT()
  const [filter, setFilter] = useState<Category | 'all'>('all')

  const visible = useMemo(
    () => (filter === 'all' ? jobs : jobs.filter((j) => j.category === filter)),
    [jobs, filter]
  )

  return (
    <div className="flex min-h-dvh flex-col pb-12">
      <div className="page-container pt-5 sm:pt-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="link-hover tap flex items-center text-sm font-extrabold text-ink">
            VOUCH
          </Link>
          <LangToggle />
        </div>

        <h1 className="mt-6 text-3xl font-extrabold text-ink sm:text-4xl">{t('jobsBoard', 'title')}</h1>
        <p className="mt-2 text-sm text-muted">{t('jobsBoard', 'subtitle')}</p>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`pill tap shrink-0 px-4 py-2 text-sm font-bold ${filter === 'all' ? 'pill-active' : ''}`}
          >
            {t('jobsBoard', 'filterAll')}
          </button>
          {CATEGORY_VALUES.filter((c) => c !== 'other').map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`pill tap shrink-0 px-4 py-2 text-sm font-bold ${filter === cat ? 'pill-active' : ''}`}
            >
              {CATEGORY_LABELS[cat][lang]}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="glass mt-6 p-card text-center">
            <p className="text-sm font-semibold text-ink">
              {filter === 'all' ? t('jobsBoard', 'emptyAll') : t('jobsBoard', 'emptyTrade', { category: CATEGORY_LABELS[filter][lang] })}
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((job, i) => (
              <li
                key={job.slug}
                className={`glass-solid lift accent-bar accent-${ACCENTS[i % 3]} flex flex-col p-card`}
              >
                <p className="text-base font-extrabold text-ink">{job.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {job.company_name} · {job.location}
                </p>
                <p className="mt-2 text-xs font-semibold text-neutral">
                  {t('job', EMPLOYMENT_LABEL_KEYS[job.employment_type])}
                  {formatSalary(job) ? ` · ${formatSalary(job)}` : ''}
                </p>
                <Link href={`/j/${job.slug}`} className="btn btn-dark tap mt-4 px-5 py-2.5 text-xs">
                  {t('jobsBoard', 'view')}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
