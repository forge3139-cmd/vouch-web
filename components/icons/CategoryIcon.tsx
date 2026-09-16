import type { Category } from '@/lib/categories'

const commonProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const paths: Record<Category, React.ReactNode> = {
  ac_refrigeration: (
    <g>
      <path d="M12 3v18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5" />
      <path d="M4.5 7.5l15 9M4.5 7.5l3.3.6M4.5 7.5l1-3.1" />
      <path d="M19.5 16.5l-15-9M19.5 16.5l-3.3-.6M19.5 16.5l-1 3.1" />
    </g>
  ),
  tailoring: (
    <g>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M20 5L7.5 15.5M20 19L7.9 8.4" />
    </g>
  ),
  carpentry: (
    <g>
      <path d="M14.5 6.5l3 3L9 18l-4 1 1-4z" />
      <path d="M13 8l-8.5 8.5" />
      <path d="M17 3l4 4-2 2-4-4z" />
    </g>
  ),
  electrical: <path d="M13 2L4 14h6l-1 8 9-12h-6z" />,
  plumbing: (
    <g>
      <path d="M6 4h6v5a3 3 0 0 1-3 3 3 3 0 0 1-3-3z" />
      <path d="M9 12v4a3 3 0 0 0 3 3h6" />
      <path d="M15 15l3 3-3 3" />
    </g>
  ),
  mechanics: (
    <path d="M20.5 8.5a4 4 0 0 1-5.3 4.6L8 20.3a1.8 1.8 0 0 1-2.5-2.5l7.2-7.2A4 4 0 0 1 17.3 3l-2.6 2.6.9 2.7 2.7.9z" />
  ),
  photography: (
    <g>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </g>
  ),
  design: (
    <g>
      <path d="M4 20l4.5-1.2L19 8.3a1.8 1.8 0 0 0 0-2.6l-.7-.7a1.8 1.8 0 0 0-2.6 0L5.2 15.5z" />
      <path d="M14 6.5l3.5 3.5" />
    </g>
  ),
  other: (
    <g>
      <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </g>
  ),
}

export default function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      {paths[category]}
    </svg>
  )
}
