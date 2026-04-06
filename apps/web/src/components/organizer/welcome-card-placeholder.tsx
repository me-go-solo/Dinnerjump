'use client'

import { useTranslations } from 'next-intl'

export function WelcomeCardPlaceholder() {
  const t = useTranslations('organizer')

  return (
    <div className="border-b py-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">{t('welcomeCard')}</h2>
          <p className="text-xs text-gray-400">{t('comingSoon')}</p>
        </div>
        <div className="cursor-not-allowed opacity-50">
          <div className="h-6 w-10 rounded-full bg-gray-200 p-0.5">
            <div className="h-5 w-5 rounded-full bg-white shadow" />
          </div>
        </div>
      </div>
    </div>
  )
}
