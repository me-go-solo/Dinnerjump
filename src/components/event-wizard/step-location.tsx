'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import type { WizardData } from './wizard'

const LocationMap = dynamic(() => import('./location-map').then(mod => ({ default: mod.LocationMap })), {
  ssr: false,
  loading: () => <div className="h-[350px] rounded-lg border bg-gray-50 flex items-center justify-center text-sm text-gray-400">Kaart laden...</div>,
})

type Props = { data: WizardData; onChange: (partial: Partial<WizardData>) => void }

export function StepLocation({ data, onChange }: Props) {
  const t = useTranslations('wizard')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
        // Permission denied or error — show fallback (Netherlands center)
        onChange({ centerLat: 52.1326, centerLng: 5.2913 })
        setGeoStatus('denied')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSearch() {
    if (!data.centerAddress) return
    setSearching(true)
    setError(null)
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(data.centerAddress)}`)
    if (!res.ok) { setError('Adres niet gevonden'); setSearching(false); return }
    const geo = await res.json()
    onChange({ centerLat: geo.lat, centerLng: geo.lng, centerAddress: geo.displayName })
    setSearching(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSearch() }
  }

  const handlePositionChange = useCallback(async (lat: number, lng: number) => {
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
      {/* Search bar above map */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={data.centerAddress}
            onChange={(e) => onChange({ centerAddress: e.target.value })}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded border px-3 py-2 text-sm"
            placeholder="Zoek een adres of plaats..."
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {searching ? '...' : 'Zoek'}
          </button>
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {geoStatus === 'loading' && <p className="mt-1 text-xs text-gray-400">Locatie bepalen...</p>}
        {geoStatus === 'denied' && <p className="mt-1 text-xs text-yellow-600">Locatietoegang geweigerd. Zoek een adres of versleep de marker op de kaart.</p>}
      </div>

      {/* Map — always visible */}
      <LocationMap
        lat={data.centerLat}
        lng={data.centerLng}
        radiusKm={data.radiusKm}
        onPositionChange={handlePositionChange}
      />

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
