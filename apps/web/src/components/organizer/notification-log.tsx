'use client'

import { useTranslations } from 'next-intl'

type NotificationEntry = {
  id: string
  type: 'email' | 'push'
  subject: string | null
  body: string
  recipient_count: number
  created_at: string
}

type Props = {
  notifications: NotificationEntry[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.toLocaleDateString('nl-NL', { month: 'short' })
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${day} ${month}, ${hours}:${minutes}`
}

export function NotificationLog({ notifications }: Props) {
  const t = useTranslations('organizer')

  return (
    <div className="border-b py-5">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{t('sentMessages')}</h2>

      {notifications.length === 0 ? (
        <p className="text-sm text-gray-400">{t('noMessages')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-3 py-2">{t('date')}</th>
                <th className="px-3 py-2">{t('message')}</th>
                <th className="px-3 py-2">{t('type')}</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(entry => (
                <tr key={entry.id} className="border-t">
                  <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                    {formatDate(entry.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    {entry.subject && (
                      <span className="mr-1 font-medium">{entry.subject}:</span>
                    )}
                    <span className="text-gray-600">
                      {entry.body.length > 80 ? entry.body.slice(0, 80) + '...' : entry.body}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {entry.type === 'email' ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        E-mail
                      </span>
                    ) : (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                        Push
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
