'use client'

import { useTranslations } from 'next-intl'
import { Salad, UtensilsCrossed, CakeSlice } from 'lucide-react'
import { formatDuration } from '@/lib/format'
import type { WizardData } from './wizard'

const COURSE_ICONS = {
  appetizerDuration: Salad,
  mainDuration: UtensilsCrossed,
  dessertDuration: CakeSlice,
} as const

export function StepDurations({ data, onChange }: {
  data: WizardData
  onChange: (partial: Partial<WizardData>) => void
}) {
  const t = useTranslations('wizard')

  const durations = [
    { key: 'appetizerDuration' as const, label: t('appetizerDuration') },
    { key: 'mainDuration' as const, label: t('mainDuration') },
    { key: 'dessertDuration' as const, label: t('dessertDuration') },
  ]

  const total = data.appetizerDuration + data.mainDuration + data.dessertDuration
    + 2 * data.travelTimeMinutes

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold tracking-tight">{t('stepDurations')}</h2>

      {durations.map(({ key, label }) => {
        const Icon = COURSE_ICONS[key]
        return (
          <div key={key} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-gray-700">
              <Icon size={16} className="text-gray-400" />
              {label}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ [key]: Math.max(30, data[key] - 15) })}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 active:scale-95"
              >−</button>
              <span className="w-40 text-center text-sm font-medium tabular-nums">
                {formatDuration(data[key])}
              </span>
              <button
                type="button"
                onClick={() => onChange({ [key]: Math.min(180, data[key] + 15) })}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 active:scale-95"
              >+</button>
            </div>
          </div>
        )
      })}

      <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
        {t('totalEventDuration')}: <strong className="text-gray-900">{formatDuration(total)}</strong>
        <span className="ml-1 text-xs text-gray-400">(incl. {2 * data.travelTimeMinutes} min transport)</span>
      </div>

    </div>
  )
}
