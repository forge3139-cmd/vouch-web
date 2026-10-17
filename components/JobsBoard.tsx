'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLanguage, useT } from '@/components/LanguageContext'
import { CATEGORY_LABELS, CATEGORY_VALUES, type Category } from '@/lib/categories'
import { EMPLOYMENT_LABEL_KEYS, type PublicJob } from '@/lib/hiring'
import { formatRelative } from '@/lib/formatRelative'

const ACCENTS = ['border-orange', 'border-dash-navy-mid', 'border-dash-peach', 'border-dash-red'] as const

/**
 * The public jobs board: every open job VOUCH knows about, filterable by
 * trade. Not personalised, and no free-text search — "nothing smarter
 * yet". Filtering happens client-side against the one list already
 * loaded, since a launch-stage set of open postings is small; revisit if
 * that stops being true.
 */
export default function JobsBoard({ jobs }: { jobs: PublicJob[] }) {
  return <BoardInner jobs={jobs} />
}

function BoardInner({ jobs }: { jobs: PublicJob[] }) {
  const { lang } = useLanguage()
  const t = useT()
  const [filter, setFilter] = useState<Category | 'all'>('all') // a tag shortcut over typed expertise, not a fixed list

  const visible = useMemo(
    () => (filter === 'all' ? jobs : jobs.filter((j) => j.expertise_tags.includes(filter))),
    [jobs, filter]
  )

  return (
    <div className="flex flex-1 flex-col pb-12">
      <div className="page-container pt-5 sm:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-muted">{t('jobsBoard', 'eyebrow')}</p>
            <h1 className="mt-1 text-3xl font-extrabold text-ink sm:text-4xl">{t('jobsBoard', 'title')}</h1>
          </div>
          <p className="text-sm font-medium text-muted">
            {t('jobsBoard', jobs.length === 1 ? 'rolesOpenSingular' : 'rolesOpenPlural', { count: jobs.length })}
          </p>
        </div>

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
          <div className="mt-6 rounded-[var(--radius-hero)] bg-ink p-4 sm:p-5">
            <ul className="grid gap-4 sm:grid-cols-2">
              {visible.map((job, i) => {
                const category = CATEGORY_VALUES.find((c) => job.expertise_tags.includes(c))
                return (
                  <li
                    key={job.slug}
                    className={`flex flex-col rounded-2xl border-l-[3px] bg-white/[0.04] p-4 ${ACCENTS[i % ACCENTS.length]}`}
                  >
                    <div className="flex items-start justify-between gap-2 text-[11px] font-bold tracking-wide">
                      <span className={ACCENTS[i % ACCENTS.length].replace('border-', 'text-')}>
                        {category ? CATEGORY_LABELS[category][lang] : ''}
                      </span>
                      <span className="shrink-0 font-semibold text-white/50">{formatRelative(job.created_at, t)}</span>
                    </div>
                    <p className="mt-2 text-lg font-extrabold text-white">{job.title}</p>
                    <p className="mt-0.5 text-sm text-white/60">{job.company_name}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold text-white/55">
                      <span className="flex items-center gap-1">
                        <PinIcon />
                        {job.location}
                      </span>
                      <span>{t('job', EMPLOYMENT_LABEL_KEYS[job.employment_type])}</span>
                    </div>
                    <Link
                      href={`/j/${job.slug}`}
                      className="tap mt-4 flex items-center justify-center gap-1.5 rounded-pill bg-dash-peach py-2.5 text-sm font-bold text-[#5b3418] active:opacity-80"
                    >
                      {t('jobsBoard', 'view')} <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  )
}
