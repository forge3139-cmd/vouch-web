import 'server-only'
import { headers } from 'next/headers'

/**
 * In-memory fixed-window rate limiter. Deliberately simple, per the "an
 * in-memory counter is fine" allowance — no Vercel KV/Upstash account
 * exists for this project. The real limitation: Vercel serverless
 * functions are ephemeral and can run across multiple warm instances or
 * regions, so this map isn't a globally consistent counter. A determined
 * attacker spreading requests across cold starts could exceed these
 * limits. It's still real protection against the actual threat here —
 * scripted, single-source brute-forcing and spam — and closing the gap
 * fully would mean adding a durable store (Vercel KV / Upstash Redis),
 * which is a real infra dependency this app doesn't have yet.
 */
interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Opportunistic cleanup rather than a timer — avoids duplicate intervals
// under Next.js dev-mode hot reload, and a few thousand stale entries
// sitting in memory between sweeps costs nothing worth worrying about.
const MAX_BUCKETS = 20000

function sweepExpired() {
  if (buckets.size <= MAX_BUCKETS) return
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key)
  }
}

function getOrCreateBucket(key: string, windowMs: number): Bucket {
  const now = Date.now()
  const existing = buckets.get(key)
  if (existing && existing.resetAt > now) return existing

  const fresh: Bucket = { count: 0, resetAt: now + windowMs }
  buckets.set(key, fresh)
  return fresh
}

/** Peeks at whether `key` has already hit `limit` in its current window,
 * without counting this call as an attempt. */
export function isRateLimited(key: string, limit: number): boolean {
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < Date.now()) return false
  return bucket.count >= limit
}

/** Records one occurrence against `key` and reports whether that pushed it
 * over `limit` for its current (windowMs-long) window. */
export function recordAttempt(key: string, limit: number, windowMs: number): boolean {
  sweepExpired()
  const bucket = getOrCreateBucket(key, windowMs)
  bucket.count += 1
  return bucket.count > limit
}

/**
 * Best-effort client IP from the headers Vercel's edge network sets.
 * `x-forwarded-for` can carry a chain of proxies — the first entry is the
 * original client. Falls back to a constant so requests without either
 * header (e.g. local dev) still share one bucket rather than throwing.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return h.get('x-real-ip') ?? 'unknown'
}
