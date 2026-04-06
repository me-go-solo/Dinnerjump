import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export function Footer() {
  const t = useTranslations('nav')
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-gray-500">
        <span>&copy; {new Date().getFullYear()} Dinner Jump</span>
        <nav className="flex gap-4">
          <Link href="/about" className="hover:underline">{t('about')}</Link>
          <Link href="/faq" className="hover:underline">{t('faq')}</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
        </nav>
      </div>
    </footer>
  )
}
