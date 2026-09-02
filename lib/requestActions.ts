'use server'

import { getSupabaseServerClient } from './supabase'

export interface SubmitWorkRequestInput {
  slug: string
  title: string
  description: string
  specifications: string
  location: string
  neededBy: string
  clientName: string
  clientPhone: string
  photos: File[]
}

export interface SubmitWorkRequestResult {
  ok: boolean
  error?: string
}

/**
 * No price field on purpose — the worker calls to agree a price by phone
 * and enters it in the app later. This just gets the request to them.
 */
export async function submitWorkRequestAction(
  input: SubmitWorkRequestInput
): Promise<SubmitWorkRequestResult> {
  const supabase = getSupabaseServerClient()

  const { data: worker } = await supabase
    .from('identities')
    .select('id')
    .eq('slug', input.slug)
    .maybeSingle<{ id: string }>()

  if (!worker) {
    return { ok: false, error: 'Could not find this page. Please check the link.' }
  }

  if (!input.title.trim() || !input.clientPhone.trim()) {
    return { ok: false, error: 'Missing required information.' }
  }

  const { data: request, error: requestError } = await (supabase.from('work_requests') as any)
    .insert({
      worker_id: worker.id,
      slug_used: input.slug,
      title: input.title.trim(),
      description: input.description.trim() || null,
      specifications: input.specifications.trim() || null,
      location: input.location.trim() || null,
      needed_by: input.neededBy || null,
      client_name: input.clientName.trim(),
      client_phone: input.clientPhone.trim(),
      status: 'pending',
    })
    .select('id')
    .single()

  if (requestError || !request) {
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }

  for (const photo of input.photos) {
    if (!(photo instanceof File) || photo.size === 0) continue

    const path = `${request.id}/${Date.now()}-${photo.name}`
    const { data: uploaded } = await supabase.storage
      .from('work-request-photos')
      .upload(path, photo, { contentType: photo.type })

    if (uploaded) {
      const { data: publicUrl } = supabase.storage.from('work-request-photos').getPublicUrl(uploaded.path)
      await (supabase.from('work_request_photos') as any).insert({
        work_request_id: request.id,
        file_url: publicUrl.publicUrl,
        media_type: photo.type,
      })
    }
    // Photos are optional and never required — a failed upload here
    // shouldn't undo an otherwise-successful request.
  }

  return { ok: true }
}
