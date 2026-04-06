'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Mail, AlertTriangle } from 'lucide-react'
import { sendEmailToParticipants, sendEmergencyPush } from '@/actions/organizer'

type Props = {
  eventId: string
}

export function MessagingBlock({ eventId }: Props) {
  const t = useTranslations('organizer')

  // Email state
  const [emailBody, setEmailBody] = useState('')
  const [emailPending, startEmailTransition] = useTransition()
  const [emailResult, setEmailResult] = useState<{ success?: boolean; count?: number; error?: string } | null>(null)

  // Emergency state
  const [emergencyMsg, setEmergencyMsg] = useState('')
  const [emergencyPending, startEmergencyTransition] = useTransition()
  const [emergencyResult, setEmergencyResult] = useState<{ success?: boolean; count?: number; error?: string } | null>(null)

  function handleSendEmail() {
    if (!emailBody.trim()) return
    setEmailResult(null)
    startEmailTransition(async () => {
      const result = await sendEmailToParticipants(eventId, emailBody)
      setEmailResult(result)
      if ('success' in result && result.success) setEmailBody('')
    })
  }

  function handleSendEmergency() {
    if (!emergencyMsg.trim()) return
    setEmergencyResult(null)
    startEmergencyTransition(async () => {
      const result = await sendEmergencyPush(eventId, emergencyMsg)
      setEmergencyResult(result)
      if ('success' in result && result.success) setEmergencyMsg('')
    })
  }

  return (
    <div className="border-b py-5 space-y-6">
      {/* Email section */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">
          <Mail size={14} className="mr-1 inline" />
          {t('emailAll')}
        </label>
        <textarea
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          placeholder={t('typeMessage')}
          rows={4}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={handleSendEmail}
            disabled={emailPending || !emailBody.trim()}
            className="inline-flex items-center gap-1 rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Mail size={14} />
            {t('sendEmail')}
          </button>
          {emailResult?.success && (
            <span className="text-sm text-green-600">
              Verstuurd naar {emailResult.count} deelnemers
            </span>
          )}
          {emailResult?.error && (
            <span className="text-sm text-red-600">{emailResult.error}</span>
          )}
        </div>
      </div>

      {/* Emergency push section */}
      <div className="rounded border border-red-200 bg-red-50 p-4">
        <label className="mb-1 block text-sm font-semibold text-red-700">
          <AlertTriangle size={14} className="mr-1 inline" />
          {t('emergency')}
        </label>
        <input
          type="text"
          value={emergencyMsg}
          onChange={(e) => setEmergencyMsg(e.target.value)}
          placeholder={t('emergencyPlaceholder')}
          className="mt-1 w-full rounded border border-red-200 px-3 py-1.5 text-sm"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={handleSendEmergency}
            disabled={emergencyPending || !emergencyMsg.trim()}
            className="inline-flex items-center gap-1 rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <AlertTriangle size={14} />
            {t('sendEmergency')}
          </button>
          {emergencyResult?.success && (
            <span className="text-sm text-green-600">
              Verstuurd naar {emergencyResult.count} deelnemers
            </span>
          )}
          {emergencyResult?.error && (
            <span className="text-sm text-red-600">{emergencyResult.error}</span>
          )}
        </div>
        <p className="mt-2 text-xs text-red-500">{t('emergencyHint')}</p>
      </div>
    </div>
  )
}
