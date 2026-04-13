'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Users } from 'lucide-react'
import { STATUS_COLORS, statusToKey, btn, badge } from '@/lib/design'
import type { Event } from '@/lib/types'

type EventWithCounts = Event & {
  confirmed_count: number
  total_count: number
}

type Props = {
  displayName: string
  events: EventWithCounts[]
}

export function EventsOverview({ displayName, events }: Props) {
  const t = useTranslations('organizer')

  const activeEvents = events.filter((e) => e.status !== 'completed' && e.status !== 'cancelled')
  const completedEvents = events.filter((e) => e.status === 'completed' || e.status === 'cancelled')

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('greeting', { name: displayName })}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Link href="/events/create" className={btn.primary}>
          {t('newEvent')}
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {activeEvents.map((event) => (
          <Link
            key={event.id}
            href={`/organizer/${event.slug}`}
            className="block rounded-xl border-2 border-black p-5 transition-all hover:bg-gray-50 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold tracking-tight">{event.title}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {new Date(event.event_date).toLocaleDateString()} — {event.start_time?.slice(0, 5)}
                </p>
              </div>
              <span className={`${badge.base} ${STATUS_COLORS[event.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {t(statusToKey(event.status))}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Users size={14} />
                <span>{t('duosCount', { count: event.total_count })}</span>
              </div>
              {event.registration_deadline && (
                <span className="text-sm text-gray-400">
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
            className="block rounded-xl border border-gray-200 p-5 transition-all hover:bg-gray-50 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-400">{event.title}</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {new Date(event.event_date).toLocaleDateString()} — {event.start_time?.slice(0, 5)}
                </p>
              </div>
              <span className={`${badge.base} ${STATUS_COLORS[event.status] ?? 'bg-gray-100 text-gray-600'}`}>
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
