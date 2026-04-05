import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Thermometer } from '@/components/thermometer'
import { CountdownTimer } from '@/components/countdown-timer'

export default async function ManagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('*').eq('slug', slug).eq('organizer_id', user.id).single()
  if (!event) notFound()

  const { data: duos } = await supabase.from('duos').select('id, city, status, is_organizer_duo, created_at, person1_id')
    .eq('event_id', event.id).neq('status', 'cancelled').order('created_at', { ascending: true })

  // Fetch display names for duo person1
  const person1Ids = duos?.map(d => d.person1_id) ?? []
  const { data: profiles } = person1Ids.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', person1Ids)
    : { data: [] }
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.display_name]))

  const totalPaid = duos?.filter(d => ['registered', 'waitlisted', 'confirmed'].includes(d.status)).length ?? 0
  const confirmedCount = duos?.filter(d => d.status === 'confirmed').length ?? 0

  const shareUrl = event.type === 'closed'
    ? `${process.env.NEXT_PUBLIC_APP_URL}/join/${event.invite_code}`
    : `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}`

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">{event.title}</h1>
      <p className="mb-6 text-sm text-gray-500">{new Date(event.event_date).toLocaleDateString()} — {event.start_time.slice(0, 5)}</p>

      <div className="mb-6 rounded border p-4">
        <p className="mb-1 text-sm font-medium">Deel deze link:</p>
        <code className="block rounded bg-gray-100 p-2 text-sm break-all">{shareUrl}</code>
        {event.type === 'closed' && <p className="mt-1 text-xs text-gray-500">Invite code: {event.invite_code}</p>}
      </div>

      <div className="mb-6"><Thermometer totalPaidDuos={totalPaid} confirmedDuos={confirmedCount} /></div>
      <CountdownTimer deadline={event.registration_deadline} />

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Duo&apos;s ({duos?.length ?? 0})</h2>
        <div className="flex flex-col gap-2">
          {duos?.map((duo) => (
            <div key={duo.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="font-medium">{profileMap.get(duo.person1_id) ?? 'Onbekend'}</p>
                <p className="text-xs text-gray-500">{duo.city}</p>
              </div>
              <span className={`rounded px-2 py-1 text-xs ${
                duo.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                duo.status === 'waitlisted' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>{duo.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
