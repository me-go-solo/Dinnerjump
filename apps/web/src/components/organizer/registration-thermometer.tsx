'use client'

import { useTranslations } from 'next-intl'

type Props = {
  confirmedCount: number
}

const MILESTONES = [9, 12, 15, 18, 21, 24, 27, 30]

export function RegistrationThermometer({ confirmedCount }: Props) {
  const t = useTranslations('organizer')

  const maxVisible = MILESTONES[MILESTONES.length - 1]
  const widthPct = Math.max(8, (confirmedCount / maxVisible) * 100)

  // Find next milestone
  const nextMilestone = MILESTONES.find((m) => m > confirmedCount)
  const duosNeeded = nextMilestone ? nextMilestone - confirmedCount : 0

  return (
    <div className="border-b py-5">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{t('registrations')}</h2>

      {/* Progress bar */}
      <div className="relative h-8 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="flex h-full items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
          style={{ width: `${Math.min(widthPct, 100)}%` }}
        >
          <span className="text-sm font-bold text-white">{confirmedCount}</span>
        </div>
      </div>

      {/* Milestone markers */}
      <div className="mt-2 flex justify-between px-1">
        {MILESTONES.map((m) => (
          <span
            key={m}
            className={`text-xs font-medium ${
              confirmedCount >= m ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            {m}
          </span>
        ))}
      </div>

      {/* "Need more" text */}
      {nextMilestone && (
        <p className="mt-2 text-sm text-gray-500">
          {t('needMore', { count: duosNeeded, target: nextMilestone })}
        </p>
      )}
    </div>
  )
}
