export default function RadioPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-2xl border px-5 py-3 text-sm font-bold transition-colors ${
              active
                ? 'border-orange bg-orange text-white'
                : 'border-card-border bg-white text-ink'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
