'use server'

import { createAuthClient } from './auth/client'

/**
 * "Open on my computer" — a small module kept deliberately separate from
 * the hiring and notification code: one table, two database functions
 * (vouch-handoff.sql), and this one server action. No Supabase client
 * ever runs in the browser here — the poller (components/HandoffListener)
 * calls this Server Action, which resolves who's asking from the request's
 * own session cookie, the exact same way sign-in does. Nothing about who
 * to check for is ever taken from the client.
 */
export type HandoffCheckResult = { slug: string } | null

export async function checkHandoffAction(): Promise<HandoffCheckResult> {
  const supabase = await createAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // The client isn't typed against a generated Database schema (see lib/supabase.ts), so rpc needs the cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('claim_handoff')
  if (error) {
    console.error('[checkHandoffAction] claim_handoff failed', error)
    return null
  }

  const result = data as { ok: boolean; handoff?: { slug: string } | null }
  if (!result.ok || !result.handoff) return null
  return { slug: result.handoff.slug }
}
