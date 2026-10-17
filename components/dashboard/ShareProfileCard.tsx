'use client'

import { useState } from 'react'
import { useT } from '@/components/LanguageContext'

export default function ShareProfileCard({ slug }: { slug: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}/w/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission denied or unavailable — the link is still
      // right there on the profile page itself, nothing else to do here.
    }
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-dash-navy-mid p-4 text-ink">
      <p className="text-[13px] font-extrabold">{t('dashboard', 'shareProfile')}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink/65">{t('dashboard', 'shareProfileBody')}</p>
      <button type="button" onClick={handleCopy} className="tap mt-3 w-full rounded-full bg-ink py-2 text-xs font-bold text-white">
        {copied ? t('dashboard', 'linkCopied') : t('dashboard', 'copyLink')}
      </button>
    </section>
  )
}
