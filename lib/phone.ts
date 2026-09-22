/**
 * ONE phone rule, shared with vouch-web (lib/hiring.ts → normalizePhone).
 * The two projects are separate codebases, so this is the same function
 * copied verbatim — if you change one, change the other, or the same person
 * will be stored two ways and stop matching themselves.
 *
 * Normalises a phone number so tap-to-call works and the same person
 * can't apply twice by typing it two ways. Tanzanian local format
 * (0712 345 678) and 255… both become +255712345678; anything else keeps
 * its digits and an optional leading +. Returns null if it doesn't look
 * like a real number (7–15 digits, and never "+0…").
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim()
  const hasPlus = trimmed.startsWith('+')
  let digits = trimmed.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return null
  // "+" is followed by a country code, and no country code starts with 0.
  // "+0712…" is a mistyped local number, never a valid one — reject it
  // rather than store something that can't be dialled.
  if (hasPlus && digits.startsWith('0')) return null

  if (!hasPlus && digits.length === 10 && digits.startsWith('0')) {
    digits = `255${digits.slice(1)}`
    return `+${digits}`
  }
  if (!hasPlus && digits.startsWith('255') && digits.length === 12) {
    return `+${digits}`
  }
  return hasPlus ? `+${digits}` : digits
}

export type ParsedContact = { kind: 'email'; value: string } | { kind: 'phone'; value: string }

/**
 * A field that takes "phone or email" (signup, login, "their phone or
 * email"). Same either/or as vouch-web's sign-in: anything with an "@" is an
 * email; otherwise it must normalise to a full +country-code number, which
 * is the only shape Supabase auth accepts. Returns null if it is neither.
 */
export function parseContact(raw: string): ParsedContact | null {
  const value = raw.trim()
  if (!value) return null
  if (value.includes('@')) {
    return /^\S+@\S+\.\S+$/.test(value) ? { kind: 'email', value: value.toLowerCase() } : null
  }
  const phone = normalizePhone(value)
  return phone && phone.startsWith('+') ? { kind: 'phone', value: phone } : null
}

/** What to store for a "phone or email" value: the normalised form when it
 * parses, otherwise exactly what was given (trimmed) — never silently
 * dropped. */
export function storableContact(raw: string): string {
  return parseContact(raw)?.value ?? raw.trim()
}

/** A tel: URL for a stored number. Normalises when it can (so old, un-
 * normalised rows still dial correctly), and falls back to stripping spaces. */
export function telUrl(raw: string): string {
  return `tel:${normalizePhone(raw) ?? raw.replace(/\s+/g, '')}`
}
