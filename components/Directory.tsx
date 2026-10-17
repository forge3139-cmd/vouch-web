'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useLanguage, useT } from '@/components/LanguageContext'
import { searchDirectoryAction } from '@/lib/directoryActions'
import type { DirectoryEntry, DirectoryParams } from '@/lib/directory'
import { CATEGORY_LABELS, CATEGORY_VALUES, type Category } from '@/lib/categories'
import DirectoryCard from '@/components/DirectoryCard'
import Badge from '@/components/ui/Badge'

const quickChipKeys = ['quickChipAc', 'quickChipTailor', 'quickChipCarpenter', 'quickChipElectrician'] as const

export default function Directory({
  initialEntries,
  initialQuery,
}: {
  initialEntries: DirectoryEntry[]
  /** Deep-linked from elsewhere (the dashboard's search box posts here as
   * `?q=`) — runs the same search a typed query would, just already filled in. */
  initialQuery?: string
}) {
  return <DirectoryInner initialEntries={initialEntries} initialQuery={initialQuery} />
}

function DirectoryInner({ initialEntries, initialQuery }: { initialEntries: DirectoryEntry[]; initialQuery?: string }) {
  const { lang } = useLanguage()
  const t = useT()

  const [query, setQuery] = useState(initialQuery ?? '')
  const [category, setCategory] = useState<Category | null>(null)
  const [entries, setEntries] = useState<DirectoryEntry[]>(initialEntries)
  const [isPending, startTransition] = useTransition()
  const firstRun = useRef(true)

  const hasFilters = query.trim().length > 0 || category !== null

  function runSearch(overrides: Partial<DirectoryParams>) {
    const params: DirectoryParams = {
      query: overrides.query ?? query,
      category: overrides.category === undefined ? category : overrides.category,
      sort: 'recently_active',
    }
    startTransition(async () => {
      const results = await searchDirectoryAction(params)
      setEntries(results)
    })
  }

  // A deep-linked query (from the dashboard's search box) runs right away —
  // no debounce, since it's not someone mid-typing.
  useEffect(() => {
    if (initialQuery?.trim()) runSearch({ query: initialQuery })
    // Only ever for the query this page loaded with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Only the text search is debounced — category and chip clicks are
  // discrete actions and should feel instant.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    const timer = setTimeout(() => runSearch({ query }), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function handleQuickChip(label: string) {
    setQuery(label)
    runSearch({ query: label })
  }

  function handleCategoryClick(cat: Category | null) {
    setCategory(cat)
    runSearch({ category: cat })
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    runSearch({})
  }

  const categoryLabel = category ? CATEGORY_LABELS[category][lang] : null

  return (
    <div className="flex flex-1 flex-col">
      <div className="page-container pt-5 sm:pt-8">
        <section className="hero-card p-5 sm:p-8">
          <Badge variant="onHero" size="sm">
            {t('directory', 'heroPill')}
          </Badge>
          <h1 className="mt-4 text-3xl leading-tight font-extrabold text-ink sm:text-4xl lg:text-5xl">
            {t('directory', 'heroTitle')}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-ink/65 sm:text-base">{t('directory', 'heroSubtitle')}</p>

          <div className="glass mt-6 max-w-xl p-4 sm:mt-8 sm:p-5">
            <p className="text-sm font-extrabold text-ink">{t('directory', 'searchCardLabel')}</p>
            <form onSubmit={handleSearchSubmit} className="mt-3 flex items-center gap-2 rounded-pill bg-black/[0.04] p-1.5">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ml-2.5 shrink-0 text-faint">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('directory', 'searchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-ink outline-none placeholder:text-muted"
              />
              <button type="submit" className="btn btn-dark tap shrink-0 px-5 py-2.5 text-sm">
                {t('directory', 'search')}
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickChipKeys.map((key) => {
                const label = t('directory', key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleQuickChip(label)}
                    className="pill tap px-3.5 py-1.5 text-xs font-semibold active:opacity-70"
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="page-container flex-1 py-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-muted">{t('directory', 'browseEyebrow')}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">{t('directory', 'recentlyActive')}</h2>
          </div>
          <p className="max-w-xs text-xs font-medium text-muted sm:text-right">{t('directory', 'recentlyActiveNote')}</p>
        </div>

        {hasFilters && (
          <p className="mt-3 text-xs font-semibold text-muted">
            {t('directory', entries.length === 1 ? 'resultsSingular' : 'resultsPlural', { count: entries.length })}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => handleCategoryClick(null)}
            className={`pill tap shrink-0 px-4 py-2 text-sm font-bold ${category === null ? 'pill-active' : ''}`}
          >
            {t('directory', 'allCategories')}
          </button>
          {CATEGORY_VALUES.filter((c) => c !== 'other').map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryClick(cat)}
              className={`pill tap shrink-0 px-4 py-2 text-sm font-bold ${category === cat ? 'pill-active' : ''}`}
            >
              {CATEGORY_LABELS[cat][lang]}
            </button>
          ))}
        </div>

        <div
          className={`mt-5 grid gap-3 transition-opacity sm:grid-cols-2 sm:gap-4 ${isPending ? 'opacity-50' : ''}`}
        >
          {entries.length === 0 ? (
            <div className="sm:col-span-2">
              <EmptyState query={query} categoryLabel={categoryLabel} onClear={() => { setQuery(''); handleCategoryClick(null) }} />
            </div>
          ) : (
            entries.map((entry, i) => <DirectoryCard key={entry.worker.id} entry={entry} index={i} />)
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  query,
  categoryLabel,
  onClear,
}: {
  query: string
  categoryLabel: string | null
  onClear: () => void
}) {
  const t = useT()
  const trimmed = query.trim()
  const hasFilters = !!trimmed || !!categoryLabel

  const message = trimmed
    ? t('directory', 'emptyNoMatches', { query: trimmed })
    : categoryLabel
      ? t('directory', 'emptyNoCategory', { category: categoryLabel })
      : t('directory', 'emptyNone')

  return (
    <div className="glass flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{message}</p>
      {hasFilters && (
        <>
          <p className="text-xs text-muted">{t('directory', 'emptyHint')}</p>
          <button type="button" onClick={onClear} className="link-hover tap mt-1 text-xs font-bold text-blue">
            {t('directory', 'clearFilters')}
          </button>
        </>
      )}
    </div>
  )
}
