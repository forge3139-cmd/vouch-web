'use server'

import { getSupabaseServerClient } from './supabase'

export interface SubmitWorkRequestResult {
  ok: boolean
  error?: string
}

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
  const slug = String(formData.get('slug') ?? '')
  const title = String(formData.get('title') ?? '')
  const description = String(formData.get('description') ?? '')
  const specifications = String(formData.get('specifications') ?? '')
  const location = String(formData.get('location') ?? '')
  const neededBy = String(formData.get('neededBy') ?? '')
  const clientName = String(formData.get('clientName') ?? '')
  const clientPhone = String(formData.get('clientPhone') ?? '')
  const photos = formData.getAll('photos').filter((p): p is File => p instanceof File)

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
      needed_by: neededBy || null,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      status: 'pending',
    })
    .select('id')
    .single()

  if (requestError || !request) {
    console.error('[submitWorkRequestAction] work_requests insert failed', requestError)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }

  for (const photo of photos) {
    if (photo.size === 0) continue

    const path = `${request.id}/${Date.now()}-${photo.name}`
    const { data: uploaded, error: uploadError } = await supabase.storage
      .from('work-request-photos')
      .upload(path, photo, { contentType: photo.type })

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
      media_type: photo.type,
    })

    if (photoInsertError) {
      console.error('[submitWorkRequestAction] work_request_photos insert failed', { path, error: photoInsertError })
    }
  }

  return { ok: true }
}
