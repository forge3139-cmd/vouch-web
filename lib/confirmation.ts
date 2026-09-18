import 'server-only'
import { getSupabaseServerClient } from './supabase'
import { getClientIp, isRateLimited, recordAttempt } from './rateLimit'
import type { ConfirmationBundle, ConfirmationLinkRow, IdentityRow, RecordRow } from './types'

export type LinkLookupResult =
  | { status: 'not_found' }
  | { status: 'expired'; link: ConfirmationLinkRow }
  | { status: 'already_completed'; link: ConfirmationLinkRow; completedAt: string }
  | { status: 'rate_limited' }
  | { status: 'ok'; bundle: ConfirmationBundle }

// A handful of wrong guesses from one IP within 15 minutes blocks that IP
// from further lookups for the rest of the window — tokens are 64 hex
// characters, so brute-forcing one by guessing was never remotely
// feasible, but this stops scripted probing dead well before that matters.
// Only failed (not_found) lookups count — a visitor re-opening their own
// valid link never trips this.
const LOOKUP_FAILURE_LIMIT = 8
const LOOKUP_WINDOW_MS = 15 * 60 * 1000

export async function loadConfirmation(token: string): Promise<LinkLookupResult> {
  const supabase = getSupabaseServerClient()
  const ip = await getClientIp()
  const rateLimitKey = `confirmation-lookup:${ip}`

  if (isRateLimited(rateLimitKey, LOOKUP_FAILURE_LIMIT)) {
    return { status: 'rate_limited' }
  }

  const { data: link } = await supabase
    .from('confirmation_links')
    .select('*')
    .eq('token', token)
    .maybeSingle<ConfirmationLinkRow>()

  if (!link) {
    recordAttempt(rateLimitKey, LOOKUP_FAILURE_LIMIT, LOOKUP_WINDOW_MS)
    return { status: 'not_found' }
  }

  if (link.completed_at) {
    return { status: 'already_completed', link, completedAt: link.completed_at }
  }

  if (new Date(link.expires_at).getTime() < Date.now()) {
    return { status: 'expired', link }
  }

  const { data: record } = await supabase
    .from('records')
    .select('*')
    .eq('id', link.record_id)
    .maybeSingle<RecordRow>()

  if (!record) return { status: 'not_found' }

  const { data: worker } = await supabase
    .from('identities')
    .select('*')
    .eq('id', record.worker_id)
    .maybeSingle<IdentityRow>()

  if (!worker) return { status: 'not_found' }

  const { data: confirmedSamples } = await supabase
    .from('records')
    .select('id, title, role_title, confirmed_at')
    .eq('worker_id', record.worker_id)
    .eq('status', 'confirmed')
    .order('confirmed_at', { ascending: false })
    .limit(2)

  const { count } = await supabase
    .from('records')
    .select('id', { count: 'exact', head: true })
    .eq('worker_id', record.worker_id)
    .eq('status', 'confirmed')

  if (!link.opened_at) {
    await (supabase.from('confirmation_links') as any)
      .update({ opened_at: new Date().toISOString() })
      .eq('id', link.id)
  }

  return {
    status: 'ok',
    bundle: {
      link,
      record,
      worker,
      confirmedSamples: confirmedSamples ?? [],
      confirmedCount: count ?? 0,
    },
  }
}
