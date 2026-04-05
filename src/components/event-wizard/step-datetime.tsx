'use client'
import { useTranslations } from 'next-intl'
import type { WizardData } from './wizard'

type Props = { data: WizardData; onChange: (partial: Partial<WizardData>) => void }

export function StepDateTime({ data, onChange }: Props) {
  const t = useTranslations('wizard')
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">{t('eventDate')}</label>
        <input type="date" value={data.eventDate} onChange={(e) => onChange({ eventDate: e.target.value })} className="w-full rounded border px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t('startTime')}</label>
        <input type="time" value={data.startTime} onChange={(e) => onChange({ startTime: e.target.value })} className="w-full rounded border px-3 py-2" />
      </div>
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
      </div>
    </div>
  )
}
