'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { card, btn } from '@/lib/design'

const DISMISS_KEY = 'dj_welcome_dismissed'

export function WelcomeCard({ displayName }: { displayName: string }) {
  const t = useTranslations('dashboard')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  return (
    <div className={`relative mb-8 ${card.accent}`}>
      <button
        onClick={dismiss}
        className="absolute right-4 top-4 text-gray-400 hover:text-black"
        aria-label="Sluiten"
      >
        <X className="h-4 w-4" />
      </button>
      <h2 className="mb-2 text-xl font-semibold tracking-tight">
        {t('welcomeTitle', { name: displayName })}
      </h2>
      <p className="mb-5 text-sm text-gray-500 leading-relaxed">{t('welcomeDescription')}</p>
      <Link href="/events/create" className={btn.primary}>
        {t('welcomeCta')}
      </Link>
    </div>
  )
}
