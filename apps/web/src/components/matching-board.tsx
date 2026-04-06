'use client'

import { useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { mixMatch, setActiveMatchVersion, saveMatchOverride } from '@/actions/matching'
import { validateTableData } from '@/lib/matching'
import type { CourseType } from '@/lib/types'

type TableData = {
  id: string
  course: CourseType
  tableNumber: number
  hostDuoId: string
  hostName: string
  hostCity: string
  guests: Array<{ duoId: string; name: string; city: string }>
}

type MatchVersion = {
  id: string
  version: number
  isActive: boolean
  avgBikeMin: number | null
  avgCarMin: number | null
  tables: TableData[]
}

type Props = {
  eventId: string
  versions: MatchVersion[]
}

const COURSE_LABELS: Record<CourseType, string> = {
  appetizer: 'Voorgerecht',
  main: 'Hoofdgerecht',
  dessert: 'Dessert',
}

const COURSE_COLORS: Record<CourseType, { border: string; bg: string; header: string }> = {
  appetizer: { border: 'border-orange-300', bg: 'bg-orange-50', header: 'bg-orange-100 text-orange-800' },
  main: { border: 'border-red-300', bg: 'bg-red-50', header: 'bg-red-100 text-red-800' },
  dessert: { border: 'border-purple-300', bg: 'bg-purple-50', header: 'bg-purple-100 text-purple-800' },
}

const COURSES: CourseType[] = ['appetizer', 'main', 'dessert']

export function MatchingBoard({ eventId, versions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [transportMode, setTransportMode] = useState<'bike' | 'car'>('bike')
  const [isDirty, setIsDirty] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)

  const activeVersion = versions.find(v => v.isActive) ?? versions[versions.length - 1]
  if (!activeVersion) return null

  const activeIndex = versions.findIndex(v => v.id === activeVersion.id)
  const canUndo = activeIndex > 0
  const canRedo = activeIndex < versions.length - 1

  // Local table state for drag-drop overrides
  const [tables, setTables] = useState<TableData[]>(activeVersion.tables)
  const [dragSource, setDragSource] = useState<{ tableId: string; guestIdx: number } | null>(null)

  // Reset tables when active version changes
  const [lastVersionId, setLastVersionId] = useState(activeVersion.id)
  if (activeVersion.id !== lastVersionId) {
    setTables(activeVersion.tables)
    setLastVersionId(activeVersion.id)
    setIsDirty(false)
    setValidationErrors([])
    setSaveError(null)
  }

  const avgTime = transportMode === 'bike' ? activeVersion.avgBikeMin : activeVersion.avgCarMin

  function handleMix() {
    startTransition(async () => {
      await mixMatch(eventId)
      router.refresh()
    })
  }

  function handleUndo() {
    if (!canUndo) return
    const prev = versions[activeIndex - 1]
    startTransition(async () => {
      await setActiveMatchVersion(eventId, prev.version)
      router.refresh()
    })
  }

  function handleRedo() {
    if (!canRedo) return
    const next = versions[activeIndex + 1]
    startTransition(async () => {
      await setActiveMatchVersion(eventId, next.version)
      router.refresh()
    })
  }

  function handleSave() {
    startTransition(async () => {
      setSaveError(null)
      const result = await saveMatchOverride(eventId, tables)
      if (result.error) {
        setSaveError(result.error)
      } else {
        setIsDirty(false)
        setValidationErrors([])
        router.refresh()
      }
    })
  }

  function handleDragStart(tableId: string, guestIdx: number) {
    setDragSource({ tableId, guestIdx })
  }

  function handleDrop(targetTableId: string, targetGuestIdx: number) {
    if (!dragSource) return
    if (dragSource.tableId === targetTableId && dragSource.guestIdx === targetGuestIdx) {
      setDragSource(null)
      return
    }

    const sourceTable = tables.find(t => t.id === dragSource.tableId)
    const targetTable = tables.find(t => t.id === targetTableId)
    if (!sourceTable || !targetTable) return

    // Only allow swaps within the same course
    if (sourceTable.course !== targetTable.course) {
      setDragSource(null)
      return
    }

    const newTables = tables.map(t => {
      if (t.id === dragSource.tableId) {
        const newGuests = [...t.guests]
        const targetGuest = targetTable.guests[targetGuestIdx]
        newGuests[dragSource.guestIdx] = targetGuest
        return { ...t, guests: newGuests }
      }
      if (t.id === targetTableId) {
        const newGuests = [...t.guests]
        const sourceGuest = sourceTable.guests[dragSource.guestIdx]
        newGuests[targetGuestIdx] = sourceGuest
        return { ...t, guests: newGuests }
      }
      return t
    })

    setTables(newTables)
    setDragSource(null)
    setIsDirty(true)
    const result = validateTableData(newTables)
    setValidationErrors(result.errors)
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Indeling v{activeVersion.version}</h2>

        <div className="flex gap-1">
          <button
            onClick={handleUndo}
            disabled={!canUndo || isPending}
            className="rounded border px-2 py-1 text-sm disabled:opacity-40"
          >
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo || isPending}
            className="rounded border px-2 py-1 text-sm disabled:opacity-40"
          >
            Redo
          </button>
        </div>

        <button
          onClick={handleMix}
          disabled={isPending}
          className="rounded bg-gray-800 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          {isPending ? 'Bezig...' : 'Mix'}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded border text-sm">
            <button
              onClick={() => setTransportMode('bike')}
              className={`px-2 py-1 ${transportMode === 'bike' ? 'bg-gray-800 text-white' : ''}`}
            >
              Fiets
            </button>
            <button
              onClick={() => setTransportMode('car')}
              className={`px-2 py-1 ${transportMode === 'car' ? 'bg-gray-800 text-white' : ''}`}
            >
              Auto
            </button>
          </div>
          {avgTime != null && (
            <span className="text-sm text-gray-600">
              gem. {Math.round(avgTime)} min
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COURSES.map(course => {
          const courseTables = tables
            .filter(t => t.course === course)
            .sort((a, b) => a.tableNumber - b.tableNumber)
          const colors = COURSE_COLORS[course]

          return (
            <div key={course}>
              <h3 className={`mb-2 rounded px-3 py-1.5 text-sm font-semibold ${colors.header}`}>
                {COURSE_LABELS[course]}
              </h3>
              <div className="flex flex-col gap-2">
                {courseTables.map(table => (
                  <div key={table.id} className={`rounded border ${colors.border} ${colors.bg} p-3`}>
                    <div className="mb-1">
                      <span className="text-sm font-bold">{table.hostName}</span>
                      <span className="ml-1 text-xs text-gray-500">{table.hostCity}</span>
                    </div>
                    {table.guests.map((guest, idx) => (
                      <div
                        key={guest.duoId}
                        draggable
                        onDragStart={() => handleDragStart(table.id, idx)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => handleDrop(table.id, idx)}
                        className="cursor-grab rounded px-1 py-0.5 text-sm hover:bg-white/50"
                      >
                        {guest.name}
                        <span className="ml-1 text-xs text-gray-400">{guest.city}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {validationErrors.length > 0 && (
        <div className="mt-4 rounded border border-yellow-300 bg-yellow-50 p-4">
          <p className="mb-2 text-sm font-semibold text-yellow-800">⚠️ Validatie-waarschuwingen</p>
          <ul className="list-inside list-disc text-sm text-yellow-700">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {saveError && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {isDirty && (
        <button
          onClick={handleSave}
          disabled={validationErrors.length > 0 || isPending}
          className="mt-4 rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Opslaan...' : '💾 Wijzigingen opslaan'}
        </button>
      )}
    </div>
  )
}
