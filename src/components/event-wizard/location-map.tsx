'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    if (lat !== 0 && lng !== 0) {
      map.setView([lat, lng], 13)
    }
  }, [lat, lng, map])
  return null
}

type Props = {
  lat: number
  lng: number
  radiusKm: number
}

export function LocationMap({ lat, lng, radiusKm }: Props) {
  if (lat === 0 && lng === 0) return null

  return (
    <div className="mt-3 overflow-hidden rounded-lg border" style={{ height: '250px' }}>
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={defaultIcon} />
        <Circle
          center={[lat, lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#000', fillColor: '#000', fillOpacity: 0.1, weight: 2 }}
        />
        <MapUpdater lat={lat} lng={lng} />
      </MapContainer>
    </div>
  )
}
