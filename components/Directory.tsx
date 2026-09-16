'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { LanguageProvider, useLanguage, useT } from '@/components/LanguageContext'
import { searchDirectoryAction } from '@/lib/directoryActions'
import type { DirectoryEntry, DirectoryParams, SortOption } from '@/lib/directory'
import { CATEGORY_LABELS, CATEGORY_VALUES, type Category } from '@/lib/categories'
import CategoryIcon from '@/components/icons/CategoryIcon'
import DirectoryCard from '@/components/DirectoryCard'

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

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-card-border bg-white">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange text-sm font-extrabold text-white">
              V
            </div>
            <span className="text-lg font-extrabold text-ink">VOUCH</span>
          </div>
          <div className="flex overflow-hidden rounded-full border border-card-border text-xs font-bold">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 ${lang === 'en' ? 'bg-orange text-white' : 'text-muted'}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('sw')}
              className={`px-3 py-1.5 ${lang === 'sw' ? 'bg-orange text-white' : 'text-muted'}`}
            >
              SW
            </button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-orange/[0.06] to-cream">
        <div className="mx-auto w-full max-w-2xl px-5 pt-10 pb-8">
          <span className="inline-block rounded-full bg-orange/10 px-3 py-1 text-[11px] font-extrabold tracking-wide text-orange">
            {t('directory', 'heroPill')}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-ink">{t('directory', 'heroTitle')}</h1>
          <p className="mt-2 text-sm text-muted">{t('directory', 'heroSubtitle')}</p>

          <form onSubmit={handleSearchSubmit} className="mt-6 flex items-center gap-2 rounded-2xl border border-card-border bg-white p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('directory', 'searchPlaceholder')}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-ink outline-none"
            />
            <button type="submit" className="shrink-0 rounded-xl bg-orange px-5 py-3 text-sm font-bold text-white active:opacity-80">
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
                  className="rounded-full border border-card-border bg-white px-3 py-1.5 text-xs font-semibold text-ink active:opacity-70"
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
        <h2 className="mb-3 text-base font-extrabold text-ink">{t('directory', 'browseByTrade')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORY_VALUES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryClick(cat)}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                category === cat ? 'border-orange bg-orange/5' : 'border-card-border bg-white'
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange/10 text-orange">
                <CategoryIcon category={cat} className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold text-ink">{CATEGORY_LABELS[cat][lang]}</span>
            </button>
          ))}
        </div>

        <div className="mt-8">
          {hasFilters ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {query.trim() && (
                  <FilterChip label={query.trim()} onRemove={clearQuery} removeLabel={t('directory', 'removeFilter')} />
                )}
                {categoryLabel && (
                  <FilterChip label={categoryLabel} onRemove={clearCategory} removeLabel={t('directory', 'removeFilter')} />
                )}
                <button type="button" onClick={clearAll} className="text-xs font-bold text-orange">
                  {t('directory', 'clearFilters')}
                </button>
              </div>
              <p className="mt-3 text-xs font-semibold text-muted">
                {t('directory', entries.length === 1 ? 'resultsSingular' : 'resultsPlural', { count: entries.length })}
              </p>
            </>
          ) : (
            <h2 className="text-base font-extrabold text-ink">{t('directory', 'recentlyActive')}</h2>
          )}

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="shrink-0 text-xs font-bold text-muted">{t('directory', 'sortLabel')}</span>
            {SORTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSortClick(s)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  sort === s ? 'bg-ink text-white' : 'border border-card-border bg-white text-muted'
                }`}
              >
                {t('directory', sortLabelKey[s])}
              </button>
            ))}
          </div>

          <div className={`mt-4 space-y-3 transition-opacity ${isPending ? 'opacity-50' : ''}`}>
            {entries.length === 0 ? (
              <EmptyState query={query} categoryLabel={categoryLabel} onClear={clearAll} />
            ) : (
              entries.map((entry) => <DirectoryCard key={entry.worker.id} entry={entry} />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterChip({ label, onRemove, removeLabel }: { label: string; onRemove: () => void; removeLabel: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-card-border bg-white py-1.5 pl-3 pr-2 text-xs font-semibold text-ink">
      {label}
      <button type="button" onClick={onRemove} aria-label={removeLabel} className="text-muted">
        ×
      </button>
    </span>
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
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-card-border bg-white px-6 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{message}</p>
      {hasFilters && (
        <>
          <p className="text-xs text-muted">{t('directory', 'emptyHint')}</p>
          <button type="button" onClick={onClear} className="mt-1 text-xs font-bold text-orange">
            {t('directory', 'clearFilters')}
          </button>
        </>
      )}
    </div>
  )
}
