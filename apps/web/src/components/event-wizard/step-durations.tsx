'use client'

import { useTranslations } from 'next-intl'
import type { WizardData } from './wizard'

export function StepDurations({ data, onChange }: {
  data: WizardData
  onChange: (partial: Partial<WizardData>) => void
}) {
  const t = useTranslations('wizard')

  const durations = [
    { key: 'appetizerDuration' as const, label: t('appetizerDuration'), emoji: '🥗' },
    { key: 'mainDuration' as const, label: t('mainDuration'), emoji: '🍝' },
    { key: 'dessertDuration' as const, label: t('dessertDuration'), emoji: '🍰' },
  ]

  const total = data.appetizerDuration + data.mainDuration + data.dessertDuration
    + 2 * data.travelTimeMinutes

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t('stepDurations')}</h2>

      {durations.map(({ key, label, emoji }) => (
        <div key={key} className="flex items-center justify-between">
          <span className="text-sm">{emoji} {label}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ [key]: Math.max(30, data[key] - 15) })}
              className="h-8 w-8 rounded border text-sm font-medium"
            >−</button>
            <span className="w-16 text-center text-sm font-medium">
              {data[key]} {t('durationMinutes')}
            </span>
            <button
              type="button"
              onClick={() => onChange({ [key]: Math.min(180, data[key] + 15) })}
              className="h-8 w-8 rounded border text-sm font-medium"
            >+</button>
          </div>
        </div>
      ))}

      <div className="rounded bg-gray-50 p-3 text-sm text-gray-600">
        {t('totalEventDuration')}: <strong>{Math.floor(total / 60)}u {total % 60}m</strong>
        <span className="text-xs text-gray-400"> (incl. {2 * data.travelTimeMinutes} min transport)</span>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t('timezone')}</label>
        <select
          value={data.timezone}
          onChange={(e) => onChange({ timezone: e.target.value })}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          {['Europe/Amsterdam', 'Europe/Berlin', 'Europe/Brussels', 'Europe/London',
            'Europe/Paris', 'Europe/Rome', 'Europe/Madrid', 'Europe/Vienna',
            'Europe/Zurich', 'Europe/Lisbon', 'America/New_York', 'America/Chicago',
            'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
            'UTC'].map(tz => (
            <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
