'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Users } from 'lucide-react'
import type { Event } from '@/lib/types'

type EventWithCounts = Event & {
  confirmed_count: number
  total_count: number
}

type Props = {
  displayName: string
  events: EventWithCounts[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  registration_open: 'bg-green-100 text-green-700',
  confirmed: 'bg-blue-100 text-blue-700',
  closed: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

function statusToKey(status: string): string {
  return (
    'status' +
    status
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  )
}

export function EventsOverview({ displayName, events }: Props) {
  const t = useTranslations('organizer')

  const activeEvents = events.filter((e) => e.status !== 'completed' && e.status !== 'cancelled')
  const completedEvents = events.filter((e) => e.status === 'completed' || e.status === 'cancelled')

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('greeting', { name: displayName })}</h1>
          <p className="text-gray-500">{t('subtitle')}</p>
        </div>
        <Link
          href="/events/create"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {t('newEvent')}
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {activeEvents.map((event) => (
          <Link
            key={event.id}
            href={`/organizer/${event.slug}`}
            className="block rounded-lg border-2 border-black p-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{event.title}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(event.event_date).toLocaleDateString()} — {event.start_time?.slice(0, 5)}
                </p>
              </div>
              <span className={`rounded px-2 py-1 text-xs font-medium ${statusColors[event.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {t(statusToKey(event.status))}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Users size={14} />
                <span>{t('duosCount', { count: event.total_count })}</span>
              </div>
              {event.registration_deadline && (
                <span className="text-sm text-gray-500">
                  {t('deadline', {
                    date: new Date(event.registration_deadline).toLocaleDateString(),
                  })}
                </span>
              )}
            </div>
          </Link>
        ))}

        {completedEvents.map((event) => (
          <Link
            key={event.id}
            href={`/organizer/${event.slug}`}
            className="block rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-400">{event.title}</h3>
                <p className="text-sm text-gray-400">
                  {new Date(event.event_date).toLocaleDateString()} — {event.start_time?.slice(0, 5)}
                </p>
              </div>
              <span className={`rounded px-2 py-1 text-xs font-medium ${statusColors[event.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {t(statusToKey(event.status))}
              </span>
            </div>
            <div className="mt-3 text-sm text-gray-400">
              {t('viewEvent')} &rarr;
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
