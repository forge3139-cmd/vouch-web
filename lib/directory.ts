import 'server-only'
import { getSupabaseServerClient } from './supabase'
import { isCategory, type Category } from './categories'
import type { IdentityEvidenceRow, IdentityRow } from './types'

export type SortOption = 'jobs_confirmed' | 'repeat_clients' | 'recently_active'

// Every entry is pre-filtered to have a slug (see the `.not('slug', ...)`
// query below) — narrowed here so callers building /w/{slug} links don't
// need to re-check or cast.
export type DirectoryWorker = Omit<IdentityRow, 'slug'> & { slug: string }

export interface DirectoryEntry {
  worker: DirectoryWorker
  evidence: IdentityEvidenceRow | null
}

export interface DirectoryParams {
  query?: string
  category?: Category | null
  sort?: SortOption
}

const RESULT_LIMIT = 100

// PostgREST's .or() filter string treats "," and "()" as grammar, and ILIKE
// treats "%"/"_" as wildcards — none of that should come from what a visitor
// typed into the search box.
function likePattern(raw: string): string {
  const cleaned = raw.replace(/[,()]/g, ' ').replace(/[%_\\]/g, (c) => `\\${c}`).trim()
  return `%${cleaned}%`
}

export async function loadDirectory(params: DirectoryParams): Promise<DirectoryEntry[]> {
  const supabase = getSupabaseServerClient()

  let query = supabase.from('identities').select('*').not('slug', 'is', null).limit(RESULT_LIMIT)

  if (params.category && isCategory(params.category)) {
    query = query.eq('category', params.category)
  }

  const trimmed = params.query?.trim()
  if (trimmed) {
    const pattern = likePattern(trimmed)
    query = query.or(`display_name.ilike.${pattern},headline.ilike.${pattern},location.ilike.${pattern}`)
  }

  const { data: identities, error } = await query
  if (error) throw error

  const workers = (identities ?? []) as DirectoryWorker[]
  if (workers.length === 0) return []

  const { data: evidenceRows, error: evidenceError } = await supabase
    .from('identity_evidence')
    .select('*')
    .in('identity_id', workers.map((w) => w.id))
  if (evidenceError) throw evidenceError

  const evidenceById = new Map(
    ((evidenceRows ?? []) as IdentityEvidenceRow[]).map((e) => [e.identity_id, e])
  )

  const entries: DirectoryEntry[] = workers.map((worker) => ({
    worker,
    evidence: evidenceById.get(worker.id) ?? null,
  }))

  const sort = params.sort ?? 'jobs_confirmed'
  entries.sort((a, b) => {
    if (sort === 'repeat_clients') {
      return (b.evidence?.repeat_clients ?? 0) - (a.evidence?.repeat_clients ?? 0)
    }
    if (sort === 'recently_active') {
      const at = a.evidence?.last_confirmed_at ? new Date(a.evidence.last_confirmed_at).getTime() : 0
      const bt = b.evidence?.last_confirmed_at ? new Date(b.evidence.last_confirmed_at).getTime() : 0
      return bt - at
    }
    return (b.evidence?.records_confirmed ?? 0) - (a.evidence?.records_confirmed ?? 0)
  })

  return entries
}
