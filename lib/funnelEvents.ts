// Shared by server and client. The drop-off steps, in order:
// job page viewed → Apply tapped → signed in or signed up → submitted.

export const FUNNEL_EVENTS = [
  'job_viewed',
  'apply_tapped',
  'signed_in',
  'signed_up',
  'application_submitted',
] as const

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number]

/** The two steps the browser reports itself. The rest are written by the
 * server, at the moment they actually happen, so they can't be faked or
 * skipped by a client. */
export const CLIENT_FUNNEL_EVENTS = ['job_viewed', 'apply_tapped'] as const
export type ClientFunnelEvent = (typeof CLIENT_FUNNEL_EVENTS)[number]

const VISITOR_ID_SHAPE = /^[A-Za-z0-9-]{8,64}$/
export function isValidVisitorId(value: string): boolean {
  return VISITOR_ID_SHAPE.test(value)
}
