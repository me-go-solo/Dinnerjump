import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { Event } from '@/lib/types'

type Props = { event: Event & { confirmed_count: number; total_count: number } }

export function EventCard({ event }: Props) {
  const t = useTranslations('events')
  return (
    <Link href={`/events/${event.slug}`} className="block rounded-xl border border-gray-200 p-5 transition-all hover:border-gray-400 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold tracking-tight">{event.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{new Date(event.event_date).toLocaleDateString()} — {event.center_address}</p>
        </div>
        {event.type === 'closed' && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">{t('byInvitation')}</span>
        )}
      </div>
      <div className="mt-3 text-sm text-gray-500">{t('duosConfirmed', { count: event.confirmed_count })}</div>
    </Link>
  )
}
