'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { duplicateEvent } from '@/actions/organizer'
import { Clock, Copy } from 'lucide-react'
import { STATUS_COLORS, statusToKey, card, btn, badge } from '@/lib/design'
import type { Event } from '@/lib/types'

type Props = {
  event: Event
  confirmedCount: number
}

function getCountdown(deadline: string | null) {
  if (!deadline) return null
  const now = new Date()
  const target = new Date(deadline)
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return null

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes }
}

export function EventHeader({ event, confirmedCount }: Props) {
  const t = useTranslations('organizer')
  const router = useRouter()
  const [countdown, setCountdown] = useState(() => getCountdown(event.registration_deadline))

  useEffect(() => {
    if (!event.registration_deadline) return
    const interval = setInterval(() => {
      setCountdown(getCountdown(event.registration_deadline))
    }, 60_000)
    return () => clearInterval(interval)
  }, [event.registration_deadline])

  const handleDuplicate = useCallback(async () => {
    const result = await duplicateEvent(event.id)
    if ('prefill' in result) {
      sessionStorage.setItem('event_prefill', JSON.stringify(result.prefill))
      router.push('/events/create')
    }
  }, [event.id, router])

  return (
    <div className={`mb-6 ${card.base}`}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date(event.event_date).toLocaleDateString()} — {event.start_time?.slice(0, 5)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`${badge.base} ${STATUS_COLORS[event.status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {t(statusToKey(event.status))}
          </span>
          <button
            onClick={handleDuplicate}
            className={btn.small}
          >
            <Copy size={14} />
            {t('duplicate')}
          </button>
        </div>
      </div>

      {countdown && (
        <div className="mt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
            <Clock size={14} />
            {countdown.days > 0
              ? t('closesIn', { count: countdown.days })
              : t('closesInHours', { hours: countdown.hours, minutes: countdown.minutes })}
          </span>
        </div>
      )}
    </div>
  )
}
