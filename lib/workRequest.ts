import 'server-only'
import { getSupabaseServerClient } from './supabase'
import type { IdentityEvidenceRow, IdentityRow, WorkerRequestBundle } from './types'

export type SlugLookupResult =
  | { status: 'not_found' }
  | { status: 'ok'; bundle: WorkerRequestBundle }

export async function loadWorkerBySlug(slug: string): Promise<SlugLookupResult> {
  const supabase = getSupabaseServerClient()

  const { data: worker } = await supabase
    .from('identities')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<IdentityRow>()

  if (!worker) return { status: 'not_found' }

  const { data: evidence } = await supabase
    .from('identity_evidence')
    .select('*')
    .eq('identity_id', worker.id)
    .maybeSingle<IdentityEvidenceRow>()

  return { status: 'ok', bundle: { worker, evidence: evidence ?? null } }
}
