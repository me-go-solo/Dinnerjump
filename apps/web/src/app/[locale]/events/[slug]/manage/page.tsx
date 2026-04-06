export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Thermometer } from '@/components/thermometer'
import { CountdownTimer } from '@/components/countdown-timer'
import { MatchingBoard } from '@/components/matching-board'
import { generateMatch, approveMatching } from '@/actions/matching'
import type { CourseType } from '@/lib/types'

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

  // Load matching data when event is in a matchable status
  const matchStatuses = ['confirmed', 'closed', 'active', 'completed']
  const showMatching = matchStatuses.includes(event.status)

  let matchVersions: Array<{
    id: string
    version: number
    isActive: boolean
    avgBikeMin: number | null
    avgCarMin: number | null
    tables: Array<{
      id: string
      course: CourseType
      tableNumber: number
      hostDuoId: string
      hostName: string
      hostCity: string
      guests: Array<{ duoId: string; name: string; city: string }>
    }>
  }> = []

  if (showMatching) {
    const { data: matches } = await supabase
      .from('matches')
      .select('id, version, is_active, avg_travel_time_bike_min, avg_travel_time_car_min')
      .eq('event_id', event.id)
      .order('version', { ascending: true })

    if (matches && matches.length > 0) {
      // Build a duo lookup: duoId -> { name, city }
      const duoMap = new Map(
        (duos ?? []).map(d => [d.id, {
          name: profileMap.get(d.person1_id) ?? 'Onbekend',
          city: d.city ?? '',
        }])
      )

      for (const match of matches) {
        const { data: matchTables } = await supabase
          .from('match_tables')
          .select('id, course, table_number, host_duo_id')
          .eq('match_id', match.id)
          .order('table_number', { ascending: true })

        const tablesWithGuests = []
        for (const mt of matchTables ?? []) {
          const { data: guests } = await supabase
            .from('match_table_guests')
            .select('duo_id')
            .eq('match_table_id', mt.id)

          const hostInfo = duoMap.get(mt.host_duo_id)
          tablesWithGuests.push({
            id: mt.id,
            course: mt.course as CourseType,
            tableNumber: mt.table_number,
            hostDuoId: mt.host_duo_id,
            hostName: hostInfo?.name ?? 'Onbekend',
            hostCity: hostInfo?.city ?? '',
            guests: (guests ?? []).map(g => {
              const info = duoMap.get(g.duo_id)
              return {
                duoId: g.duo_id,
                name: info?.name ?? 'Onbekend',
                city: info?.city ?? '',
              }
            }),
          })
        }

        matchVersions.push({
          id: match.id,
          version: match.version,
          isActive: match.is_active,
          avgBikeMin: match.avg_travel_time_bike_min,
          avgCarMin: match.avg_travel_time_car_min,
          tables: tablesWithGuests,
        })
      }
    }
  }

  const hasMatch = matchVersions.length > 0
  const showGenerateButton = event.status === 'confirmed' && !hasMatch
  const showApproveButton = event.status === 'closed' && hasMatch

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">{event.title}</h1>
      <p className="mb-6 text-sm text-gray-500">{new Date(event.event_date).toLocaleDateString()} — {event.start_time.slice(0, 5)}</p>

      <div className="mb-6 rounded border p-4">
        <p className="mb-1 text-sm font-medium">Deel deze link:</p>
        <code className="block rounded bg-gray-100 p-2 text-sm break-all">{shareUrl}</code>
        {event.type === 'closed' && <p className="mt-1 text-xs text-gray-500">Invite code: {event.invite_code}</p>}
      </div>

      <div className="mb-6"><Thermometer totalPaidDuos={totalPaid} confirmedDuos={confirmedCount} /></div>
      <CountdownTimer deadline={event.registration_deadline} />

      {showGenerateButton && (
        <form action={async () => {
          'use server'
          await generateMatch(event.id)
        }}>
          <button
            type="submit"
            className="mt-6 rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Genereer indeling
          </button>
        </form>
      )}

      {showApproveButton && (
        <form action={async () => {
          'use server'
          await approveMatching(event.id)
        }}>
          <button
            type="submit"
            className="mt-6 rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
          >
            Matching goedkeuren & onthullingen starten
          </button>
        </form>
      )}

      {hasMatch && (
        <MatchingBoard eventId={event.id} versions={matchVersions} />
      )}

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
