'use client'
import { useTranslations } from 'next-intl'
import type { WizardData } from './wizard'

type Props = { data: WizardData; onChange: (partial: Partial<WizardData>) => void }

const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
const MINUTES = [0, 15, 30, 45]

export function StepDateTime({ data, onChange }: Props) {
  const t = useTranslations('wizard')

  const [currentHour, currentMinute] = data.startTime.split(':').map(Number)

  function handleHourChange(hour: number) {
    onChange({ startTime: `${String(hour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}` })
  }

  function handleMinuteChange(minute: number) {
    onChange({ startTime: `${String(currentHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">{t('eventDate')}</label>
        <input type="date" value={data.eventDate} onChange={(e) => onChange({ eventDate: e.target.value })} className="w-full rounded border px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t('startTime')}</label>
        <div className="flex items-center gap-2">
          <select
            value={currentHour}
            onChange={(e) => handleHourChange(Number(e.target.value))}
            className="w-24 rounded border px-3 py-2"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
            ))}
          </select>
          <span className="text-lg font-medium">:</span>
          <select
            value={currentMinute}
            onChange={(e) => handleMinuteChange(Number(e.target.value))}
            className="w-24 rounded border px-3 py-2"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
