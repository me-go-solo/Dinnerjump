'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { registerDuo } from '@/actions/duos'
import { btn, input } from '@/lib/design'
import type { Event } from '@/lib/types'

type Props = { event: Event }

export function RegistrationForm({ event }: Props) {
  const t = useTranslations('registration')
  const tc = useTranslations('common')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const postalCode = formData.get('postalCode') as string

    const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(`${address}, ${postalCode} ${city}`)}`)
    if (!geoRes.ok) { setError(t('addressNotFound')); setLoading(false); return }
    const geo = await geoRes.json()

    const result = await registerDuo({
      eventId: event.id, partnerName: formData.get('partnerName') as string,
      partnerEmail: formData.get('partnerEmail') as string,
      addressLine: address, city, postalCode, country: 'NL', lat: geo.lat, lng: geo.lng,
    })

    if (result.error === 'outside_radius') { setError(t('outsideRadius')); setLoading(false); return }
    if (result.error) { setError(result.error); setLoading(false); return }

    const checkoutRes = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duoId: result.duoId, eventSlug: event.slug, locale }),
    })
    const { url } = await checkoutRes.json()
    window.location.href = url
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight">{t('title')}</h2>
      <input name="partnerName" placeholder={t('partnerName')} required className={input.base} />
      <input name="partnerEmail" type="email" placeholder={t('partnerEmail')} required className={input.base} />
      <hr className="border-gray-100" />
      <input name="address" placeholder={t('address')} required className={input.base} />
      <div className="flex gap-2">
        <input name="postalCode" placeholder={t('postalCode')} required className={`w-1/3 ${input.base}`} />
        <input name="city" placeholder={t('city')} required className={`flex-1 ${input.base}`} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className={btn.primary}>
        {loading ? tc('loading') : t('pay')}
      </button>
    </form>
  )
}
