import type { ReactNode } from 'react'

export type BadgeVariant = 'orange' | 'green' | 'blue' | 'outline' | 'onHero'
export type BadgeSize = 'sm' | 'md'

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  orange: 'bg-orange-light text-orange',
  green: 'bg-green-tint text-green',
  blue: 'bg-blue-light text-blue',
  outline: 'pill text-ink',
  onHero: 'border border-white/50 bg-white/25 text-white',
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-2.5 py-1 text-[11px]',
  md: 'px-3 py-1 text-xs',
}

/**
 * One pill for category badges, status badges ("Hired again"), and
 * removable filter chips — previously three copies of near-identical
 * inline styling. `onRemove` switches the padding to make room for the ×
 * and renders it; omit it for a plain, non-interactive badge.
 */
export default function Badge({
  children,
  variant = 'orange',
  size = 'md',
  onRemove,
  removeLabel = 'Remove',
  className = '',
}: {
  children: ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  onRemove?: () => void
  removeLabel?: string
  className?: string
}) {
  const sizeClasses = onRemove ? 'py-1.5 pl-3 pr-2 text-xs' : SIZE_CLASSES[size]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill font-bold ${VARIANT_CLASSES[variant]} ${sizeClasses} ${className}`}
    >
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={removeLabel} className="tap px-1 text-muted">
          ×
        </button>
      )}
    </span>
  )
}
