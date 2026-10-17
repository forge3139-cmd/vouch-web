import type { useT } from '@/components/LanguageContext'

/** "Today" / "3 days ago" / "2 months ago" — shared by anything showing a
 * timestamp as relative time (worker profile activity, job postings). */
export function formatRelative(iso: string, t: ReturnType<typeof useT>): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime())
  const day = 24 * 60 * 60 * 1000
  const days = Math.floor(diffMs / day)
  if (days < 1) return t('profile', 'today')
  if (days === 1) return t('profile', 'dayAgo')
  if (days < 30) return t('profile', 'daysAgo', { count: days })
  const months = Math.floor(days / 30)
  if (months === 1) return t('profile', 'monthAgo')
  if (months < 12) return t('profile', 'monthsAgo', { count: months })
  const years = Math.floor(months / 12)
  return years === 1 ? t('profile', 'yearAgo') : t('profile', 'yearsAgo', { count: years })
}
