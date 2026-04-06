'use client'

import { useCallback, useRef, useEffect } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'

const containerStyle = { width: '100%', height: '350px' }

type Props = {
  center: { lat: number; lng: number }
  radius: number
  onCenterChange: (lat: number, lng: number) => void
}

function computeBounds(center: { lat: number; lng: number }, radiusMeters: number) {
  const R = 6371000
  const dLat = (radiusMeters / R) * (180 / Math.PI)
  const dLng = (radiusMeters / (R * Math.cos((center.lat * Math.PI) / 180))) * (180 / Math.PI)
  return {
    south: center.lat - dLat,
    north: center.lat + dLat,
    west: center.lng - dLng,
    east: center.lng + dLng,
  }
}

export function GoogleMapView({ center, radius, onCenterChange }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  })

  const mapRef = useRef<google.maps.Map | null>(null)
  const circleRef = useRef<google.maps.Circle | null>(null)

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    const b = computeBounds(center, radius)
    map.fitBounds({ south: b.south, north: b.north, west: b.west, east: b.east }, 20)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Manage the circle manually to avoid ghost circle bug
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (circleRef.current) {
      // Update existing circle
      circleRef.current.setCenter(center)
      circleRef.current.setRadius(radius)
    } else {
      // Create new circle
      circleRef.current = new google.maps.Circle({
        map,
        center,
        radius,
        strokeColor: '#000000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#000000',
        fillOpacity: 0.08,
      })
    }
  }, [center, radius])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      circleRef.current?.setMap(null)
      circleRef.current = null
    }
  }, [])

  // Fit bounds when radius changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const b = computeBounds(center, radius)
    map.fitBounds({ south: b.south, north: b.north, west: b.west, east: b.east }, 20)
  }, [radius]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      onCenterChange(e.latLng.lat(), e.latLng.lng())
    }
  }, [onCenterChange])

  if (!isLoaded) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-lg border bg-gray-50 text-sm text-gray-400">
        Kaart laden...
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
        onLoad={onLoad}
      >
        <Marker
          position={center}
          draggable
          onDragEnd={handleDragEnd}
        />
      </GoogleMap>
    </div>
  )
}
