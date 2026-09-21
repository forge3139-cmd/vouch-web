'use client'

import dynamic from 'next/dynamic'
import { useT } from '@/components/LanguageContext'

// Only loaded once the sheet actually opens — most people never tap
// "Pick on a map" at all now that the current-location button is the
// primary path, so this keeps Leaflet out of the bundle until it's asked
// for, same as the rest of this form.
const LocationMapPicker = dynamic(() => import('@/components/LocationMapPicker'), {
  ssr: false,
  loading: () => <MapPlaceholder />,
})

function MapPlaceholder() {
  const t = useT()
  return (
    <div className="flex h-full w-full items-center justify-center rounded-card border border-card-border bg-card-border text-sm font-semibold text-muted">
      {t('request', 'mapLoading')}
    </div>
  )
}

export default function MapPickerSheet({
  open,
  lat,
  lng,
  onClose,
  onLocationChange,
}: {
  open: boolean
  lat: number | null
  lng: number | null
  onClose: () => void
  onLocationChange: (lat: number, lng: number, address: string | null) => void
}) {
  const t = useT()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div className="glass relative z-10 flex w-full max-w-[560px] flex-col rounded-t-3xl rounded-b-none p-4 pb-6 shadow-float">
        <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-card-border" />
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-ink">{t('request', 'mapSheetTitle')}</p>
          <button type="button" onClick={onClose} className="text-sm font-bold text-orange">
            {t('request', 'mapSheetDone')}
          </button>
        </div>
        <div className="h-[60vh] w-full">
          <LocationMapPicker lat={lat} lng={lng} onLocationChange={onLocationChange} />
        </div>
      </div>
    </div>
  )
}
