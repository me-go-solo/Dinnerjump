export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { WelcomeCard } from '@/components/welcome-card'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const { data: myDuos } = await supabase.from('duos').select('event_id, status')
    .or(`person1_id.eq.${user.id},person2_id.eq.${user.id}`).neq('status', 'cancelled')

  const eventIds = [...new Set(myDuos?.map(d => d.event_id) ?? [])]
  const { data: participatingEvents } = eventIds.length > 0
    ? await supabase.from('events').select('*').in('id', eventIds).order('event_date', { ascending: true })
    : { data: [] }

  const { data: organizingEvents } = await supabase.from('events').select('*')
    .eq('organizer_id', user.id).order('event_date', { ascending: true })

  const showWelcome = !organizingEvents || organizingEvents.length === 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">{t('title')}</h1>

      {showWelcome && (
        <WelcomeCard displayName={profile?.display_name ?? ''} />
      )}

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">{t('asParticipant')}</h2>
        {participatingEvents && participatingEvents.length > 0 ? (
          <div className="flex flex-col gap-3">
            {participatingEvents.map((e) => (
              <Link key={e.id} href={`/events/${e.slug}/my`} className="block rounded border p-4 hover:border-black">
                <h3 className="font-medium">{e.title}</h3>
                <p className="text-sm text-gray-500">{new Date(e.event_date).toLocaleDateString()}</p>
              </Link>
            ))}
          </div>
        ) : <p className="text-gray-500">{t('noEvents')}</p>}
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold">{t('asOrganizer')}</h2>
        {organizingEvents && organizingEvents.length > 0 ? (
          <div className="flex flex-col gap-3">
            {organizingEvents.map((e) => (
              <Link key={e.id} href={`/events/${e.slug}/manage`} className="block rounded border p-4 hover:border-black">
                <h3 className="font-medium">{e.title}</h3>
                <p className="text-sm text-gray-500">{e.status} — {new Date(e.event_date).toLocaleDateString()}</p>
              </Link>
            ))}
          </div>
        ) : <Link href="/events/create" className="text-sm underline">{t('createFirst')}</Link>}
      </section>
    </div>
  )
}
