import { logFunnelEventAction } from '@/lib/funnelActions'
import type { ClientFunnelEvent } from '@/lib/funnelEvents'

const VISITOR_KEY = 'vouch:visitor'
let memoryVisitorId: string | null = null

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Plain-http contexts (a phone on a LAN dev server) have no randomUUID.
  return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/** A random id for this browser tab. It only links the steps of one visit
 * together — it isn't tied to a person, and sessionStorage forgets it when
 * the tab closes. (Auth never touches storage; this is the only key.) */
export function getVisitorId(): string {
  if (memoryVisitorId) return memoryVisitorId
  try {
    const existing = window.sessionStorage.getItem(VISITOR_KEY)
    if (existing) {
      memoryVisitorId = existing
      return existing
    }
    const fresh = makeId()
    window.sessionStorage.setItem(VISITOR_KEY, fresh)
    memoryVisitorId = fresh
    return fresh
  } catch {
    memoryVisitorId = memoryVisitorId ?? makeId()
    return memoryVisitorId
  }
}

/** Fire-and-forget. Measuring must never get in the applicant's way. */
export function trackFunnel(event: ClientFunnelEvent, jobSlug: string): void {
  logFunnelEventAction(event, jobSlug, getVisitorId()).catch(() => {})
}

/** Runs `fn` at most once per browser tab for a given key. */
export function once(key: string, fn: () => void): void {
  try {
    if (window.sessionStorage.getItem(key)) return
    window.sessionStorage.setItem(key, '1')
  } catch {
    // No sessionStorage — better to count twice than not at all.
  }
  fn()
}
