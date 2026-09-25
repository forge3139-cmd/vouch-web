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

// Tags are lowercase letters, digits, spaces and underscores only (produced by
// expertise_tags_for), but re-check before interpolating into a filter string.
async function searchTags(supabase: ReturnType<typeof getSupabaseServerClient>, text: string): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('expertise_tags_for', { p_raw: [text] })
  if (error || !Array.isArray(data)) return []
  return (data as string[]).filter((t) => /^[a-z0-9_ ]+$/.test(t))
}

export async function loadDirectory(params: DirectoryParams): Promise<DirectoryEntry[]> {
  const supabase = getSupabaseServerClient()

  let query = supabase.from('identities').select('*').not('slug', 'is', null).limit(RESULT_LIMIT)

  // The chips are a shortcut over what people typed: a chip filters on the
  // synonym-group tag (see vouch-expertise.sql), it isn't a field they chose.
  if (params.category && isCategory(params.category)) {
    query = query.contains('expertise_tags', [params.category])
  }

  const trimmed = params.query?.trim()
  if (trimmed) {
    const pattern = likePattern(trimmed)
    // Similar wording finds similar wording: the search text goes through the
    // same normalise + synonym step as what people typed, and profiles
    // sharing any tag come up too. "Might be relevant", never a ranking.
    const tags = await searchTags(supabase, trimmed)
    const tagFilter = tags.length > 0 ? `,expertise_tags.ov.{${tags.map((t) => `"${t}"`).join(',')}}` : ''
    query = query.or(`display_name.ilike.${pattern},headline.ilike.${pattern},location.ilike.${pattern}${tagFilter}`)
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
