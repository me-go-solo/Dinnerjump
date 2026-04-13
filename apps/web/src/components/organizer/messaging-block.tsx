'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Mail, AlertTriangle } from 'lucide-react'
import { sendEmailToParticipants, sendEmergencyPush } from '@/actions/organizer'
import { btn, input, feedback } from '@/lib/design'

type Props = {
  eventId: string
}

export function MessagingBlock({ eventId }: Props) {
  const t = useTranslations('organizer')
  const tc = useTranslations('common')

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
    <div className="border-b border-gray-100 py-6 space-y-6">
      {/* Email section */}
      <div>
        <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <Mail size={14} />
          {t('emailAll')}
        </label>
        <textarea
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          placeholder={t('typeMessage')}
          rows={4}
          className={`${input.base} resize-none`}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleSendEmail}
            disabled={emailPending || !emailBody.trim()}
            className={btn.primary}
          >
            <Mail size={14} className="mr-1.5" />
            {emailPending ? tc('loading') : t('sendEmail')}
          </button>
          {emailResult?.success && (
            <span className="text-sm text-green-600">
              {t('sentToCount', { count: emailResult.count ?? 0 })}
            </span>
          )}
          {emailResult?.error && (
            <span className="text-sm text-red-600">{emailResult.error}</span>
          )}
        </div>
      </div>

      {/* Emergency push section */}
      <div className={feedback.error}>
        <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-700">
          <AlertTriangle size={14} />
          {t('emergency')}
        </label>
        <input
          type="text"
          value={emergencyMsg}
          onChange={(e) => setEmergencyMsg(e.target.value)}
          placeholder={t('emergencyPlaceholder')}
          className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm placeholder:text-red-300"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleSendEmergency}
            disabled={emergencyPending || !emergencyMsg.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
          >
            <AlertTriangle size={14} className="mr-1.5" />
            {emergencyPending ? tc('loading') : t('sendEmergency')}
          </button>
          {emergencyResult?.success && (
            <span className="text-sm text-green-600">
              {t('sentToCount', { count: emergencyResult.count ?? 0 })}
            </span>
          )}
          {emergencyResult?.error && (
            <span className="text-sm text-red-600">{emergencyResult.error}</span>
          )}
        </div>
        <p className="mt-2 text-xs text-red-500/70">{t('emergencyHint')}</p>
      </div>
    </div>
  )
}
