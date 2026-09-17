'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { reverseGeocodeAction } from '@/lib/geocodeActions'

// [lat, lng] — Leaflet's coordinate order.
const DAR_ES_SALAAM: [number, number] = [-6.7924, 39.2083]

// Leaflet's default marker icon points at image files whose paths break
// once bundled — a plain inline SVG divIcon sidesteps that entirely and
// keeps this dependency-free.
const pinIcon = L.divIcon({
  className: '',
  html: `<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="#E86C2A"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
})

export default function LocationMapPicker({
  lat,
  lng,
  onLocationChange,
}: {
  lat: number | null
  lng: number | null
  onLocationChange: (lat: number, lng: number, address: string | null) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false
    const initialCenter: [number, number] = lat !== null && lng !== null ? [lat, lng] : DAR_ES_SALAAM

    const map = L.map(containerRef.current).setView(initialCenter, 14)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const marker = L.marker(initialCenter, { draggable: true, icon: pinIcon }).addTo(map)

    async function commit(point: { lat: number; lng: number }) {
      let address: string | null = null
      try {
        address = await reverseGeocodeAction(point.lat, point.lng)
      } catch {
        address = null
      }
      if (!cancelled) onLocationChange(point.lat, point.lng, address)
    }

    marker.on('dragend', () => {
      const { lat: newLat, lng: newLng } = marker.getLatLng()
      commit({ lat: newLat, lng: newLng })
    })

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      commit({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    // Only auto-geolocate when there's no pin already picked (e.g. coming
    // back to this step via Back keeps whatever was chosen). Failure is
    // never surfaced here — the default Dar es Salaam view is a perfectly
    // fine starting point, and the user just pans and drops the pin
    // themselves.
    if (lat === null && lng === null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (cancelled) return
          const { latitude, longitude } = position.coords
          map.setView([latitude, longitude], 15)
          marker.setLatLng([latitude, longitude])
          commit({ lat: latitude, lng: longitude })
        },
        () => {
          // Permission denied, unavailable, or timed out — no error, no
          // blocker. The map just stays where it is.
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      )
    }

    return () => {
      cancelled = true
      map.remove()
    }
    // Deliberately mount-only — this only ever initializes the map once.
    // Re-running on every lat/lng change (which this component itself
    // causes via onLocationChange) would tear down and rebuild the map on
    // every pin move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-card-border">
      <div ref={containerRef} className="h-full w-full bg-card-border" />
    </div>
  )
}
