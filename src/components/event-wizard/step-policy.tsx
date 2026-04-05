'use client'
import { useTranslations } from 'next-intl'
import type { WizardData } from './wizard'

type Props = { data: WizardData; onChange: (partial: Partial<WizardData>) => void }

export function StepPolicy({ data, onChange }: Props) {
  const t = useTranslations('wizard')
  return (
    <div className="flex flex-col gap-4">
      <label className="mb-1 block text-sm font-medium">{t('policyTitle')}</label>
      <label className="flex items-center gap-2 rounded border p-3 cursor-pointer hover:bg-gray-50">
        <input type="radio" checked={data.invitationPolicy === 'organizer_only'} onChange={() => onChange({ invitationPolicy: 'organizer_only' })} />
        {t('policyOrganizerOnly')}
      </label>
      <label className="flex items-center gap-2 rounded border p-3 cursor-pointer hover:bg-gray-50">
        <input type="radio" checked={data.invitationPolicy === 'participants_allowed'} onChange={() => onChange({ invitationPolicy: 'participants_allowed' })} />
        {t('policyParticipantsAllowed')}
      </label>
    </div>
  )
}
