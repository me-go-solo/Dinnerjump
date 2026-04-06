'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Send } from 'lucide-react'

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
    // The existing sendInvitation requires a duoId which the organizer may not have.
    // For now this is a placeholder UI.
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
    // Instagram doesn't support direct sharing via URL — just copy the link
    await handleCopy()
  }

  async function handleQrCode() {
    // TODO: Generate QR code with `qrcode` package. For now, just copy the link.
    await handleCopy()
  }

  return (
    <div className="border-b py-5">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{t('invitations')}</h2>

      {/* Event link + copy */}
      <div className="flex items-center gap-2">
        <span className="truncate rounded bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
          {eventLink}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
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
            className="w-full rounded border px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">{t('email')}</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="w-full rounded border px-3 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={handleSendInvite}
          disabled={!inviteName || !inviteEmail}
          className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={14} />
          {t('sendInvite')}
        </button>
      </div>

      {/* Share buttons */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleWhatsApp}
          className="rounded px-3 py-1.5 text-sm font-medium text-white"
          style={{ backgroundColor: '#25D366' }}
        >
          WhatsApp
        </button>
        <button
          onClick={handleFacebook}
          className="rounded px-3 py-1.5 text-sm font-medium text-white"
          style={{ backgroundColor: '#1877F2' }}
        >
          Facebook
        </button>
        <button
          onClick={handleInstagram}
          className="rounded px-3 py-1.5 text-sm font-medium text-white"
          style={{
            background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
          }}
        >
          Instagram
        </button>
        <button
          onClick={handleQrCode}
          className="rounded border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('qrCode')}
        </button>
      </div>
    </div>
  )
}
