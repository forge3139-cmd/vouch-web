'use server'

import { createAuthClient } from './auth/client'

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
