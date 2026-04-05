import { NextRequest, NextResponse } from 'next/server'

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat')
  const lng = request.nextUrl.searchParams.get('lng')
  const address = request.nextUrl.searchParams.get('address')

  // Reverse geocoding: lat/lng → address
  if (lat && lng) {
    const res = await fetch(
      `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'DinnerJump/1.0' } }
    )
    const data = await res.json()
    if (data.error) return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    return NextResponse.json({
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      displayName: data.display_name,
    })
  }

  // Forward geocoding: address → lat/lng
  if (!address) return NextResponse.json({ error: 'Address or coordinates required' }, { status: 400 })

  const res = await fetch(
    `${NOMINATIM_BASE}/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=nl,be,de`,
    { headers: { 'User-Agent': 'DinnerJump/1.0' } }
  )
  const data = await res.json()

  if (!data.length) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

  return NextResponse.json({
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  })
}
