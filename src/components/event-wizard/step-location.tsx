'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { WizardData } from './wizard'

type Props = { data: WizardData; onChange: (partial: Partial<WizardData>) => void }

export function StepLocation({ data, onChange }: Props) {
  const t = useTranslations('wizard')
  const [geocoding, setGeocoding] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  async function handleGeocode() {
    if (!data.centerAddress) return
    setGeocoding(true)
    setGeoError(null)
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(data.centerAddress)}`)
    if (!res.ok) { setGeoError('Adres niet gevonden'); setGeocoding(false); return }
    const geo = await res.json()
    onChange({ centerLat: geo.lat, centerLng: geo.lng })
    setGeocoding(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">{t('centerAddress')}</label>
        <div className="flex gap-2">
          <input type="text" value={data.centerAddress} onChange={(e) => onChange({ centerAddress: e.target.value })} className="flex-1 rounded border px-3 py-2" placeholder="bijv. Amsterdam Centrum" />
          <button type="button" onClick={handleGeocode} disabled={geocoding} className="rounded bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200 disabled:opacity-50">
            {geocoding ? '...' : 'Zoek'}
          </button>
        </div>
        {geoError && <p className="mt-1 text-sm text-red-600">{geoError}</p>}
        {data.centerLat !== 0 && <p className="mt-1 text-sm text-green-600">Locatie gevonden ({data.centerLat.toFixed(4)}, {data.centerLng.toFixed(4)})</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t('radius')}: {data.radiusKm} km</label>
        <input type="range" min={1} max={10} value={data.radiusKm} onChange={(e) => onChange({ radiusKm: parseInt(e.target.value) })} className="w-full" />
        <div className="flex justify-between text-xs text-gray-400"><span>1 km</span><span>10 km</span></div>
      </div>
    </div>
  )
}
