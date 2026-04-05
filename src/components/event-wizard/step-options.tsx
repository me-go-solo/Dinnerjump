'use client'
import { useTranslations } from 'next-intl'
import type { WizardData } from './wizard'

type Props = { data: WizardData; onChange: (partial: Partial<WizardData>) => void }

export function StepOptions({ data, onChange }: Props) {
  const t = useTranslations('wizard')
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">{t('afterpartyAddress')}</label>
        <input type="text" value={data.afterpartyAddress} onChange={(e) => onChange({ afterpartyAddress: e.target.value })} className="w-full rounded border px-3 py-2" />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={data.welcomeCardEnabled} onChange={(e) => onChange({ welcomeCardEnabled: e.target.checked })} />
        {t('welcomeCard')}
      </label>
    </div>
  )
}
