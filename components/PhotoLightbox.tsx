'use client'

export default function PhotoLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: string[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}) {
  const hasPrev = index > 0
  const hasNext = index < images.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white"
      >
        ×
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onIndexChange(index - 1)
          }}
          aria-label="Previous photo"
          className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white"
        >
          ‹
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onIndexChange(index + 1)
          }}
          aria-label="Next photo"
          className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white"
        >
          ›
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, shown full-size */}
      <img
        src={images[index]}
        alt=""
        className="max-h-[85dvh] max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
