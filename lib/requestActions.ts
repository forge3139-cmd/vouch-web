'use server'

import { getSupabaseServerClient } from './supabase'
import { getClientIp, recordAttempt } from './rateLimit'
import { MAX_PHOTOS_PER_SUBMISSION, validateImageFile } from './fileValidation'
import { storableContact } from './phone'

export interface SubmitWorkRequestResult {
  ok: boolean
  error?: string
}

// One IP sending work requests to worker after worker, over and over, is
// spam rather than someone hiring for real jobs — five per hour is
// generous for a genuine visitor and a real ceiling for a script.
const REQUEST_SUBMIT_LIMIT = 5
const REQUEST_SUBMIT_WINDOW_MS = 60 * 60 * 1000

/**
 * No price field on purpose — the worker calls to agree a price by phone
 * and enters it in the app later. This just gets the request to them.
 *
 * Takes FormData rather than a plain object with a `photos: File[]` field —
 * that was the original shape, and it silently failed to deliver files:
 * a File[] nested inside a larger plain-object argument doesn't reliably
 * survive the Server Action network boundary. FormData is the documented,
 * reliable transport for file uploads through Server Actions.
 */
export async function submitWorkRequestAction(formData: FormData): Promise<SubmitWorkRequestResult> {
  const ip = await getClientIp()
  if (recordAttempt(`work-request-submit:${ip}`, REQUEST_SUBMIT_LIMIT, REQUEST_SUBMIT_WINDOW_MS)) {
    return { ok: false, error: 'Too many requests. Please try again later.' }
  }

  const slug = String(formData.get('slug') ?? '')
  const title = String(formData.get('title') ?? '')
  const description = String(formData.get('description') ?? '')
  const specifications = String(formData.get('specifications') ?? '')
  const location = String(formData.get('location') ?? '')
  const locationLatRaw = formData.get('locationLat')
  const locationLngRaw = formData.get('locationLng')
  const locationLat = typeof locationLatRaw === 'string' && locationLatRaw ? Number(locationLatRaw) : null
  const locationLng = typeof locationLngRaw === 'string' && locationLngRaw ? Number(locationLngRaw) : null
  const neededBy = String(formData.get('neededBy') ?? '')
  const clientName = String(formData.get('clientName') ?? '')
  const clientPhone = String(formData.get('clientPhone') ?? '')
  const photos = formData
    .getAll('photos')
    .filter((p): p is File => p instanceof File)
    .slice(0, MAX_PHOTOS_PER_SUBMISSION)

  const supabase = getSupabaseServerClient()

  const { data: worker } = await supabase
    .from('identities')
    .select('id')
    .eq('slug', slug)
    .maybeSingle<{ id: string }>()

  if (!worker) {
    return { ok: false, error: 'Could not find this page. Please check the link.' }
  }

  if (!title.trim() || !clientPhone.trim()) {
    return { ok: false, error: 'Missing required information.' }
  }

  const { data: request, error: requestError } = await (supabase.from('work_requests') as any)
    .insert({
      worker_id: worker.id,
      slug_used: slug,
      title: title.trim(),
      description: description.trim() || null,
      specifications: specifications.trim() || null,
      location: location.trim() || null,
      location_lat: Number.isFinite(locationLat) ? locationLat : null,
      location_lng: Number.isFinite(locationLng) ? locationLng : null,
      needed_by: neededBy || null,
      client_name: clientName.trim(),
      // Same rule everywhere: 0712… is stored as +255712…, matching how the
      // mobile app treats this same field when it copies it onto a
      // confirmation link (storableContact(request.client_phone)).
      client_phone: storableContact(clientPhone),
      status: 'pending',
    })
    .select('id')
    .single()

  if (requestError || !request) {
    console.error('[submitWorkRequestAction] work_requests insert failed', requestError)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }

  for (const photo of photos) {
    const validation = await validateImageFile(photo)
    if (!validation.ok) {
      // Same "never undo the request over an optional photo" policy as a
      // failed upload below — an invalid file is dropped, logged, and
      // submission continues.
      console.error('[submitWorkRequestAction] rejected photo', { name: photo.name, reason: validation.reason })
      continue
    }

    const path = `${request.id}/${Date.now()}-${photo.name}`
    const { data: uploaded, error: uploadError } = await supabase.storage
      .from('work-request-photos')
      .upload(path, photo, { contentType: validation.contentType })

    if (uploadError || !uploaded) {
      // Photos are optional and never required — a failed upload here
      // shouldn't undo an otherwise-successful request. But it must not
      // fail silently either, or a real transport bug (like this one) just
      // recurs unnoticed.
      console.error('[submitWorkRequestAction] photo upload failed', { path, error: uploadError })
      continue
    }

    const { data: publicUrl } = supabase.storage.from('work-request-photos').getPublicUrl(uploaded.path)
    const { error: photoInsertError } = await (supabase.from('work_request_photos') as any).insert({
      work_request_id: request.id,
      file_url: publicUrl.publicUrl,
      media_type: validation.contentType,
    })

    if (photoInsertError) {
      console.error('[submitWorkRequestAction] work_request_photos insert failed', { path, error: photoInsertError })
    }
  }

  return { ok: true }
}
