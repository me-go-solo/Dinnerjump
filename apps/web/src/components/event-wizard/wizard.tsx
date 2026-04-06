'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createEvent } from '@/actions/events'
import { StepBasics } from './step-basics'
import { StepDateTime } from './step-datetime'
import { StepLocation } from './step-location'
import { StepDurations } from './step-durations'
import { StepPolicy } from './step-policy'
import { StepOptions } from './step-options'
import { StepReview } from './step-review'

export type WizardData = {
  title: string
  description: string
  type: 'open' | 'closed'
  eventDate: string
  startTime: string
  travelTimeMinutes: 15 | 30 | 45
  centerAddress: string
  centerLat: number
  centerLng: number
  radiusKm: number
  invitationPolicy: 'organizer_only' | 'participants_allowed'
  afterpartyName: string
  afterpartyAddress: string
  afterpartyLat?: number
  afterpartyLng?: number
  welcomeCardEnabled: boolean
  appetizerDuration: number
  mainDuration: number
  dessertDuration: number
}

const INITIAL_DATA: WizardData = {
  title: '', description: '', type: 'closed',
  eventDate: '', startTime: '18:00', travelTimeMinutes: 30,
  centerAddress: '', centerLat: 0, centerLng: 0, radiusKm: 2,
  invitationPolicy: 'organizer_only',
  afterpartyName: '', afterpartyAddress: '', welcomeCardEnabled: false,
  appetizerDuration: 75, mainDuration: 90, dessertDuration: 60,
}

const STEPS = ['basics', 'datetime', 'location', 'durations', 'policy', 'options', 'review'] as const

export function EventWizard() {
  const t = useTranslations('wizard')
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>(INITIAL_DATA)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [validationError, setValidationError] = useState<string | null>(null)

  function updateData(partial: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...partial }))
    setValidationError(null)
  }

  function validateStep(): boolean {
    switch (step) {
      case 0:
        if (!data.title.trim()) {
          setValidationError('Vul een titel in voor je evenement.')
          return false
        }
        break
      case 1: {
        if (!data.eventDate) {
          setValidationError('Kies een datum voor je evenement.')
          return false
        }
        const selected = new Date(data.eventDate + 'T00:00:00')
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (selected <= today) {
          setValidationError('De datum moet in de toekomst liggen.')
          return false
        }
        break
      }
      case 2:
        if (!data.centerLat || !data.centerLng || (data.centerLat === 0 && data.centerLng === 0)) {
          setValidationError('Kies een locatie op de kaart.')
          return false
        }
        break
      case 3:
        if (data.appetizerDuration <= 0 || data.mainDuration <= 0 || data.dessertDuration <= 0) {
          setValidationError('Alle gangtijden moeten langer dan 0 minuten zijn.')
          return false
        }
        break
    }
    setValidationError(null)
    return true
  }

  function handleNext() {
    if (validateStep()) {
      setStep(step + 1)
      setValidationError(null)
    }
  }

  async function handlePublish() {
    setSubmitting(true)
    setError(null)
    const result = await createEvent(data)
    if (result.error) { setError(result.error); setSubmitting(false); return }
    router.push(`/events/${result.event!.slug}/manage`)
  }

  const stepComponents = [
    <StepBasics key="basics" data={data} onChange={updateData} />,
    <StepDateTime key="datetime" data={data} onChange={updateData} />,
    <StepLocation key="location" data={data} onChange={updateData} />,
    <StepDurations key="durations" data={data} onChange={updateData} />,
    <StepPolicy key="policy" data={data} onChange={updateData} />,
    <StepOptions key="options" data={data} onChange={updateData} />,
    <StepReview key="review" data={data} onPublish={handlePublish} submitting={submitting} error={error} />,
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">{t('title')}</h1>
      <div className="mb-8 flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded ${i <= step ? 'bg-black' : 'bg-gray-200'}`} />
        ))}
      </div>
      {stepComponents[step]}
      {step < STEPS.length - 1 && (
        <div className="mt-6">
          <div className="flex justify-between">
            <button onClick={() => { setStep(step - 1); setValidationError(null) }} disabled={step === 0} className="rounded px-4 py-2 text-sm disabled:opacity-30">
              {t('stepBasics') && '← '}{t('stepBasics') && 'Terug'}
            </button>
            <button onClick={handleNext} className="rounded bg-black px-4 py-2 text-sm text-white">
              Volgende →
            </button>
          </div>
          {validationError && (
            <p className="mt-2 text-center text-sm text-red-600">{validationError}</p>
          )}
        </div>
      )}
    </div>
  )
}
