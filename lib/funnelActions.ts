'use server'

import { getClientIp, recordAttempt } from './rateLimit'
import { recordFunnelEvent } from './funnel'
import { CLIENT_FUNNEL_EVENTS, type ClientFunnelEvent } from './funnelEvents'
import { getSignedInApplicant } from './auth/session'

// Generous for one person browsing several jobs, a real ceiling for a
// script trying to pad the numbers.
const FUNNEL_LIMIT = 120
const FUNNEL_WINDOW_MS = 60 * 60 * 1000

/** Called by the browser for the two steps only it can see: the job page
 * being viewed, and Apply being tapped. Every later step is recorded by
 * the server itself. */
export async function logFunnelEventAction(
  event: ClientFunnelEvent,
  jobSlug: string,
  visitorId: string
): Promise<void> {
  if (!(CLIENT_FUNNEL_EVENTS as readonly string[]).includes(event)) return

  const ip = await getClientIp()
  if (recordAttempt(`funnel:${ip}`, FUNNEL_LIMIT, FUNNEL_WINDOW_MS)) return

  const applicant = await getSignedInApplicant()
  await recordFunnelEvent({ event, jobSlug, visitorId, identityId: applicant?.identityId })
}
