// Shared by server and client. Open work requests — posted to a whole
// trade, not one person — see vouch-open-requests.sql. Distinct from the
// existing no-account work_requests flow (WorkRequestFlow.tsx): this one
// requires sign-in and is shown with its own visual identity everywhere,
// never mixed into a Jobs list.

export type OpenRequestStatus = 'open' | 'assigned' | 'expired' | 'cancelled'
export type OpenRequestTiming = 'urgent_today' | 'within_24h' | 'this_week' | 'pick_date' | 'flexible'

export const TIMING_OPTIONS: { value: OpenRequestTiming; labelKey: 'timingUrgentToday' | 'timingWithin24h' | 'timingThisWeek' | 'timingPickDate' | 'timingFlexible' }[] = [
  { value: 'urgent_today', labelKey: 'timingUrgentToday' },
  { value: 'within_24h', labelKey: 'timingWithin24h' },
  { value: 'this_week', labelKey: 'timingThisWeek' },
  { value: 'pick_date', labelKey: 'timingPickDate' },
  { value: 'flexible', labelKey: 'timingFlexible' },
]

export interface OpenRequestDetail {
  id: string
  requester_id: string
  is_requester: boolean
  title: string
  description: string | null
  location: string | null
  expertise: string
  budget_text: string
  timing_text: string
  status: OpenRequestStatus
  respond_by: string
  choose_by: string | null
  response_count: number
  my_response_id: string | null
  my_note: string | null
  my_price: number | null
  work_request_id: string | null
  created_at: string
}

export interface OpenRequestResponse {
  response_id: string
  responder_id: string
  display_name: string
  slug: string | null
  note: string | null
  price: number | null
  price_currency: string
  records_confirmed: number
  distinct_confirmers: number
  repeat_clients: number
  standing: string
  responded_at: string
}

export interface MyOpenRequestRow {
  id: string
  title: string
  status: OpenRequestStatus
  created_at: string
}
