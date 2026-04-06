'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { updateEventSettings } from '@/actions/organizer'

type Props = {
  eventId: string
  afterpartyAddress: string | null
  invitationPolicy: 'organizer_only' | 'participants_allowed'
  appetizerDuration: number
  mainDuration: number
  dessertDuration: number
  isLocked: boolean
}

type EditingField = 'afterparty' | 'policy' | 'durations' | null

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins} minuten`
  if (mins === 0) return `${hours} uur`
  return `${hours} uur en ${mins} minuten`
}

export function EventSettings({
  eventId,
  afterpartyAddress,
  invitationPolicy,
  appetizerDuration,
  mainDuration,
  dessertDuration,
  isLocked,
}: Props) {
  const t = useTranslations('organizer')
  const tc = useTranslations('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState<EditingField>(null)

  // Local edit state
  const [editAfterparty, setEditAfterparty] = useState(afterpartyAddress ?? '')
  const [editPolicy, setEditPolicy] = useState(invitationPolicy)
  const [editAppetizer, setEditAppetizer] = useState(appetizerDuration)
  const [editMain, setEditMain] = useState(mainDuration)
  const [editDessert, setEditDessert] = useState(dessertDuration)

  function startEditing(field: EditingField) {
    if (isLocked) return
    // Reset values when starting edit
    setEditAfterparty(afterpartyAddress ?? '')
    setEditPolicy(invitationPolicy)
    setEditAppetizer(appetizerDuration)
    setEditMain(mainDuration)
    setEditDessert(dessertDuration)
    setEditing(field)
  }

  function cancel() {
    setEditing(null)
  }

  function save(field: EditingField) {
    startTransition(async () => {
      let settings: Parameters<typeof updateEventSettings>[1] = {}
      switch (field) {
        case 'afterparty':
          settings = { afterparty_address: editAfterparty || null }
          break
        case 'policy':
          settings = { invitation_policy: editPolicy }
          break
        case 'durations':
          settings = {
            appetizer_duration: editAppetizer,
            main_duration: editMain,
            dessert_duration: editDessert,
          }
          break
      }
      await updateEventSettings(eventId, settings)
      setEditing(null)
      router.refresh()
    })
  }

  const policyLabel =
    invitationPolicy === 'organizer_only'
      ? t('policyOrganizerOnly')
      : t('policyParticipantsAllowed')

  return (
    <div className="py-5">
      <h2 className="mb-1 text-sm font-semibold text-gray-700">{t('settings')}</h2>
      <p className="mb-3 text-xs text-gray-400">{t('settingsHint')}</p>

      {isLocked && (
        <div className="mb-3 rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
          {t('settingsLocked')}
        </div>
      )}

      <div className="space-y-3">
        {/* Afterparty address */}
        <div className="rounded border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{t('afterparty')}</p>
              {editing !== 'afterparty' && (
                <p className="text-sm text-gray-500">
                  {afterpartyAddress || t('notSet')}
                </p>
              )}
            </div>
            {editing !== 'afterparty' && !isLocked && (
              <button
                onClick={() => startEditing('afterparty')}
                className="text-xs text-blue-600 hover:underline"
              >
                {afterpartyAddress ? t('edit') : t('add')}
              </button>
            )}
          </div>
          {editing === 'afterparty' && (
            <div className="mt-2">
              <input
                type="text"
                value={editAfterparty}
                onChange={(e) => setEditAfterparty(e.target.value)}
                className="w-full rounded border px-3 py-1.5 text-sm"
                placeholder={t('afterparty')}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => save('afterparty')}
                  disabled={isPending}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {tc('save')}
                </button>
                <button
                  onClick={cancel}
                  className="rounded border px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  {tc('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Invitation policy */}
        <div className="rounded border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{t('invitationPolicy')}</p>
              {editing !== 'policy' && (
                <p className="text-sm text-gray-500">{policyLabel}</p>
              )}
            </div>
            {editing !== 'policy' && !isLocked && (
              <button
                onClick={() => startEditing('policy')}
                className="text-xs text-blue-600 hover:underline"
              >
                {t('edit')}
              </button>
            )}
          </div>
          {editing === 'policy' && (
            <div className="mt-2 space-y-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="policy"
                  checked={editPolicy === 'organizer_only'}
                  onChange={() => setEditPolicy('organizer_only')}
                />
                {t('policyOrganizerOnly')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="policy"
                  checked={editPolicy === 'participants_allowed'}
                  onChange={() => setEditPolicy('participants_allowed')}
                />
                {t('policyParticipantsAllowed')}
              </label>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => save('policy')}
                  disabled={isPending}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {tc('save')}
                </button>
                <button
                  onClick={cancel}
                  className="rounded border px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  {tc('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Course durations */}
        <div className="rounded border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{t('courseDurations')}</p>
              {editing !== 'durations' && (
                <p className="text-sm text-gray-500">
                  {t('durationFormat', {
                    appetizer: formatDuration(appetizerDuration),
                    main: formatDuration(mainDuration),
                    dessert: formatDuration(dessertDuration),
                  })}
                </p>
              )}
            </div>
            {editing !== 'durations' && !isLocked && (
              <button
                onClick={() => startEditing('durations')}
                className="text-xs text-blue-600 hover:underline"
              >
                {t('edit')}
              </button>
            )}
          </div>
          {editing === 'durations' && (
            <div className="mt-2">
              <div className="flex gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">{t('appetizer')}</label>
                  <input
                    type="number"
                    value={editAppetizer}
                    onChange={(e) => setEditAppetizer(Number(e.target.value))}
                    className="w-20 rounded border px-2 py-1 text-sm"
                    min={10}
                    max={120}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">{t('main')}</label>
                  <input
                    type="number"
                    value={editMain}
                    onChange={(e) => setEditMain(Number(e.target.value))}
                    className="w-20 rounded border px-2 py-1 text-sm"
                    min={10}
                    max={120}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">{t('dessert')}</label>
                  <input
                    type="number"
                    value={editDessert}
                    onChange={(e) => setEditDessert(Number(e.target.value))}
                    className="w-20 rounded border px-2 py-1 text-sm"
                    min={10}
                    max={120}
                  />
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => save('durations')}
                  disabled={isPending}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {tc('save')}
                </button>
                <button
                  onClick={cancel}
                  className="rounded border px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  {tc('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
