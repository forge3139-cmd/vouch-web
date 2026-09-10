'use server'

import { getSupabaseServerClient } from './supabase'
import type { ConfirmationInsert, DisputeInsert } from './types'

const paymentStatusToClientAnswer: Record<string, string> = {
  paid: 'yes',
  unpaid: 'not_yet',
  partial: 'partly',
}

async function getValidOpenLink(token: string) {
  const supabase = getSupabaseServerClient()
  const { data: link } = await supabase
    .from('confirmation_links')
    .select('id, record_id, sent_to, completed_at, expires_at')
    .eq('token', token)
    .maybeSingle<{
      id: string
      record_id: string
      sent_to: string | null
      completed_at: string | null
      expires_at: string
    }>()

  if (!link) throw new Error('Link not found')
  if (link.completed_at) throw new Error('This link was already used')
  if (new Date(link.expires_at).getTime() < Date.now()) throw new Error('This link has expired')

  return { supabase, link }
}

export async function logStep(token: string, step: string) {
  try {
    const supabase = getSupabaseServerClient()
    await (supabase.from('confirmation_links') as any)
      .update({ last_step_reached: step })
      .eq('token', token)
      .is('completed_at', null)
  } catch (error) {
    // Still best-effort — never block the visitor on it — but a silent
    // failure here means the abandonment data just quietly stops being
    // trustworthy, so it goes to the server log instead of vanishing.
    console.error('[logStep] failed to record last_step_reached', { token, step, error })
  }
}

export interface SubmitConfirmationResult {
  ok: boolean
  confirmedCount: number
  error?: string
}

export async function submitConfirmationAction(
  _prevState: SubmitConfirmationResult,
  formData: FormData
): Promise<SubmitConfirmationResult> {
  const token = String(formData.get('token') ?? '')

  let supabase, link
  try {
    ;({ supabase, link } = await getValidOpenLink(token))
  } catch (err) {
    return { ok: false, confirmedCount: 0, error: (err as Error).message }
  }

  const workHappened = formData.get('workHappened') === 'yes'
  const what = String(formData.get('what') ?? '').trim()
  const originalWhat = String(formData.get('originalWhat') ?? '').trim()
  const whenMonth = String(formData.get('whenMonth') ?? '')
  const wasCompleted = formData.get('wasCompleted') === 'partly' ? 'partly' : 'yes'
  const rating = Number(formData.get('rating') ?? 0) || null
  const wouldWorkAgainRaw = String(formData.get('wouldWorkAgain') ?? '')
  const wouldWorkAgain =
    wouldWorkAgainRaw === 'yes' || wouldWorkAgainRaw === 'maybe' || wouldWorkAgainRaw === 'no'
      ? wouldWorkAgainRaw
      : null
  const clientPaymentStatusRaw = String(formData.get('clientPaymentStatus') ?? '')
  const clientPaymentStatus =
    clientPaymentStatusRaw === 'yes' || clientPaymentStatusRaw === 'not_yet' || clientPaymentStatusRaw === 'partly'
      ? clientPaymentStatusRaw
      : null
  const photo = formData.get('photo')

  const records = () => supabase.from('records') as any

  if (what && what !== originalWhat) {
    await records().update({ description: what }).eq('id', link.record_id)
  }

  if (whenMonth) {
    const endedAt = new Date(`${whenMonth}-01T00:00:00.000Z`).toISOString()
    await records().update({ ended_at: endedAt }).eq('id', link.record_id)
  }

  const confirmation: ConfirmationInsert = {
    record_id: link.record_id,
    confirmer_id: null,
    confirmer_name: null,
    confirmer_contact: link.sent_to,
    strength: 0,
    work_happened: workHappened,
    delivered_on_time: wasCompleted === 'yes',
    would_work_again: wouldWorkAgain,
    rating_reliability: rating,
    rating_quality: rating,
    rating_communication: rating,
    rating_timeliness: rating,
    comment: null,
    client_payment_status: clientPaymentStatus,
  }

  const { data: insertedConfirmation } = await (supabase.from('confirmations') as any)
    .insert(confirmation)
    .select('id')
    .single()

  await records()
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', link.record_id)

  if (clientPaymentStatus) {
    const { data: paymentRecord } = await supabase
      .from('records')
      .select('payment_status')
      .eq('id', link.record_id)
      .maybeSingle<{ payment_status: string | null }>()

    const workerAnswer = paymentRecord?.payment_status
      ? paymentStatusToClientAnswer[paymentRecord.payment_status]
      : null

    if (workerAnswer && workerAnswer !== clientPaymentStatus) {
      const dispute: DisputeInsert = {
        record_id: link.record_id,
        confirmation_id: insertedConfirmation?.id ?? null,
        raised_by: null,
        reason_code: 'payment_mismatch',
        explanation: `Worker recorded "${paymentRecord?.payment_status}", client answered "${clientPaymentStatus}".`,
        status: 'open',
      }
      await (supabase.from('disputes') as any).insert(dispute)
    }
  }

  if (photo instanceof File && photo.size > 0) {
    const path = `${link.record_id}/confirmer-${Date.now()}-${photo.name}`
    const { data: uploaded } = await supabase.storage
      .from('proofs')
      .upload(path, photo, { contentType: photo.type })

    if (uploaded) {
      const { data: publicUrl } = supabase.storage.from('proofs').getPublicUrl(uploaded.path)
      await (supabase.from('proofs') as any).insert({
        record_id: link.record_id,
        uploaded_by: null,
        side: 'confirmer',
        file_url: publicUrl.publicUrl,
        media_type: photo.type,
        caption: null,
      })
    }
  }

  await (supabase.from('confirmation_links') as any)
    .update({ completed_at: new Date().toISOString(), last_step_reached: 'success' })
    .eq('id', link.id)

  const { data: record } = await supabase
    .from('records')
    .select('worker_id')
    .eq('id', link.record_id)
    .maybeSingle<{ worker_id: string }>()

  const { count } = await supabase
    .from('records')
    .select('id', { count: 'exact', head: true })
    .eq('worker_id', record?.worker_id ?? '')
    .eq('status', 'confirmed')

  return { ok: true, confirmedCount: count ?? 1 }
}

export interface DeclineResult {
  ok: boolean
  error?: string
}

export async function declineConfirmationAction(
  _prevState: DeclineResult,
  formData: FormData
): Promise<DeclineResult> {
  const token = String(formData.get('token') ?? '')
  const reason = formData.get('reason')

  let supabase, link
  try {
    ;({ supabase, link } = await getValidOpenLink(token))
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }

  const confirmation: ConfirmationInsert = {
    record_id: link.record_id,
    confirmer_id: null,
    confirmer_name: null,
    confirmer_contact: link.sent_to,
    strength: 0,
    work_happened: false,
    delivered_on_time: null,
    would_work_again: null,
    rating_reliability: null,
    rating_quality: null,
    rating_communication: null,
    rating_timeliness: null,
    comment: typeof reason === 'string' && reason.trim() ? reason.trim() : null,
  }

  await (supabase.from('confirmations') as any).insert(confirmation)

  await (supabase.from('confirmation_links') as any)
    .update({ completed_at: new Date().toISOString(), last_step_reached: 'declined' })
    .eq('id', link.id)

  return { ok: true }
}
