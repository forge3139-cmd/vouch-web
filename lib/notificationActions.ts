'use server'

import { createAuthClient } from './auth/client'
import { getSignedInApplicant } from './auth/session'

/** Just the count, for the topbar bell — cheap enough to call on every
 * page, unlike loading the full notifications list. Signed-out visitors
 * never reach the query. */
export async function getUnreadNotificationCountAction(): Promise<number> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return 0
  const supabase = await createAuthClient()
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)
  if (error) {
    console.error('[getUnreadNotificationCountAction] query failed', error)
    return 0
  }
  return count ?? 0
}

/** Marking read is the one write a person may make to their own
 * notifications (RLS: notifications_own_mark_read) — done through the
 * auth client so that policy is the real gate, not a service-role bypass. */
export async function markNotificationReadAction(id: string): Promise<void> {
  const supabase = await createAuthClient()
  // The client isn't typed against a generated Database schema (see lib/supabase.ts), so updates need the cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('notifications') as any)
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)
  if (error) console.error('[markNotificationReadAction] update failed', error)
}
