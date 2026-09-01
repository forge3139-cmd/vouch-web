import 'server-only'
import { getSupabaseServerClient } from './supabase'
import type { ConfirmationBundle, ConfirmationLinkRow, IdentityRow, RecordRow } from './types'

export type LinkLookupResult =
  | { status: 'not_found' }
  | { status: 'expired'; link: ConfirmationLinkRow }
  | { status: 'already_completed'; link: ConfirmationLinkRow; completedAt: string }
  | { status: 'ok'; bundle: ConfirmationBundle }

export async function loadConfirmation(token: string): Promise<LinkLookupResult> {
  const supabase = getSupabaseServerClient()

  const { data: link } = await supabase
    .from('confirmation_links')
    .select('*')
    .eq('token', token)
    .maybeSingle<ConfirmationLinkRow>()

  if (!link) return { status: 'not_found' }

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
