import { SearchX } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function NotFound() {
  const t = await getTranslations('notFound')

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <SearchX className="mb-4 h-12 w-12 text-gray-400" />
      <h1 className="mb-2 text-2xl font-bold">{t('title')}</h1>
      <p className="mb-8 text-gray-500">{t('description')}</p>
      <Link
        href="/"
        className="rounded bg-black px-6 py-3 text-white hover:bg-gray-800"
      >
        {t('backHome')}
      </Link>
    </div>
  )
}
