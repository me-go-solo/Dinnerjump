'use client'
import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { GoogleMapView } from './google-map'
import type { WizardData } from './wizard'

type Props = { data: WizardData; onChange: (partial: Partial<WizardData>) => void }

async function reverseGeocode(lat: number, lng: number) {
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
    if (res.ok) {
      const geo = await res.json()
      return geo.displayName as string
    }
  } catch {}
  return null
}

async function tryIpLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const data = await res.json()
      if (data.latitude && data.longitude) {
        return { lat: data.latitude, lng: data.longitude }
      }
    }
  } catch {}
  return null
}

export function StepLocation({ data, onChange }: Props) {
  const t = useTranslations('wizard')
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'done' | 'fallback'>('idle')
  const [manualAddress, setManualAddress] = useState('')
  const [addressError, setAddressError] = useState('')

  // Auto-detect location: GPS → IP → manual fallback
  useEffect(() => {
    if (data.centerLat !== 0 && data.centerLng !== 0) {
      setGeoStatus('done')
      return
    }

    async function detectLocation() {
      setGeoStatus('loading')

      // Step 1: Try browser GPS
      const gpsResult = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        if (!navigator.geolocation) { resolve(null); return }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000 }
        )
      })

      if (gpsResult) {
        const address = await reverseGeocode(gpsResult.lat, gpsResult.lng)
        onChange({ centerLat: gpsResult.lat, centerLng: gpsResult.lng, centerAddress: address ?? '' })
        setGeoStatus('done')
        return
      }

      // Step 2: Try IP-based location
      const ipResult = await tryIpLocation()
      if (ipResult) {
        const address = await reverseGeocode(ipResult.lat, ipResult.lng)
        onChange({ centerLat: ipResult.lat, centerLng: ipResult.lng, centerAddress: address ?? '' })
        setGeoStatus('done')
        return
      }

      // Step 3: Show manual address input
      setGeoStatus('fallback')
    }

    detectLocation()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCenterChange = useCallback(async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng)
    onChange({ centerLat: lat, centerLng: lng, centerAddress: address ?? '' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleManualSearch() {
    if (!manualAddress.trim()) return
    setAddressError('')
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(manualAddress)}`)
      if (res.ok) {
        const geo = await res.json()
        if (geo.lat && geo.lng) {
          onChange({ centerLat: geo.lat, centerLng: geo.lng, centerAddress: geo.displayName ?? manualAddress })
          setGeoStatus('done')
          return
        }
      }
      setAddressError('Adres niet gevonden. Probeer een ander adres.')
    } catch {
      setAddressError('Er ging iets mis. Probeer het opnieuw.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {geoStatus === 'loading' && <p className="text-sm text-gray-400">Locatie bepalen...</p>}

      {/* Fallback: manual address input */}
      {geoStatus === 'fallback' && (
        <div className="rounded border border-yellow-200 bg-yellow-50 p-4">
          <p className="mb-3 text-sm text-yellow-700">
            We konden je locatie niet automatisch bepalen. Vul je adres of plaatsnaam in:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              placeholder="Bijv. Hoorn, Noord-Holland"
              className="flex-1 rounded border px-3 py-2 text-sm"
            />
            <button
              onClick={handleManualSearch}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Zoek
            </button>
          </div>
          {addressError && <p className="mt-2 text-sm text-red-600">{addressError}</p>}
        </div>
      )}

      {/* Map — visible when we have a location */}
      {(data.centerLat !== 0 && data.centerLng !== 0) ? (
        <GoogleMapView
          center={{ lat: data.centerLat, lng: data.centerLng }}
          radius={data.radiusKm * 1000}
          onCenterChange={handleCenterChange}
        />
      ) : geoStatus !== 'loading' && geoStatus !== 'fallback' && (
        <div className="flex h-[350px] items-center justify-center rounded-lg border bg-gray-50 text-sm text-gray-400">
          Locatie laden...
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
