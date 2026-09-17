'use server'

import { reverseGeocode } from './geocode'

export async function reverseGeocodeAction(lat: number, lon: number): Promise<string | null> {
  return reverseGeocode(lat, lon)
}
