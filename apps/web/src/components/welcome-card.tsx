'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { Link } from '@/i18n/navigation'

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
    <div className="relative mb-8 rounded-lg border-2 border-black p-6">
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 text-gray-400 hover:text-black"
        aria-label="Sluiten"
      >
        <X className="h-5 w-5" />
      </button>
      <h2 className="mb-2 text-xl font-bold">
        {t('welcomeTitle', { name: displayName })}
      </h2>
      <p className="mb-4 text-gray-600">{t('welcomeDescription')}</p>
      <Link
        href="/events/create"
        className="inline-block rounded bg-black px-6 py-3 text-white hover:bg-gray-800"
      >
        {t('welcomeCta')}
      </Link>
    </div>
  )
}
