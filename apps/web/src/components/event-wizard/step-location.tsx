'use client'
import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { GoogleMapView } from './google-map'
import type { WizardData } from './wizard'

type Props = { data: WizardData; onChange: (partial: Partial<WizardData>) => void }

export function StepLocation({ data, onChange }: Props) {
  const t = useTranslations('wizard')
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle')

  // Auto-detect location on mount if no location set yet
  useEffect(() => {
    if (data.centerLat !== 0 && data.centerLng !== 0) {
      setGeoStatus('done')
      return
    }
    if (!navigator.geolocation) return

    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        onChange({ centerLat: latitude, centerLng: longitude })
        // Reverse geocode for address label
        try {
          const res = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`)
          if (res.ok) {
            const geo = await res.json()
            onChange({ centerAddress: geo.displayName, centerLat: latitude, centerLng: longitude })
          }
        } catch {}
        setGeoStatus('done')
      },
      () => {
        setGeoStatus('denied')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCenterChange = useCallback(async (lat: number, lng: number) => {
    onChange({ centerLat: lat, centerLng: lng })
    // Reverse geocode the new position
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
      if (res.ok) {
        const geo = await res.json()
        onChange({ centerAddress: geo.displayName, centerLat: lat, centerLng: lng })
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {geoStatus === 'loading' && <p className="text-xs text-gray-400">Locatie bepalen...</p>}
      {geoStatus === 'denied' && (
        <p className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
          Sta locatietoegang toe in je browser om je positie te bepalen
        </p>
      )}

      {/* Map — always visible when we have a location */}
      {(data.centerLat !== 0 && data.centerLng !== 0) ? (
        <GoogleMapView
          center={{ lat: data.centerLat, lng: data.centerLng }}
          radius={data.radiusKm * 1000}
          onCenterChange={handleCenterChange}
        />
      ) : geoStatus !== 'loading' && (
        <div className="flex h-[350px] items-center justify-center rounded-lg border bg-gray-50 text-sm text-gray-400">
          Sta locatietoegang toe om de kaart te laden
        </div>
      )}

      {/* Radius slider */}
      <div>
        <label className="mb-1 block text-sm font-medium">{t('radius')}: {data.radiusKm} km</label>
        <input type="range" min={1} max={10} value={data.radiusKm} onChange={(e) => onChange({ radiusKm: parseInt(e.target.value) })} className="w-full" />
        <div className="flex justify-between text-xs text-gray-400"><span>1 km</span><span>10 km</span></div>
      </div>

      {/* Travel time */}
      <div>
        <label className="mb-1 block text-sm font-medium">{t('travelTime')}</label>
        <div className="flex gap-4">
          {([15, 30, 45] as const).map((min) => (
            <label key={min} className="flex items-center gap-2">
              <input type="radio" checked={data.travelTimeMinutes === min} onChange={() => onChange({ travelTimeMinutes: min })} />
              {min} min
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-400">{t('travelTimeHelp')}</p>
      </div>
    </div>
  )
}
