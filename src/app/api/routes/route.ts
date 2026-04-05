export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api/directions/json'

export async function POST(request: NextRequest) {
  const { origins, mode } = await request.json() as {
    origins: Array<{ originLat: number; originLng: number; destLat: number; destLng: number }>
    mode: 'bicycling' | 'driving'
  }

  if (!origins?.length || !mode) {
    return NextResponse.json({ error: 'Missing origins or mode' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
  }

  const supabase = createAdminClient()
  const results: Array<{ originLat: number; originLng: number; destLat: number; destLng: number; durationMinutes: number; distanceKm: number }> = []

  for (const origin of origins) {
    // Check cache
    const { data: cached } = await supabase.from('route_cache')
      .select('duration_minutes, distance_km')
      .eq('origin_lat', origin.originLat)
      .eq('origin_lng', origin.originLng)
      .eq('dest_lat', origin.destLat)
      .eq('dest_lng', origin.destLng)
      .eq('mode', mode)
      .single()

    if (cached) {
      results.push({ ...origin, durationMinutes: cached.duration_minutes, distanceKm: cached.distance_km })
      continue
    }

    // Fetch from Google Maps
    const url = new URL(GOOGLE_MAPS_API_URL)
    url.searchParams.set('origin', `${origin.originLat},${origin.originLng}`)
    url.searchParams.set('destination', `${origin.destLat},${origin.destLng}`)
    url.searchParams.set('mode', mode)
    url.searchParams.set('key', apiKey)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === 'OK' && data.routes.length > 0) {
      const leg = data.routes[0].legs[0]
      const durationMinutes = Math.round(leg.duration.value / 60 * 10) / 10
      const distanceKm = Math.round(leg.distance.value / 1000 * 100) / 100

      await supabase.from('route_cache').insert({
        origin_lat: origin.originLat, origin_lng: origin.originLng,
        dest_lat: origin.destLat, dest_lng: origin.destLng,
        mode, duration_minutes: durationMinutes, distance_km: distanceKm,
      })

      results.push({ ...origin, durationMinutes, distanceKm })
    }
  }

  return NextResponse.json({ routes: results })
}
