'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { LanguageProvider, useLanguage, useT } from '@/components/LanguageContext'
import { searchDirectoryAction } from '@/lib/directoryActions'
import type { DirectoryEntry, DirectoryParams, SortOption } from '@/lib/directory'
import { CATEGORY_LABELS, CATEGORY_VALUES, type Category } from '@/lib/categories'
import CategoryIcon from '@/components/icons/CategoryIcon'
import DirectoryCard from '@/components/DirectoryCard'
import Badge from '@/components/ui/Badge'

const SORTS: SortOption[] = ['recently_active', 'repeat_clients', 'jobs_confirmed']
const sortLabelKey: Record<SortOption, 'sortJobsConfirmed' | 'sortRepeatClients' | 'sortRecentlyActive'> = {
  jobs_confirmed: 'sortJobsConfirmed',
  repeat_clients: 'sortRepeatClients',
  recently_active: 'sortRecentlyActive',
}
const quickChipKeys = ['quickChipAc', 'quickChipTailor', 'quickChipCarpenter', 'quickChipElectrician', 'quickChipPhotographer'] as const

export default function Directory({ initialEntries }: { initialEntries: DirectoryEntry[] }) {
  return (
    <LanguageProvider>
      <DirectoryInner initialEntries={initialEntries} />
    </LanguageProvider>
  )
}

function DirectoryInner({ initialEntries }: { initialEntries: DirectoryEntry[] }) {
  const { lang, setLang } = useLanguage()
  const t = useT()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [sort, setSort] = useState<SortOption>('recently_active')
  const [entries, setEntries] = useState<DirectoryEntry[]>(initialEntries)
  const [isPending, startTransition] = useTransition()
  const firstRun = useRef(true)

  const hasFilters = query.trim().length > 0 || category !== null

  function runSearch(overrides: Partial<DirectoryParams>) {
    const params: DirectoryParams = {
      query: overrides.query ?? query,
      category: overrides.category === undefined ? category : overrides.category,
      sort: overrides.sort ?? sort,
    }
    startTransition(async () => {
      const results = await searchDirectoryAction(params)
      setEntries(results)
    })
  }

  // Only the text search is debounced — category, sort, and chip clicks are
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

  function handleCategoryClick(cat: Category) {
    const next = category === cat ? null : cat
    setCategory(next)
    runSearch({ category: next })
  }

  function clearQuery() {
    setQuery('')
    runSearch({ query: '' })
  }

  function clearCategory() {
    setCategory(null)
    runSearch({ category: null })
  }

  function clearAll() {
    setQuery('')
    setCategory(null)
    runSearch({ query: '', category: null })
  }

  function handleSortClick(next: SortOption) {
    setSort(next)
    runSearch({ sort: next })
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    runSearch({})
  }

  const categoryLabel = category ? CATEGORY_LABELS[category][lang] : null

  const tints = ['orange', 'blue', 'green'] as const

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="glass-bar sticky top-0 z-20 border-b">
        <div className="page-container flex items-center justify-between py-3 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-hero)] text-sm font-extrabold text-white shadow-[0_8px_18px_-6px_rgba(232,108,42,0.6)]">
              V
            </div>
            <span className="text-lg font-extrabold text-ink">VOUCH</span>
          </div>
          <div className="pill overflow-hidden p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`tap rounded-pill px-3.5 py-1.5 ${lang === 'en' ? 'bg-ink text-white' : 'text-muted'}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('sw')}
              className={`tap rounded-pill px-3.5 py-1.5 ${lang === 'sw' ? 'bg-ink text-white' : 'text-muted'}`}
            >
              SW
            </button>
          </div>
        </div>
      </header>

      <div className="page-container pt-5 sm:pt-8">
        <section className="hero-card px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <div className="max-w-2xl">
            <Badge variant="onHero" size="sm">
              {t('directory', 'heroPill')}
            </Badge>
            <h1 className="mt-4 text-3xl leading-tight font-extrabold text-white sm:text-4xl lg:text-5xl">
              {t('directory', 'heroTitle')}
            </h1>
            <p className="mt-3 text-sm text-white/85 sm:text-base">{t('directory', 'heroSubtitle')}</p>

            <form
              onSubmit={handleSearchSubmit}
              className="mt-6 flex items-center gap-2 rounded-pill bg-white/90 p-1.5 shadow-[0_14px_34px_-14px_rgba(26,26,26,0.45)] sm:mt-8"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('directory', 'searchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-ink outline-none placeholder:text-muted sm:text-base"
              />
              <button type="submit" className="btn btn-dark tap shrink-0 px-5 py-3 text-sm sm:px-7">
                {t('directory', 'search')}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {quickChipKeys.map((key) => {
                const label = t('directory', key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleQuickChip(label)}
                    className="pill pill-on-hero tap px-3.5 py-1.5 text-xs font-semibold active:opacity-70"
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
        <h2 className="mb-4 text-lg font-extrabold text-ink sm:text-xl">{t('directory', 'browseByTrade')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {CATEGORY_VALUES.filter((c) => c !== 'other').map((cat, i) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryClick(cat)}
              className={`glass-solid lift tap flex items-center gap-3 p-3 text-left transition-colors sm:p-4 ${
                category === cat ? 'ring-2 ring-orange' : ''
              }`}
            >
              <span className={`icon-circle icon-circle-${tints[i % 3]} h-10 w-10`}>
                <CategoryIcon category={cat} className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold text-ink">{CATEGORY_LABELS[cat][lang]}</span>
            </button>
          ))}
        </div>

        <div className="mt-10">
          {hasFilters ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {query.trim() && (
                  <Badge variant="outline" onRemove={clearQuery} removeLabel={t('directory', 'removeFilter')}>
                    {query.trim()}
                  </Badge>
                )}
                {categoryLabel && (
                  <Badge variant="outline" onRemove={clearCategory} removeLabel={t('directory', 'removeFilter')}>
                    {categoryLabel}
                  </Badge>
                )}
                <button type="button" onClick={clearAll} className="link-hover tap text-xs font-bold text-blue">
                  {t('directory', 'clearFilters')}
                </button>
              </div>
              <p className="mt-3 text-xs font-semibold text-muted">
                {t('directory', entries.length === 1 ? 'resultsSingular' : 'resultsPlural', { count: entries.length })}
              </p>
            </>
          ) : (
            <h2 className="text-lg font-extrabold text-ink sm:text-xl">{t('directory', 'recentlyActive')}</h2>
          )}

          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
            <span className="shrink-0 text-xs font-bold text-muted">{t('directory', 'sortLabel')}</span>
            {SORTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSortClick(s)}
                className={`pill tap shrink-0 px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  sort === s ? 'pill-active' : 'text-neutral'
                }`}
              >
                {t('directory', sortLabelKey[s])}
              </button>
            ))}
          </div>

          <div
            className={`mt-5 grid gap-3 transition-opacity sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 ${isPending ? 'opacity-50' : ''}`}
          >
            {entries.length === 0 ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <EmptyState query={query} categoryLabel={categoryLabel} onClear={clearAll} />
              </div>
            ) : (
              entries.map((entry, i) => <DirectoryCard key={entry.worker.id} entry={entry} index={i} />)
            )}
          </div>
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
