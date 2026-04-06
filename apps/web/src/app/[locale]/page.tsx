import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function HomePage() {
  const t = await getTranslations('landing')
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 className="mb-4 text-5xl font-bold tracking-tight">{t('hero')}</h1>
      <p className="mb-8 text-xl text-gray-600">{t('subtitle')}</p>
      <div className="flex justify-center gap-4">
        <Link href="/events" className="rounded bg-black px-6 py-3 text-white hover:bg-gray-800">{t('ctaJoin')}</Link>
        <Link href="/events/create" className="rounded border border-black px-6 py-3 hover:bg-gray-50">{t('ctaOrganize')}</Link>
      </div>
    </div>
  )
}
