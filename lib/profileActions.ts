'use server'

import { createAuthClient } from './auth/client'
import { getSignedInApplicant } from './auth/session'
import { MAX_CAPABILITIES_ENTRIES, MAX_EXPERTISE_ENTRIES, cleanExpertiseEntry } from './expertise'

export type ProfileFieldResult = { ok: true; values: string[] } | { ok: false; error: 'signedOut' | 'generic' }

/** Trims, drops empties, de-duplicates case-insensitively, caps length and
 * count — the same rules the mobile app applies before storing. */
function sanitizeList(raw: string[], max: number): string[] {
  const out: string[] = []
  for (const entry of raw) {
    const cleaned = cleanExpertiseEntry(entry)
    if (!cleaned) continue
    if (out.some((v) => v.toLowerCase() === cleaned.toLowerCase())) continue
    out.push(cleaned)
    if (out.length >= max) break
  }
  return out
}

/** Stores exactly what was typed (after sanitizing); the database derives
 * the search tags used for matching relevant jobs. */
export async function updateExpertiseAction(values: string[]): Promise<ProfileFieldResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false, error: 'signedOut' }

  const clean = sanitizeList(values, MAX_EXPERTISE_ENTRIES)
  const supabase = await createAuthClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('identities') as any)
    .update({ expertise: clean })
    .eq('id', applicant.identityId)
  if (error) {
    console.error('[updateExpertiseAction] update failed', error)
    return { ok: false, error: 'generic' }
  }
  return { ok: true, values: clean }
}

/** Skills the person lists on their profile — no derived tags, just stored
 * verbatim. */
export async function updateCapabilitiesAction(values: string[]): Promise<ProfileFieldResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false, error: 'signedOut' }

  const clean = sanitizeList(values, MAX_CAPABILITIES_ENTRIES)
  const supabase = await createAuthClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('identities') as any)
    .update({ capabilities: clean })
    .eq('id', applicant.identityId)
  if (error) {
    console.error('[updateCapabilitiesAction] update failed', error)
    return { ok: false, error: 'generic' }
  }
  return { ok: true, values: clean }
}

export interface PortfolioItemResult {
  id: string
  title: string
  summary: string | null
  cover_url: string | null
}

export type AddPortfolioResult = { ok: true; item: PortfolioItemResult } | { ok: false; error: 'signedOut' | 'required' | 'generic' }

const MAX_TITLE = 80
const MAX_PHOTO_BYTES = 8 * 1024 * 1024

/**
 * A portfolio item is a title plus an optional photo. Always created as
 * 'shared' — the only visibility a company can ever see (private items
 * exist in the schema but nothing here creates them). Uploaded as the
 * signed-in user themselves, so RLS on portfolio_items and Storage applies.
 */
export async function addPortfolioItemAction(formData: FormData): Promise<AddPortfolioResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false, error: 'signedOut' }

  const title = String(formData.get('title') ?? '').trim().slice(0, MAX_TITLE)
  if (!title) return { ok: false, error: 'required' }

  const photo = formData.get('photo')
  const supabase = await createAuthClient()

  let coverUrl: string | null = null
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) return { ok: false, error: 'required' }
    const ext = (photo.type.split('/')[1] || 'jpg').toLowerCase()
    const path = `portfolio/${applicant.identityId}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('proofs').upload(path, photo, { contentType: photo.type })
    if (uploadError) {
      console.error('[addPortfolioItemAction] upload failed', uploadError)
      return { ok: false, error: 'generic' }
    }
    coverUrl = supabase.storage.from('proofs').getPublicUrl(path).data.publicUrl
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('portfolio_items') as any)
    .insert({ owner_id: applicant.identityId, title, visibility: 'shared', cover_url: coverUrl })
    .select('id, title, summary, cover_url')
    .single()
  if (error) {
    console.error('[addPortfolioItemAction] insert failed', error)
    return { ok: false, error: 'generic' }
  }

  return { ok: true, item: data as PortfolioItemResult }
}

export type DeletePortfolioResult = { ok: true } | { ok: false; error: 'signedOut' | 'generic' }

export async function deletePortfolioItemAction(itemId: string): Promise<DeletePortfolioResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false, error: 'signedOut' }

  const supabase = await createAuthClient()
  const { error } = await supabase.from('portfolio_items').delete().eq('id', itemId).eq('owner_id', applicant.identityId)
  if (error) {
    console.error('[deletePortfolioItemAction] delete failed', error)
    return { ok: false, error: 'generic' }
  }
  return { ok: true }
}
