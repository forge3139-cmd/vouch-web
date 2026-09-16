export const CATEGORY_VALUES = [
  'ac_refrigeration',
  'tailoring',
  'carpentry',
  'electrical',
  'plumbing',
  'mechanics',
  'photography',
  'design',
  'other',
] as const

export type Category = (typeof CATEGORY_VALUES)[number]

/**
 * Bilingual labels for the directory's category chips. Kept separate from
 * lib/i18n.ts's flat dictionary since this is a fixed, enumerable list
 * naturally keyed by category value rather than by translation key.
 */
export const CATEGORY_LABELS: Record<Category, { en: string; sw: string }> = {
  ac_refrigeration: { en: 'AC & Refrigeration', sw: 'AC na Friji' },
  tailoring: { en: 'Tailoring', sw: 'Ushonaji' },
  carpentry: { en: 'Carpentry', sw: 'Useremala' },
  electrical: { en: 'Electrical', sw: 'Umeme' },
  plumbing: { en: 'Plumbing', sw: 'Mabomba' },
  mechanics: { en: 'Mechanics', sw: 'Ufundi Magari' },
  photography: { en: 'Photography', sw: 'Upigaji Picha' },
  design: { en: 'Design', sw: 'Ubunifu' },
  other: { en: 'Other', sw: 'Nyingine' },
}

export function isCategory(value: string): value is Category {
  return (CATEGORY_VALUES as readonly string[]).includes(value)
}
