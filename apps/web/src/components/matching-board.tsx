'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { AlertTriangle, Save, Undo2, Redo2, Shuffle, Bike, Car } from 'lucide-react'
import { mixMatch, setActiveMatchVersion, saveMatchOverride } from '@/actions/matching'
import { validateTableData } from '@/lib/matching'
import { COURSE_COLORS, btn, feedback } from '@/lib/design'
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

const COURSES: CourseType[] = ['appetizer', 'main', 'dessert']

export function MatchingBoard({ eventId, versions }: Props) {
  const router = useRouter()
  const t = useTranslations('organizer')
  const tc = useTranslations('common')
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

  const courseLabel = (course: CourseType) => t(course)

  return (
    <div className="mt-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('matchVersion', { version: activeVersion.version })}
        </h2>

        <div className="flex gap-1">
          <button
            onClick={handleUndo}
            disabled={!canUndo || isPending}
            className={btn.small}
            aria-label={t('undo')}
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo || isPending}
            className={btn.small}
            aria-label={t('redo')}
          >
            <Redo2 size={14} />
          </button>
        </div>

        <button
          onClick={handleMix}
          disabled={isPending}
          className={btn.primary}
        >
          <Shuffle size={14} className="mr-1.5" />
          {isPending ? tc('loading') : t('mix')}
        </button>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 text-sm">
            <button
              onClick={() => setTransportMode('bike')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-l-lg text-xs font-medium ${transportMode === 'bike' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Bike size={14} />
              {t('bike')}
            </button>
            <button
              onClick={() => setTransportMode('car')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-r-lg text-xs font-medium ${transportMode === 'car' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Car size={14} />
              {t('car')}
            </button>
          </div>
          {avgTime != null && (
            <span className="text-sm text-gray-500 tabular-nums">
              {t('avgTime', { minutes: Math.round(avgTime) })}
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
              <h3 className={`mb-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide ${colors.header}`}>
                {courseLabel(course)}
              </h3>
              <div className="flex flex-col gap-2">
                {courseTables.map(table => (
                  <div key={table.id} className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}>
                    <div className="mb-1.5">
                      <span className="text-sm font-semibold">{table.hostName}</span>
                      <span className="ml-1.5 text-xs text-gray-400">{table.hostCity}</span>
                    </div>
                    {table.guests.map((guest, idx) => (
                      <div
                        key={guest.duoId}
                        draggable
                        onDragStart={() => handleDragStart(table.id, idx)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => handleDrop(table.id, idx)}
                        className="cursor-grab rounded-md px-1.5 py-1 text-sm hover:bg-white/60"
                      >
                        {guest.name}
                        <span className="ml-1.5 text-xs text-gray-400">{guest.city}</span>
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
        <div className={`mt-4 ${feedback.warning}`}>
          <p className="mb-2 flex items-center gap-1.5 font-semibold">
            <AlertTriangle size={14} />
            {t('validationWarnings')}
          </p>
          <ul className="list-inside list-disc text-sm">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {saveError && (
        <div className={`mt-4 ${feedback.error}`}>
          {saveError}
        </div>
      )}

      {isDirty && (
        <button
          onClick={handleSave}
          disabled={validationErrors.length > 0 || isPending}
          className={`mt-4 ${btn.primary}`}
        >
          <Save size={14} className="mr-1.5" />
          {isPending ? tc('loading') : tc('save')}
        </button>
      )}
    </div>
  )
}
