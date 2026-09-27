'use server'

import { createAuthClient } from './auth/client'
import { getSignedInApplicant } from './auth/session'
import { getClientIp, recordAttempt } from './rateLimit'
import { MAX_PHOTOS_PER_SUBMISSION, validateImageFile } from './fileValidation'
import { normalizePhone } from './phone'
import type { MyOpenRequestRow, OpenRequestDetail, OpenRequestResponse, OpenRequestTiming } from './openRequests'

export type CreateOpenRequestErrorCode = 'signedOut' | 'invalid' | 'phone' | 'tooMany' | 'generic'
export type CreateOpenRequestResult = { ok: true; id: string } | { ok: false; error: CreateOpenRequestErrorCode }

const POST_LIMIT = 5
const POST_WINDOW_MS = 60 * 60 * 1000

/**
 * Sign-in is required to post (unlike the no-account /w/{slug} flow) — an
 * open request is matched and notified to a whole trade, so it needs a
 * persistent identity to receive responses against. The RULE (what counts
 * as valid, the matching, the notification) lives in the ONE database
 * function both this and a future mobile poster would call:
 * create_open_request (vouch-open-requests.sql).
 */
export async function createOpenRequestAction(formData: FormData): Promise<CreateOpenRequestResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false, error: 'signedOut' }

  const ip = await getClientIp()
  if (recordAttempt(`open-request-post:${ip}`, POST_LIMIT, POST_WINDOW_MS)) {
    return { ok: false, error: 'tooMany' }
  }

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const location = String(formData.get('location') ?? '').trim()
  const locationLatRaw = formData.get('locationLat')
  const locationLngRaw = formData.get('locationLng')
  const locationLat = typeof locationLatRaw === 'string' && locationLatRaw ? Number(locationLatRaw) : null
  const locationLng = typeof locationLngRaw === 'string' && locationLngRaw ? Number(locationLngRaw) : null
  const expertise = String(formData.get('expertise') ?? '').trim()
  const budgetMinRaw = String(formData.get('budgetMin') ?? '').trim()
  const budgetMaxRaw = String(formData.get('budgetMax') ?? '').trim()
  const budgetMin = budgetMinRaw ? Number(budgetMinRaw) : null
  const budgetMax = budgetMaxRaw ? Number(budgetMaxRaw) : null
  const budgetNegotiable = String(formData.get('budgetNegotiable') ?? '') === 'yes'
  const timing = String(formData.get('timing') ?? '') as OpenRequestTiming
  const neededBy = String(formData.get('neededBy') ?? '') || null
  const phoneRaw = String(formData.get('phone') ?? '')

  if (!title || !expertise) return { ok: false, error: 'invalid' }

  const phone = applicant.phone || normalizePhone(phoneRaw)
  if (!phone) return { ok: false, error: 'phone' }

  const supabase = await createAuthClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('create_open_request', {
    p_title: title,
    p_description: description || null,
    p_location: location || null,
    p_location_lat: Number.isFinite(locationLat) ? locationLat : null,
    p_location_lng: Number.isFinite(locationLng) ? locationLng : null,
    p_expertise: expertise,
    p_budget_min: Number.isFinite(budgetMin) ? budgetMin : null,
    p_budget_max: Number.isFinite(budgetMax) ? budgetMax : null,
    p_budget_negotiable: budgetNegotiable,
    p_timing: timing,
    p_needed_by: timing === 'pick_date' ? neededBy : null,
    p_requester_phone: phone,
  })

  if (error) {
    console.error('[createOpenRequestAction] rpc failed', error)
    return { ok: false, error: 'generic' }
  }
  const result = data as { ok: boolean; error?: string; open_request_id?: string }
  if (!result.ok || !result.open_request_id) {
    return { ok: false, error: result.error === 'invalid' ? 'invalid' : 'generic' }
  }

  const photos = formData.getAll('photos').filter((p): p is File => p instanceof File).slice(0, MAX_PHOTOS_PER_SUBMISSION)
  for (const photo of photos) {
    const validation = await validateImageFile(photo)
    if (!validation.ok) {
      console.error('[createOpenRequestAction] rejected photo', { name: photo.name, reason: validation.reason })
      continue
    }
    const path = `${result.open_request_id}/${Date.now()}-${photo.name}`
    const { data: uploaded, error: uploadError } = await supabase.storage
      .from('open-request-photos')
      .upload(path, photo, { contentType: validation.contentType })
    if (uploadError || !uploaded) {
      console.error('[createOpenRequestAction] photo upload failed', { path, error: uploadError })
      continue
    }
    const { data: publicUrl } = supabase.storage.from('open-request-photos').getPublicUrl(uploaded.path)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: photoInsertError } = await (supabase.from('open_request_photos') as any).insert({
      open_request_id: result.open_request_id,
      file_url: publicUrl.publicUrl,
      media_type: validation.contentType,
    })
    if (photoInsertError) {
      console.error('[createOpenRequestAction] open_request_photos insert failed', { path, error: photoInsertError })
    }
  }

  return { ok: true, id: result.open_request_id }
}

export async function listMyOpenRequestsAction(): Promise<MyOpenRequestRow[] | null> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return null

  const supabase = await createAuthClient()
  const { data, error } = await supabase
    .from('open_requests')
    .select('id, title, status, created_at')
    .eq('requester_id', applicant.identityId)
    .order('created_at', { ascending: false })
    .returns<MyOpenRequestRow[]>()
  if (error) {
    console.error('[listMyOpenRequestsAction] query failed', error)
    return null
  }
  return data ?? []
}

export type OpenRequestDetailResult = { ok: true; detail: OpenRequestDetail } | { ok: false; error: 'signedOut' | 'notFound' | 'generic' }

export async function getOpenRequestAction(id: string): Promise<OpenRequestDetailResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false, error: 'signedOut' }

  const supabase = await createAuthClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_open_request', { p_id: id })
  if (error) {
    console.error('[getOpenRequestAction] rpc failed', error)
    return { ok: false, error: 'generic' }
  }
  if (!data) return { ok: false, error: 'notFound' }
  return { ok: true, detail: data as OpenRequestDetail }
}

export async function getOpenRequestResponsesAction(id: string): Promise<OpenRequestResponse[] | null> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return null

  const supabase = await createAuthClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_open_request_responses', { p_open_request_id: id })
  if (error) {
    console.error('[getOpenRequestResponsesAction] rpc failed', error)
    return null
  }
  return (data ?? []) as OpenRequestResponse[]
}

export type ChooseOpenRequestResult = { ok: true; workRequestId: string } | { ok: false; error: 'notFound' | 'closed' | 'generic' }

export async function chooseOpenRequestResponseAction(responseId: string): Promise<ChooseOpenRequestResult> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { ok: false, error: 'generic' }

  const supabase = await createAuthClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('choose_open_request_response', { p_response_id: responseId })
  if (error) {
    console.error('[chooseOpenRequestResponseAction] rpc failed', error)
    return { ok: false, error: 'generic' }
  }
  const result = data as { ok: boolean; error?: string; work_request_id?: string }
  if (result.ok && result.work_request_id) return { ok: true, workRequestId: result.work_request_id }
  return { ok: false, error: result.error === 'not_found' ? 'notFound' : result.error === 'closed' ? 'closed' : 'generic' }
}
