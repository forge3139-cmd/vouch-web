import { CATEGORY_VALUES, CATEGORY_LABELS, type Category } from './categories'
import type { Lang } from './i18n'

/**
 * Expertise and capabilities are whatever the person types, stored and
 * shown verbatim. The old categories survive only as optional suggestion
 * chips that fill the field — a shortcut, never a limit. The database
 * derives search tags from the raw text (vouch-expertise.sql); nothing
 * here normalises what gets stored.
 */
export const MAX_EXPERTISE_ENTRIES = 6
export const MAX_EXPERTISE_LENGTH = 80
export const MAX_CAPABILITIES_ENTRIES = 12

/** 'other' is dropped: with free text, typing is the "other". */
export function expertiseSuggestions(lang: Lang): string[] {
  return (CATEGORY_VALUES as readonly Category[]).filter((c) => c !== 'other').map((c) => CATEGORY_LABELS[c][lang])
}

export function cleanExpertiseEntry(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_EXPERTISE_LENGTH)
}

export function addExpertise(values: string[], entry: string, max = MAX_EXPERTISE_ENTRIES): string[] {
  const cleaned = cleanExpertiseEntry(entry)
  if (!cleaned) return values
  if (values.some((v) => v.toLowerCase() === cleaned.toLowerCase())) return values
  if (values.length >= max) return values
  return [...values, cleaned]
}

export function withDraft(values: string[], draft: string, max = MAX_EXPERTISE_ENTRIES): string[] {
  return addExpertise(values, draft, max)
}
