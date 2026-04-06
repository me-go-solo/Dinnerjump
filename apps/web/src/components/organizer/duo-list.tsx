'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Download } from 'lucide-react'
import { exportDuosCsv, promoteDuo } from '@/actions/organizer'

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
    switch (status) {
      case 'confirmed':
        return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{t('confirmed')}</span>
      case 'waitlisted':
        return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">{t('waitlisted')}</span>
      case 'registered':
        return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{t('registered')}</span>
      default:
        return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{status}</span>
    }
  }

  return (
    <div className="border-b py-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          {t('duos')} ({confirmedCount} {t('confirmed').toLowerCase()}, {waitlistedCount} {t('waitlisted').toLowerCase()})
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded border px-2 py-1 text-xs text-gray-600"
          >
            <option value="time">{t('sortTime')}</option>
            <option value="status">{t('sortStatus')}</option>
            <option value="name">{t('sortName')}</option>
          </select>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            <Download size={12} />
            {t('exportCsv')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">{t('duo')}</th>
              <th className="px-3 py-2">{t('status')}</th>
              <th className="px-3 py-2">{t('registered')}</th>
              <th className="px-3 py-2">{t('course')}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, idx) => {
              if (row.type === 'invited') {
                return (
                  <tr key={`inv-${idx}`} className="border-t opacity-50">
                    <td className="px-3 py-2 italic text-gray-500">{row.name}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{t('invited')}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-400">{formatDate(row.date)}</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2"></td>
                  </tr>
                )
              }

              const duo = row.data
              const duoLabel = duo.person2_name
                ? `${duo.person1_name} & ${duo.person2_name}`
                : duo.person1_name

              return (
                <tr key={duo.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{duoLabel}</td>
                  <td className="px-3 py-2">{statusBadge(duo.status)}</td>
                  <td className="px-3 py-2 text-gray-500">{formatDate(duo.created_at)}</td>
                  <td className="px-3 py-2 text-gray-500">{duo.hosted_course ?? '—'}</td>
                  <td className="px-3 py-2">
                    {duo.status === 'waitlisted' && (
                      <button
                        onClick={() => handlePromote(duo.id)}
                        disabled={isPending}
                        className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 hover:bg-yellow-200 disabled:opacity-50"
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
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          {t('moreCount', { count: hiddenCount })}
        </button>
      )}
    </div>
  )
}
