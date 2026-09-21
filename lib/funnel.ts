import 'server-only'
import { getSupabaseServerClient } from './supabase'
import { isValidVisitorId, type FunnelEvent } from './funnelEvents'

/**
 * Best-effort: measuring the funnel must never break, slow, or fail a real
 * sign-in or application. Errors are logged and swallowed.
 *
 * Stores an event name, the job's slug, a random per-tab visitor id, and
 * (only for steps that happen signed in) the identity. No IP, no user
 * agent, no page contents.
 */
export async function recordFunnelEvent(input: {
  event: FunnelEvent
  jobSlug: string
  visitorId: string
  identityId?: string | null
}): Promise<void> {
  if (!input.jobSlug || !isValidVisitorId(input.visitorId)) return

  try {
    const supabase = getSupabaseServerClient()
    // The client isn't typed against a generated Database schema (see lib/supabase.ts), so inserts need the cast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('hiring_funnel_events') as any).insert({
      event: input.event,
      job_slug: input.jobSlug.slice(0, 120),
      visitor_id: input.visitorId,
      identity_id: input.identityId ?? null,
    })
    if (error) console.error('[recordFunnelEvent] insert failed', error)
  } catch (e) {
    console.error('[recordFunnelEvent] failed', e)
  }
}
