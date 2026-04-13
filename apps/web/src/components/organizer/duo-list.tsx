'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Download } from 'lucide-react'
import { exportDuosCsv, promoteDuo } from '@/actions/organizer'
import { btn, badge } from '@/lib/design'

type DuoData = {
  id: string
  person1_name: string
  person2_name: string | null
  status: 'confirmed' | 'waitlisted' | 'registered'
  created_at: string
  hosted_course: string | null
}

type Props = {
  eventId: string
  duos: DuoData[]
  invitedNames: { name: string; date: string }[]
}

type SortKey = 'time' | 'status' | 'name'

const STATUS_ORDER: Record<string, number> = { confirmed: 0, waitlisted: 1, registered: 2, invited: 3 }

const STATUS_BADGE_COLORS: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700',
  waitlisted: 'bg-yellow-50 text-yellow-700',
  registered: 'bg-blue-50 text-blue-700',
}

export function DuoList({ eventId, duos, invitedNames }: Props) {
  const t = useTranslations('organizer')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sortKey, setSortKey] = useState<SortKey>('time')
  const [expanded, setExpanded] = useState(false)

  const confirmedCount = duos.filter(d => d.status === 'confirmed').length
  const waitlistedCount = duos.filter(d => d.status === 'waitlisted').length

  function sortedDuos() {
    const sorted = [...duos]
    switch (sortKey) {
      case 'time':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'status':
        sorted.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))
        break
      case 'name':
        sorted.sort((a, b) => a.person1_name.localeCompare(b.person1_name))
        break
    }
    return sorted
  }

  // Build combined rows: duos + invited names
  type Row =
    | { type: 'duo'; data: DuoData }
    | { type: 'invited'; name: string; date: string }

  function getAllRows(): Row[] {
    const duoRows: Row[] = sortedDuos().map(d => ({ type: 'duo', data: d }))
    const invitedRows: Row[] = invitedNames.map(inv => ({ type: 'invited', name: inv.name, date: inv.date }))

    if (sortKey === 'status') {
      return [...duoRows, ...invitedRows]
    }
    if (sortKey === 'name') {
      const all = [...duoRows, ...invitedRows]
      all.sort((a, b) => {
        const nameA = a.type === 'duo' ? a.data.person1_name : a.name
        const nameB = b.type === 'duo' ? b.data.person1_name : b.name
        return nameA.localeCompare(nameB)
      })
      return all
    }
    // time: duos first (they have real dates), then invited
    return [...duoRows, ...invitedRows]
  }

  const allRows = getAllRows()
  const visibleRows = expanded ? allRows : allRows.slice(0, 5)
  const hiddenCount = allRows.length - 5

  async function handleExport() {
    const result = await exportDuosCsv(eventId)
    if ('csv' in result && result.csv) {
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'duos.csv'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  function handlePromote(duoId: string) {
    startTransition(async () => {
      await promoteDuo(eventId, duoId)
      router.refresh()
    })
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  }

  function statusBadge(status: string) {
    const colors = STATUS_BADGE_COLORS[status] ?? 'bg-gray-100 text-gray-500'
    const label = status === 'confirmed' ? t('confirmed')
      : status === 'waitlisted' ? t('waitlisted')
      : status === 'registered' ? t('registered')
      : status
    return <span className={`${badge.base} ${colors}`}>{label}</span>
  }

  return (
    <div className="border-b border-gray-100 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          {t('duos')} ({confirmedCount} {t('confirmed').toLowerCase()}, {waitlistedCount} {t('waitlisted').toLowerCase()})
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600"
          >
            <option value="time">{t('sortTime')}</option>
            <option value="status">{t('sortStatus')}</option>
            <option value="name">{t('sortName')}</option>
          </select>
          <button onClick={handleExport} className={btn.small}>
            <Download size={12} />
            {t('exportCsv')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-3 py-2.5 font-medium">{t('duo')}</th>
              <th className="px-3 py-2.5 font-medium">{t('status')}</th>
              <th className="px-3 py-2.5 font-medium">{t('registered')}</th>
              <th className="px-3 py-2.5 font-medium">{t('course')}</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, idx) => {
              if (row.type === 'invited') {
                return (
                  <tr key={`inv-${idx}`} className="border-t border-gray-50 opacity-50">
                    <td className="px-3 py-2.5 italic text-gray-400">{row.name}</td>
                    <td className="px-3 py-2.5">
                      <span className={`${badge.base} bg-gray-100 text-gray-500`}>{t('invited')}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-400">{formatDate(row.date)}</td>
                    <td className="px-3 py-2.5 text-gray-400">—</td>
                    <td className="px-3 py-2.5"></td>
                  </tr>
                )
              }

              const duo = row.data
              const duoLabel = duo.person2_name
                ? `${duo.person1_name} & ${duo.person2_name}`
                : duo.person1_name

              return (
                <tr key={duo.id} className="border-t border-gray-50">
                  <td className="px-3 py-2.5 font-medium">{duoLabel}</td>
                  <td className="px-3 py-2.5">{statusBadge(duo.status)}</td>
                  <td className="px-3 py-2.5 text-gray-500">{formatDate(duo.created_at)}</td>
                  <td className="px-3 py-2.5 text-gray-500">{duo.hosted_course ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    {duo.status === 'waitlisted' && (
                      <button
                        onClick={() => handlePromote(duo.id)}
                        disabled={isPending}
                        className={btn.small}
                      >
                        {t('promote')}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className={`mt-3 ${btn.ghost}`}
        >
          {t('moreCount', { count: hiddenCount })}
        </button>
      )}
    </div>
  )
}
