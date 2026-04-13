'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Send } from 'lucide-react'
import { btn, input } from '@/lib/design'

type Props = {
  eventId: string
  eventSlug: string
  appUrl: string
}

export function InvitationsBlock({ eventId, eventSlug, appUrl }: Props) {
  const t = useTranslations('organizer')
  const [copied, setCopied] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  const eventLink = `${appUrl}/events/${eventSlug}`

  async function handleCopy() {
    await navigator.clipboard.writeText(eventLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSendInvite() {
    // TODO: Wire up to a proper organizer invite action.
    console.log('Send invite to', inviteName, inviteEmail, 'for event', eventId)
    setInviteName('')
    setInviteEmail('')
  }

  function handleWhatsApp() {
    const text = encodeURIComponent(eventLink)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  function handleFacebook() {
    const url = encodeURIComponent(eventLink)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
  }

  async function handleInstagram() {
    await handleCopy()
  }

  async function handleQrCode() {
    await handleCopy()
  }

  return (
    <div className="border-b border-gray-100 py-6">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">{t('invitations')}</h2>

      {/* Event link + copy */}
      <div className="flex items-center gap-2">
        <span className="truncate rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500 font-mono">
          {eventLink}
        </span>
        <button onClick={handleCopy} className={btn.small}>
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          {copied ? t('copied') : t('copyLink')}
        </button>
      </div>

      {/* Personal invite form */}
      <div className="mt-4 flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">{t('name')}</label>
          <input
            type="text"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            className={input.small}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">{t('email')}</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className={input.small}
          />
        </div>
        <button
          onClick={handleSendInvite}
          disabled={!inviteName || !inviteEmail}
          className={btn.save}
        >
          <Send size={14} className="mr-1" />
          {t('sendInvite')}
        </button>
      </div>

      {/* Share buttons — minimal, monochrome for premium feel */}
      <div className="mt-4 flex gap-2">
        <button onClick={handleWhatsApp} className={btn.small}>
          WhatsApp
        </button>
        <button onClick={handleFacebook} className={btn.small}>
          Facebook
        </button>
        <button onClick={handleInstagram} className={btn.small}>
          Instagram
        </button>
        <button onClick={handleQrCode} className={btn.small}>
          {t('qrCode')}
        </button>
      </div>
    </div>
  )
}
