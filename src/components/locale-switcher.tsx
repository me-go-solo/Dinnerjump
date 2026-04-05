'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <div className="flex gap-2 text-sm">
      <button onClick={() => switchLocale('nl')} className={locale === 'nl' ? 'font-bold' : 'opacity-60 hover:opacity-100'}>NL</button>
      <span className="opacity-30">|</span>
      <button onClick={() => switchLocale('en')} className={locale === 'en' ? 'font-bold' : 'opacity-60 hover:opacity-100'}>EN</button>
    </div>
  )
}
