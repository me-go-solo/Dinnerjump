'use client'

import { useCallback, useRef, useEffect } from 'react'
import { GoogleMap, Marker, Circle, useJsApiLoader } from '@react-google-maps/api'

const containerStyle = { width: '100%', height: '350px' }

type Props = {
  center: { lat: number; lng: number }
  radius: number
  onCenterChange: (lat: number, lng: number) => void
}

export function GoogleMapView({ center, radius, onCenterChange }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  })

  const mapRef = useRef<google.maps.Map | null>(null)

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    // Fit bounds once on initial load
    const circle = new google.maps.Circle({ center, radius })
    const bounds = circle.getBounds()
    if (bounds) map.fitBounds(bounds, 20)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fit bounds when radius changes (not on every center change to avoid jitter)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const circle = new google.maps.Circle({ center, radius })
    const bounds = circle.getBounds()
    if (bounds) map.fitBounds(bounds, 20)
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
        <Circle
          center={center}
          radius={radius}
          options={{
            strokeColor: '#000000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#000000',
            fillOpacity: 0.08,
          }}
        />
      </GoogleMap>
    </div>
  )
}
