import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { LocaleSwitcher } from './locale-switcher'

export function Header() {
  const t = useTranslations('nav')
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">Dinner Jump</Link>
        <nav className="flex items-center gap-6">
          <Link href="/events" className="text-sm hover:underline">{t('events')}</Link>
          <Link href="/events/create" className="text-sm hover:underline">{t('organize')}</Link>
          <Link href="/dashboard" className="text-sm hover:underline">{t('dashboard')}</Link>
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  )
}
