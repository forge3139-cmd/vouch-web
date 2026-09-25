import { CATEGORY_VALUES, type Category } from './categories'

/**
 * The application form's "what can you do?" chips, one list per trade —
 * unlike CAPABILITY_CHIPS (the old, pre-restructure list of trade NAMES),
 * these are actual skills within a trade, so a company can scan what a
 * specific applicant can do rather than just which trade they're in.
 * Chosen from the JOB's derived expertise tags (see categoryFromTags).
 * English label is what's stored, same convention as CATEGORY_LABELS.
 */
export const SKILLS_BY_CATEGORY: Record<Category, { en: string; sw: string }[]> = {
  ac_refrigeration: [
    { en: 'Installation', sw: 'Ufungaji' },
    { en: 'Diagnostics & troubleshooting', sw: 'Utambuzi wa hitilafu' },
    { en: 'Electrical wiring & controls', sw: 'Nyaya za umeme na vidhibiti' },
    { en: 'Gas charging & leak detection', sw: 'Kujaza gesi na kutambua uvujaji' },
    { en: 'Preventive maintenance', sw: 'Matengenezo ya kinga' },
    { en: 'Cold rooms & commercial systems', sw: 'Vyumba baridi na mifumo ya kibiashara' },
  ],
  tailoring: [
    { en: 'Pattern making & cutting', sw: 'Kukata na kutengeneza mfano' },
    { en: 'Machine sewing', sw: 'Kushona kwa mashine' },
    { en: 'Hand finishing & alterations', sw: 'Umaliziaji na marekebisho kwa mkono' },
    { en: 'Embroidery & embellishment', sw: 'Embroidery na mapambo' },
    { en: 'Measuring & fitting', sw: 'Kupima na kurekebisha' },
    { en: 'Garment design & styling', sw: 'Ubunifu wa mavazi' },
  ],
  carpentry: [
    { en: 'Furniture making', sw: 'Utengenezaji wa fanicha' },
    { en: 'Framing & structural work', sw: 'Ujenzi wa muundo wa mbao' },
    { en: 'Doors, windows & fittings', sw: "Milango, madirisha na vifaa vyake" },
    { en: 'Finishing & polishing', sw: "Umaliziaji na kung'arisha" },
    { en: 'Measuring & technical drawings', sw: 'Kupima na michoro ya kiufundi' },
    { en: 'Repairs & renovations', sw: 'Ukarabati na urekebishaji' },
  ],
  electrical: [
    { en: 'Wiring & installation', sw: 'Kufunga waya na umeme' },
    { en: 'Fault finding & repairs', sw: 'Kutambua na kurekebisha hitilafu' },
    { en: 'Circuit design & panels', sw: 'Ubunifu wa mzunguko na paneli' },
    { en: 'Lighting systems', sw: 'Mifumo ya taa' },
    { en: 'Safety testing & inspection', sw: 'Ukaguzi na upimaji wa usalama' },
    { en: 'Solar & backup power systems', sw: 'Mifumo ya jua na nishati ya akiba' },
  ],
  plumbing: [
    { en: 'Pipe installation & fitting', sw: 'Ufungaji wa mabomba' },
    { en: 'Leak detection & repairs', sw: 'Utambuzi na urekebishaji wa uvujaji' },
    { en: 'Drainage & sewerage systems', sw: 'Mifumo ya majitaka' },
    { en: 'Water heater installation', sw: 'Ufungaji wa hita za maji' },
    { en: 'Fixture installation (sinks, toilets, taps)', sw: 'Ufungaji wa vifaa (sinki, choo, mabomba madogo)' },
    { en: 'Borehole & water tank systems', sw: 'Mifumo ya kisima na matanki ya maji' },
  ],
  mechanics: [
    { en: 'Engine diagnostics & repair', sw: 'Utambuzi na ukarabati wa injini' },
    { en: 'Electrical systems', sw: 'Mifumo ya umeme wa gari' },
    { en: 'Brakes & suspension', sw: 'Breki na masprings' },
    { en: 'Servicing & maintenance', sw: 'Huduma na matengenezo ya kawaida' },
    { en: 'Bodywork & panel beating', sw: 'Ukarabati wa karoseri' },
    { en: 'Air conditioning systems', sw: 'Mifumo ya AC ya gari' },
  ],
  photography: [
    { en: 'Studio photography', sw: 'Upigaji picha studio' },
    { en: 'Event & wedding coverage', sw: 'Matukio na harusi' },
    { en: 'Photo editing & retouching', sw: 'Uhariri wa picha' },
    { en: 'Videography', sw: 'Uchoraji video' },
    { en: 'Product photography', sw: 'Upigaji picha za bidhaa' },
    { en: 'Drone photography', sw: 'Upigaji picha kwa drone' },
  ],
  design: [
    { en: 'Graphic design', sw: 'Ubunifu wa michoro' },
    { en: 'Branding & logo design', sw: 'Chapa na nembo' },
    { en: 'Print design', sw: 'Ubunifu wa machapisho' },
    { en: 'Social media content', sw: 'Maudhui ya mitandao ya kijamii' },
    { en: 'Web & UI design', sw: 'Ubunifu wa tovuti na UI' },
    { en: 'Illustration', sw: 'Uchoraji wa picha' },
  ],
  other: [
    { en: 'General labour', sw: 'Kazi za jumla' },
    { en: 'Customer service', sw: 'Huduma kwa wateja' },
    { en: 'Supervision & team leadership', sw: 'Usimamizi wa timu' },
    { en: 'Equipment operation', sw: 'Uendeshaji wa vifaa' },
    { en: 'Basic maintenance & repairs', sw: 'Matengenezo madogo' },
    { en: 'Administration & record keeping', sw: 'Utawala na kutunza kumbukumbu' },
  ],
}

/** Falls back to the generic "other" list for a job with no trade set —
 * same fallback CAPABILITY_CHIPS used to sidestep entirely by listing
 * every trade; now that skills are trade-specific, a job needs a list
 * either way. */
export function skillsForCategory(category: Category | null): { en: string; sw: string }[] {
  return SKILLS_BY_CATEGORY[category ?? 'other'] ?? SKILLS_BY_CATEGORY.other
}

/** Picks the skill list for a job from its derived expertise tags. The
 * synonym groups reuse the category slugs, so a 'plumbing' tag selects the
 * plumbing chips; a job matching no group gets the generic list. A
 * suggestion shortcut only — never a claim that anyone is qualified. */
export function categoryFromTags(tags: string[] | null | undefined): Category | null {
  for (const tag of tags ?? []) {
    if (tag !== 'other' && isValidCategoryValue(tag)) return tag
  }
  return null
}

export function skillEnLabels(category: Category | null): string[] {
  return skillsForCategory(category).map((s) => s.en)
}

export function isValidCategoryValue(value: string | null): value is Category {
  return !!value && (CATEGORY_VALUES as readonly string[]).includes(value)
}
