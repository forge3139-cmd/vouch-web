import 'server-only'
import { getSupabaseServerClient } from './supabase'
import type { Category } from './categories'
import type { PublicJob } from './hiring'

export type PublicJobResult = { status: 'not_found' } | { status: 'ok'; job: PublicJob }

// Explicit column list, not select('*'): the public page should be
// structurally unable to leak poster_id or anything added to `jobs` later.
const PUBLIC_JOB_COLUMNS =
  'slug, title, company_name, details, location, employment_type, category, salary_min, salary_max, salary_currency, deadline, status'

export async function loadPublicJob(slug: string): Promise<PublicJobResult> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.from('jobs').select(PUBLIC_JOB_COLUMNS).eq('slug', slug).maybeSingle<PublicJob>()
  if (!data) return { status: 'not_found' }
  return { status: 'ok', job: data }
}

const OPEN_JOBS_LIMIT = 60

/** The public jobs board: every open job, optionally filtered by trade.
 * Not personalised — unlike recommended_jobs(), this has no viewer and no
 * "already applied" exclusion, since anyone (signed in or not) can load
 * /jobs. Uses the service-role client because the board must work for a
 * signed-out visitor with no session at all. */
export async function loadOpenJobs(category?: Category | null): Promise<PublicJob[]> {
  const supabase = getSupabaseServerClient()
  let query = supabase
    .from('jobs')
    .select(PUBLIC_JOB_COLUMNS)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(OPEN_JOBS_LIMIT)
  if (category) query = query.eq('category', category)
  const { data, error } = await query.returns<PublicJob[]>()
  if (error) {
    console.error('[loadOpenJobs] query failed', error)
    return []
  }
  return data ?? []
}

export interface CareersPoster {
  displayName: string
  avatarUrl: string | null
}

export type CareersResult = { status: 'not_found' } | { status: 'ok'; poster: CareersPoster; jobs: PublicJob[] }

/** Every open job from one poster, by their existing /w/{slug}. A
 * permanent link: it's just a live query, so it reflects whatever they've
 * posted or closed since the last time anyone opened it — nothing to keep
 * in sync by hand. */
export async function loadCareersJobs(slug: string): Promise<CareersResult> {
  const supabase = getSupabaseServerClient()

  const { data: poster } = await supabase
    .from('identities')
    .select('id, display_name, avatar_url')
    .eq('slug', slug)
    .maybeSingle<{ id: string; display_name: string; avatar_url: string | null }>()
  if (!poster) return { status: 'not_found' }

  const { data, error } = await supabase
    .from('jobs')
    .select(PUBLIC_JOB_COLUMNS)
    .eq('poster_id', poster.id)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .returns<PublicJob[]>()
  if (error) {
    console.error('[loadCareersJobs] query failed', error)
    return { status: 'ok', poster: { displayName: poster.display_name, avatarUrl: poster.avatar_url }, jobs: [] }
  }

  return { status: 'ok', poster: { displayName: poster.display_name, avatarUrl: poster.avatar_url }, jobs: data ?? [] }
}
