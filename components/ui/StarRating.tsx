export default function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="text-4xl leading-none"
        >
          <span className={n <= value ? 'text-orange' : 'text-card-border'}>★</span>
        </button>
      ))}
    </div>
  )
}
