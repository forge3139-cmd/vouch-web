import 'server-only'
import { createAuthClient } from './auth/client'

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  data: { job_id?: string; application_id?: string; status?: string }
  read_at: string | null
  created_at: string
}

/** Read as the signed-in person (auth client, RLS-gated) — never as the
 * service role, since notifications are exactly the kind of thing that
 * must only ever return the caller's own rows. */
export async function loadNotifications(limit = 20): Promise<AppNotification[] | null> {
  try {
    const supabase = await createAuthClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<AppNotification[]>()
    if (error) {
      console.error('[loadNotifications] query failed', error)
      return null
    }
    return data ?? []
  } catch (e) {
    console.error('[loadNotifications] failed', e)
    return null
  }
}
