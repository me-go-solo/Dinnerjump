'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { MatchingBoard } from '@/components/matching-board'
import { approveMatching } from '@/actions/matching'
import type { CourseType } from '@/lib/types'

type MatchingVersion = {
  id: string
  version: number
  isActive: boolean
  avgBikeMin: number | null
  avgCarMin: number | null
  tables: Array<{
    id: string
    course: CourseType
    tableNumber: number
    hostDuoId: string
    hostName: string
    hostCity: string
    guests: Array<{ duoId: string; name: string; city: string }>
  }>
}

type Props = {
  eventId: string
  eventStatus: string
  versions: MatchingVersion[]
}

const COURSE_COLORS: Record<string, { bg: string; text: string }> = {
  appetizer: { bg: 'bg-orange-50', text: 'text-orange-800' },
  main: { bg: 'bg-red-50', text: 'text-red-800' },
  dessert: { bg: 'bg-purple-50', text: 'text-purple-800' },
}

const COURSE_DOT: Record<string, string> = {
  appetizer: 'bg-orange-300',
  main: 'bg-red-300',
  dessert: 'bg-purple-300',
}

export function MatchingOverview({ eventId, eventStatus, versions }: Props) {
  const t = useTranslations('organizer')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [view, setView] = useState<'list' | 'board'>('list')

  const showable = ['closed', 'active', 'completed'].includes(eventStatus)

  if (!showable) {
    return (
      <div className="border-b py-5">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">{t('matching')}</h2>
        <p className="text-sm text-gray-400">{t('matchingHidden')}</p>
      </div>
    )
  }

  const activeVersion = versions.find(v => v.isActive) ?? versions[versions.length - 1]
  const hasActive = !!activeVersion
  const showApprove = eventStatus === 'closed' && hasActive

  function handleApprove() {
    startTransition(async () => {
      await approveMatching(eventId)
      router.refresh()
    })
  }

  // Group tables by course for list view
  const courseGroups = activeVersion
    ? (['appetizer', 'main', 'dessert'] as const).map(course => ({
        course,
        tables: activeVersion.tables
          .filter(t => t.course === course)
          .sort((a, b) => a.tableNumber - b.tableNumber),
      }))
    : []

  return (
    <div className="border-b py-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">{t('matching')}</h2>
        {hasActive && (
          <div className="flex rounded border text-xs">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1 ${view === 'list' ? 'bg-gray-800 text-white' : 'text-gray-600'}`}
            >
              {t('simpleView')}
            </button>
            <button
              onClick={() => setView('board')}
              className={`px-3 py-1 ${view === 'board' ? 'bg-gray-800 text-white' : 'text-gray-600'}`}
            >
              {t('boardView')}
            </button>
          </div>
        )}
      </div>

      {!hasActive && (
        <p className="text-sm text-gray-400">{t('matchingHidden')}</p>
      )}

      {hasActive && view === 'list' && (
        <div className="space-y-3">
          {courseGroups.map(({ course, tables }) => {
            const colors = COURSE_COLORS[course]
            const dot = COURSE_DOT[course]
            return (
              <div key={course}>
                <div className="mb-1 flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
                  <span className={`text-xs font-semibold ${colors.text}`}>
                    {t(course)}
                  </span>
                </div>
                <div className="space-y-1">
                  {tables.map(table => {
                    const guestNames = table.guests.map(g => g.name).join(', ')
                    return (
                      <div
                        key={table.id}
                        className={`rounded px-3 py-1.5 text-sm ${colors.bg}`}
                      >
                        {t('table', { number: table.tableNumber })}:{' '}
                        <span className="font-medium">{table.hostName}</span>{' '}
                        <span className="text-gray-500">({t('host')})</span>
                        {guestNames && (
                          <>
                            {' → '}
                            <span className="text-gray-600">{guestNames}</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasActive && view === 'board' && (
        <MatchingBoard eventId={eventId} versions={versions} />
      )}

      {showApprove && (
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="mt-4 rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
        >
          {isPending ? '...' : t('approve')}
        </button>
      )}
    </div>
  )
}
