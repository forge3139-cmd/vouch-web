// How many applications were sent on each day of the current week, in
// Africa/Dar_es_Salaam — the same timezone every other date on this page
// is shown in (see ApplicationsView's `fmt`), so "today" lines up with the
// one the person is actually in, not whatever their device thinks it is.

const TZ = 'Africa/Dar_es_Salaam'

export interface WeeklyActivityDay {
  /** YYYY-MM-DD in Africa/Dar_es_Salaam. */
  date: string
  count: number
}

export interface WeeklyActivity {
  /** Monday first, 7 entries. */
  days: WeeklyActivityDay[]
  total: number
  previousTotal: number
}

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

function addDays(dateKey: string, n: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return dayKey(d)
}

function mondayOf(dateKey: string): string {
  const dow = new Date(`${dateKey}T00:00:00Z`).getUTCDay() // 0 = Sun .. 6 = Sat
  return addDays(dateKey, dow === 0 ? -6 : 1 - dow)
}

export function computeWeeklyActivity(appliedAtTimestamps: string[], now: Date = new Date()): WeeklyActivity {
  const thisMonday = mondayOf(dayKey(now))
  const lastMonday = addDays(thisMonday, -7)

  const counts = new Map<string, number>()
  for (const iso of appliedAtTimestamps) {
    const key = dayKey(new Date(iso))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const days: WeeklyActivityDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(thisMonday, i)
    return { date, count: counts.get(date) ?? 0 }
  })

  let previousTotal = 0
  for (let i = 0; i < 7; i++) previousTotal += counts.get(addDays(lastMonday, i)) ?? 0

  return { days, total: days.reduce((sum, d) => sum + d.count, 0), previousTotal }
}
