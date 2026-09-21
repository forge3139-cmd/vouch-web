import 'server-only'
import { getSupabaseServerClient } from './supabase'
import type { PublicJob } from './hiring'

export type PublicJobResult = { status: 'not_found' } | { status: 'ok'; job: PublicJob }

// Explicit column list, not select('*'): the public page should be
// structurally unable to leak poster_id or anything added to `jobs` later.
const PUBLIC_JOB_COLUMNS =
  'slug, title, company_name, description, requirements, location, employment_type, salary_min, salary_max, salary_currency, deadline, status'

export async function loadPublicJob(slug: string): Promise<PublicJobResult> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.from('jobs').select(PUBLIC_JOB_COLUMNS).eq('slug', slug).maybeSingle<PublicJob>()
  if (!data) return { status: 'not_found' }
  return { status: 'ok', job: data }
}
