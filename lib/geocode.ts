import 'server-only'

/**
 * Reverse-geocodes via OpenStreetMap's Nominatim — free, no API key, which
 * matches this app's near-zero-dependency approach (and the map itself is
 * Leaflet + OSM tiles for the same reason). Done server-side (not a direct
 * client fetch) so we control the identifying User-Agent Nominatim's usage
 * policy requires, and so a slow/failed lookup never blocks the form on a
 * third-party outage — callers treat a null return as "couldn't geocode,
 * the pin and its coordinates are still fine on their own."
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VOUCH work-request form (reverse geocoding a client-shared location)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const address = (data?.address ?? {}) as Record<string, string | undefined>

    const parts = [
      address.road,
      address.suburb || address.neighbourhood,
      address.city || address.town || address.village,
    ].filter((part): part is string => !!part)

    if (parts.length > 0) return parts.join(', ')
    return typeof data?.display_name === 'string' ? data.display_name : null
  } catch {
    return null
  }
}
