'use server'

import { getSignedInApplicant } from './session'

/** Just enough for the site header: is someone signed in, and what to call
 * them. Resolved from the request's own session cookie, like every other
 * auth check — nothing here comes from the client. */
export type HeaderSession = { signedIn: false } | { signedIn: true; name: string; slug: string | null }

export async function getHeaderSessionAction(): Promise<HeaderSession> {
  const applicant = await getSignedInApplicant()
  if (!applicant) return { signedIn: false }
  return { signedIn: true, name: applicant.name, slug: applicant.slug }
}
