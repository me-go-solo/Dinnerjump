'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

// Default center: Netherlands
const DEFAULT_LAT = 52.1326
const DEFAULT_LNG = 5.2913
const DEFAULT_ZOOM = 7

function MapUpdater({ lat, lng, radiusKm }: { lat: number; lng: number; radiusKm: number }) {
  const map = useMap()
  const prevRef = useRef({ lat: 0, lng: 0, radiusKm: 0 })

  useEffect(() => {
    const prev = prevRef.current
    if (lat === prev.lat && lng === prev.lng && radiusKm === prev.radiusKm) return
    prevRef.current = { lat, lng, radiusKm }

    if (lat !== 0 && lng !== 0) {
      const bounds = L.latLng(lat, lng).toBounds(radiusKm * 2000)
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 })
    }
  }, [lat, lng, radiusKm, map])

  return null
}

function DraggableMarker({ lat, lng, onPositionChange }: { lat: number; lng: number; onPositionChange?: (lat: number, lng: number) => void }) {
  const markerRef = useRef<L.Marker>(null)
  return (
    <Marker
      draggable={true}
      eventHandlers={{
        dragend() {
          const marker = markerRef.current
          if (marker && onPositionChange) {
            const pos = marker.getLatLng()
            onPositionChange(pos.lat, pos.lng)
          }
        },
      }}
      position={[lat, lng]}
      ref={markerRef}
      icon={defaultIcon}
    />
  )
}

type Props = {
  lat: number
  lng: number
  radiusKm: number
  onPositionChange?: (lat: number, lng: number) => void
}

export function LocationMap({ lat, lng, radiusKm, onPositionChange }: Props) {
  const hasLocation = lat !== 0 && lng !== 0
  const centerLat = hasLocation ? lat : DEFAULT_LAT
  const centerLng = hasLocation ? lng : DEFAULT_LNG
  const zoom = hasLocation ? 13 : DEFAULT_ZOOM

  return (
    <div className="overflow-hidden rounded-lg border" style={{ height: '350px' }}>
      <MapContainer center={[centerLat, centerLng]} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {hasLocation && (
          <>
            <DraggableMarker lat={lat} lng={lng} onPositionChange={onPositionChange} />
            <Circle
              center={[lat, lng]}
              radius={radiusKm * 1000}
              pathOptions={{ color: '#000', fillColor: '#000', fillOpacity: 0.08, weight: 2, dashArray: '5, 10' }}
            />
          </>
        )}
        <MapUpdater lat={lat} lng={lng} radiusKm={radiusKm} />
      </MapContainer>
    </div>
  )
}
