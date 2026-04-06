'use client'
import { useTranslations } from 'next-intl'
import type { WizardData } from './wizard'

type Props = { data: WizardData; onPublish: () => void; submitting: boolean; error: string | null }

export function StepReview({ data, onPublish, submitting, error }: Props) {
  const t = useTranslations('wizard')
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t('stepReview')}</h2>
      <dl className="divide-y text-sm">
        <div className="flex justify-between py-2"><dt className="text-gray-500">{t('eventName')}</dt><dd>{data.title}</dd></div>
        <div className="flex justify-between py-2"><dt className="text-gray-500">{t('eventType')}</dt><dd>{data.type === 'open' ? t('typeOpen') : t('typeClosed')}</dd></div>
        <div className="flex justify-between py-2"><dt className="text-gray-500">{t('eventDate')}</dt><dd>{data.eventDate}</dd></div>
        <div className="flex justify-between py-2"><dt className="text-gray-500">{t('startTime')}</dt><dd>{data.startTime}</dd></div>
        <div className="flex justify-between py-2"><dt className="text-gray-500">{t('travelTime')}</dt><dd>{data.travelTimeMinutes} min</dd></div>
        <div className="flex justify-between py-2"><dt className="text-gray-500">{t('centerAddress')}</dt><dd>{data.centerAddress}</dd></div>
        <div className="flex justify-between py-2"><dt className="text-gray-500">{t('radius')}</dt><dd>{data.radiusKm} km</dd></div>
        <div className="flex justify-between py-2"><dt className="text-gray-500">{t('policyTitle')}</dt><dd>{data.invitationPolicy === 'organizer_only' ? t('policyOrganizerOnly') : t('policyParticipantsAllowed')}</dd></div>
      </dl>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={onPublish} disabled={submitting} className="rounded bg-black px-6 py-3 text-white hover:bg-gray-800 disabled:opacity-50">
        {submitting ? '...' : t('publish')}
      </button>
    </div>
  )
}
