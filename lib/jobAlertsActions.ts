'use server'

import { getSupabaseServerClient } from './supabase'
import { getSignedInApplicant } from './auth/session'

/**
 * Marks the jobs list as seen — called once when a page showing "new jobs
 * for you" (currently /applications) has loaded and already read the OLD
 * jobs_last_seen_at to display this visit's count. Bumping it here, not
 * during that read, is what makes the count show correctly for THIS visit
 * before resetting for the next one.
 *
 * Uses the service-role client rather than the auth client: the row to
 * update is identified by the verified session's own identityId, never by
 * anything the browser sent, so there's nothing for RLS to additionally
 * protect against here.
 */
export async function markJobsSeenAction(): Promise<void> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return

  const supabase = getSupabaseServerClient()
  // The client isn't typed against a generated Database schema (see lib/supabase.ts), so updates need the cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('identities') as any)
    .update({ jobs_last_seen_at: new Date().toISOString() })
    .eq('id', applicant.identityId)

  if (error) console.error('[markJobsSeenAction] update failed', error)
}
