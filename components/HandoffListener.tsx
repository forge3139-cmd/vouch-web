'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { checkHandoffAction } from '@/lib/handoff'

const POLL_MS = 4000

/**
 * "Open on my computer" — the web half. Mounted once, globally, in the
 * root layout: it's cheap to poll for everyone (checkHandoffAction just
 * returns null instantly for a signed-out visitor) and there's no
 * client-side way to know who's signed in without a Supabase client in
 * the browser, which this module deliberately never uses.
 *
 * Only polls while this tab is the visible one — a background tab never
 * fires a navigation the person isn't looking at. When a handoff shows
 * up it's already been marked used server-side (see lib/handoff.ts), so
 * this only ever navigates once per phone tap, never repeats it.
 */
export default function HandoffListener() {
  const router = useRouter()
  const inFlight = useRef(false)

  useEffect(() => {
    let stopped = false

    async function poll() {
      if (stopped || inFlight.current || document.visibilityState !== 'visible') return
      inFlight.current = true
      try {
        const result = await checkHandoffAction()
        if (result && !stopped) router.push(`/j/${result.slug}`)
      } catch {
        // A missed poll just means trying again next tick.
      } finally {
        inFlight.current = false
      }
    }

    const id = setInterval(poll, POLL_MS)
    document.addEventListener('visibilitychange', poll)
    return () => {
      stopped = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [router])

  return null
}
