'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { reinviteDuos } from '@/actions/organizer'

type DuoForReinvite = {
  id: string
  person1_name: string
  person2_name: string | null
}

type EventOption = {
  id: string
  title: string
}

type Props = {
  sourceEventId: string
  duos: DuoForReinvite[]
  availableEvents: EventOption[]
}

export function ReinviteModal({ sourceEventId, duos, availableEvents }: Props) {
  const t = useTranslations('organizer')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [isOpen, setIsOpen] = useState(false)
  const [selectedDuoIds, setSelectedDuoIds] = useState<Set<string>>(new Set())
  const [targetEventId, setTargetEventId] = useState('')
  const [result, setResult] = useState<{ count?: number; error?: string } | null>(null)

  function open() {
    setSelectedDuoIds(new Set(duos.map(d => d.id)))
    setTargetEventId(availableEvents[0]?.id ?? '')
    setResult(null)
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
    setResult(null)
  }

  function toggleAll() {
    if (selectedDuoIds.size === duos.length) {
      setSelectedDuoIds(new Set())
    } else {
      setSelectedDuoIds(new Set(duos.map(d => d.id)))
    }
  }

  function toggleDuo(id: string) {
    setSelectedDuoIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function send() {
    if (!targetEventId || selectedDuoIds.size === 0) return
    startTransition(async () => {
      const res = await reinviteDuos(sourceEventId, targetEventId, Array.from(selectedDuoIds))
      if (res.error) {
        setResult({ error: res.error })
      } else {
        setResult({ count: res.count })
        router.refresh()
      }
    })
  }

  const allSelected = selectedDuoIds.size === duos.length

  return (
    <>
      <button
        onClick={open}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        {t('reinvite')}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <button
              onClick={close}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              aria-label="Sluiten"
            >
              ✕
            </button>

            <h2 className="mb-4 text-lg font-semibold">{t('reinvite')}</h2>

            {result ? (
              <div className="py-4">
                {result.count !== undefined ? (
                  <p className="text-sm text-green-700">
                    {result.count} uitnodiging{result.count !== 1 ? 'en' : ''} verzonden.
                  </p>
                ) : (
                  <p className="text-sm text-red-600">{result.error}</p>
                )}
                <button
                  onClick={close}
                  className="mt-4 rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Sluiten
                </button>
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm text-gray-500">{t('reinviteSelect')}</p>

                {/* Select/deselect all */}
                <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                  {allSelected ? 'Deselecteer alle' : 'Selecteer alle'}
                </label>

                {/* Duo list */}
                <div className="mb-4 max-h-48 overflow-y-auto rounded border">
                  {duos.map(duo => (
                    <label
                      key={duo.id}
                      className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDuoIds.has(duo.id)}
                        onChange={() => toggleDuo(duo.id)}
                      />
                      <span>
                        {duo.person1_name}
                        {duo.person2_name ? ` & ${duo.person2_name}` : ''}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Target event dropdown */}
                {availableEvents.length > 0 ? (
                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {t('reinviteToEvent')}
                    </label>
                    <select
                      value={targetEventId}
                      onChange={e => setTargetEventId(e.target.value)}
                      className="w-full rounded border px-3 py-2 text-sm"
                    >
                      {availableEvents.map(ev => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="mb-4 rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                    Geen beschikbare events. Maak eerst een nieuw event aan.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {availableEvents.length > 0 && (
                    <button
                      onClick={send}
                      disabled={isPending || selectedDuoIds.size === 0 || !targetEventId}
                      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isPending ? 'Bezig…' : t('reinviteToEvent')}
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/events/create')}
                    className="rounded border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t('reinviteNewEvent')}
                  </button>
                  <button
                    onClick={close}
                    className="rounded border px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
                  >
                    Annuleren
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
