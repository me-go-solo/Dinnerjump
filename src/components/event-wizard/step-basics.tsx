'use client'
import { useTranslations } from 'next-intl'
import type { WizardData } from './wizard'

type Props = { data: WizardData; onChange: (partial: Partial<WizardData>) => void }

export function StepBasics({ data, onChange }: Props) {
  const t = useTranslations('wizard')
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">{t('eventName')}</label>
        <input type="text" value={data.title} onChange={(e) => onChange({ title: e.target.value })} className="w-full rounded border px-3 py-2" required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t('eventDescription')}</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full rounded border px-3 py-2"
          rows={3}
          placeholder={t('descriptionPlaceholder')}
        />
        <p className="mt-1 text-xs text-gray-400">{t('descriptionHelp')}</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t('eventType')}</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" checked={data.type === 'open'} onChange={() => onChange({ type: 'open' })} />{t('typeOpen')}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={data.type === 'closed'} onChange={() => onChange({ type: 'closed' })} />{t('typeClosed')}
          </label>
        </div>
      </div>
    </div>
  )
}
