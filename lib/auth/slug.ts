import 'server-only'
import { getSupabaseServerClient } from '../supabase'

// Same rules as the mobile app's lib/queries.ts, so a web signup gets the
// same kind of /w/{slug} an app signup does: lowercase, accents stripped,
// everything else collapsed to hyphens, at least 2 characters (else
// "user"), and -2, -3, … appended on a collision.
const COMBINING_DIACRITIC_RANGE = new RegExp('[̀-ͯ]', 'g')

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(COMBINING_DIACRITIC_RANGE, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function slugBase(name: string): string {
  const base = slugify(name)
  return base.length >= 2 ? base : 'user'
}

async function generateUniqueSlug(name: string, excludeIdentityId: string): Promise<string> {
  const supabase = getSupabaseServerClient()
  const base = slugBase(name)

  const { data, error } = await supabase
    .from('identities')
    .select('slug')
    .or(`slug.eq.${base},slug.like.${base}-%`)
    .neq('id', excludeIdentityId)
  if (error) throw error

  const taken = new Set(((data ?? []) as { slug: string | null }[]).map((r) => r.slug).filter(Boolean))
  if (!taken.has(base)) return base
  for (let suffix = 2; suffix < 10000; suffix++) {
    const candidate = `${base}-${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Gives an identity a slug if it has none. Idempotent and race-safe, like
 * the app's version: the `.is('slug', null)` guard means only one write
 * lands, and a loser re-reads what the winner wrote.
 */
export async function ensureIdentitySlug(
  identityId: string,
  displayName: string,
  currentSlug: string | null
): Promise<string | null> {
  if (currentSlug) return currentSlug

  const supabase = getSupabaseServerClient()
  const slug = await generateUniqueSlug(displayName, identityId)

  // The client isn't typed against a generated Database schema (see lib/supabase.ts), so updates need the cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (supabase.from('identities') as any)
    .update({ slug })
    .eq('id', identityId)
    .is('slug', null)
    .select('slug')
    .maybeSingle()

  if (error || !updated) {
    const { data } = await supabase
      .from('identities')
      .select('slug')
      .eq('id', identityId)
      .maybeSingle<{ slug: string | null }>()
    return data?.slug ?? null
  }
  return updated.slug as string
}
