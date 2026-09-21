'use client'

import { useEffect, useRef } from 'react'

const STAGGER_MS = 40
const MAX_STAGGER_STEPS = 8

/**
 * Reveals an element (opacity + slight upward offset → visible) the first
 * time it scrolls into view, staggered by list position. The animation
 * itself — and its absence under prefers-reduced-motion — lives entirely
 * in globals.css (.reveal-on-scroll / .is-revealed); this hook only
 * decides *when* to add the revealed class, never *how* it looks. Under
 * reduced motion the CSS rule doesn't exist at all, so this still runs
 * harmlessly but has no visible effect.
 *
 * Stagger is capped at 8 steps (320ms) so a long list doesn't queue up a
 * multi-second delay for items far down the page — the cascade is only
 * meant to read as "these appeared together," not as a growing wait.
 */
export function useScrollReveal<T extends HTMLElement>(index = 0) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    node.style.animationDelay = `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms`

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('is-revealed')
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(node)

    return () => observer.disconnect()
  }, [index])

  return ref
}
