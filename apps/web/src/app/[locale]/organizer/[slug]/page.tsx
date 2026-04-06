export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Link } from '@/i18n/navigation'
import { EventHeader } from '@/components/organizer/event-header'
import { RegistrationThermometer } from '@/components/organizer/registration-thermometer'
import { InvitationsBlock } from '@/components/organizer/invitations-block'
import { MessagingBlock } from '@/components/organizer/messaging-block'
import { DuoList } from '@/components/organizer/duo-list'
import { MatchingOverview } from '@/components/organizer/matching-overview'
import { NotificationLog } from '@/components/organizer/notification-log'
import { WelcomeCardPlaceholder } from '@/components/organizer/welcome-card-placeholder'
import { EventSettings } from '@/components/organizer/event-settings'
import { ChevronLeft } from 'lucide-react'
import type { CourseType } from '@/lib/types'

type Props = { params: Promise<{ slug: string }> }

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('organizer_id', user.id)
    .single()

  if (!event) notFound()

  const { count: confirmedCount } = await supabase
    .from('duos')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('status', 'confirmed')

  // ── Duo data ──────────────────────────────────────────────────
  const { data: duos } = await supabase
    .from('duos')
    .select('id, person1_id, person2_id, status, created_at')
    .eq('event_id', event.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })

  // Fetch profile names for all person IDs
  const allPersonIds = (duos ?? []).flatMap(d =>
    d.person2_id ? [d.person1_id, d.person2_id] : [d.person1_id]
  )
  const { data: profiles } = allPersonIds.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', allPersonIds)
    : { data: [] }
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.display_name ?? 'Onbekend']))

  // Check for active match assignments to get hosted_course per duo
  const { data: activeMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('event_id', event.id)
    .eq('is_active', true)
    .single()

  let assignmentMap = new Map<string, string>()
  if (activeMatch) {
    const { data: assignments } = await supabase
      .from('match_assignments')
      .select('duo_id, hosted_course')
      .eq('match_id', activeMatch.id)
    for (const a of assignments ?? []) {
      assignmentMap.set(a.duo_id, a.hosted_course)
    }
  }

  const duoData = (duos ?? [])
    .filter(d => ['confirmed', 'waitlisted', 'registered'].includes(d.status))
    .map(d => ({
      id: d.id,
      person1_name: profileMap.get(d.person1_id) ?? 'Onbekend',
      person2_name: d.person2_id ? (profileMap.get(d.person2_id) ?? null) : null,
      status: d.status as 'confirmed' | 'waitlisted' | 'registered',
      created_at: d.created_at,
      hosted_course: assignmentMap.get(d.id) ?? null,
    }))

  // Invited but not registered names
  const { data: invitations } = await supabase
    .from('invitations')
    .select('invitee_name, created_at')
    .eq('event_id', event.id)
    .in('status', ['sent', 'opened'])

  const invitedNames = (invitations ?? []).map(inv => ({
    name: inv.invitee_name ?? 'Onbekend',
    date: inv.created_at,
  }))

  // ── Matching data ─────────────────────────────────────────────
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
      // Fetch duo city info for matching display
      const { data: duosWithCity } = await supabase
        .from('duos')
        .select('id, city, person1_id')
        .eq('event_id', event.id)
        .neq('status', 'cancelled')

      const duoMap = new Map(
        (duosWithCity ?? []).map(d => [d.id, {
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

  // ── Notification log ──────────────────────────────────────────
  // notification_log table is not in the generated Database types, so we use
  // the admin client and cast the result.
  const admin = createAdminClient()
  const { data: notificationLog } = await admin
    .from('notification_log' as any)
    .select('id, type, subject, body, recipient_count, created_at')
    .eq('event_id', event.id)
    .order('created_at', { ascending: false }) as { data: Array<{ id: string; type: string; subject: string | null; body: string; recipient_count: number; created_at: string }> | null }

  const notifications = (notificationLog ?? []).map(n => ({
    id: n.id,
    type: n.type as 'email' | 'push',
    subject: n.subject,
    body: n.body,
    recipient_count: n.recipient_count,
    created_at: n.created_at,
  }))

  // ── Settings ──────────────────────────────────────────────────
  const isLocked = new Date(event.event_date).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/organizer"
        className="mb-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        <ChevronLeft size={14} />
        Terug naar overzicht
      </Link>

      <EventHeader event={event} confirmedCount={confirmedCount ?? 0} />

      <RegistrationThermometer confirmedCount={confirmedCount ?? 0} />

      <InvitationsBlock
        eventId={event.id}
        eventSlug={event.slug}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
      />

      <MessagingBlock eventId={event.id} />

      <DuoList
        eventId={event.id}
        duos={duoData}
        invitedNames={invitedNames}
      />

      <MatchingOverview
        eventId={event.id}
        eventStatus={event.status}
        versions={matchVersions}
      />

      <NotificationLog notifications={notifications} />

      <WelcomeCardPlaceholder />

      <EventSettings
        eventId={event.id}
        afterpartyAddress={event.afterparty_address}
        invitationPolicy={event.invitation_policy}
        appetizerDuration={event.appetizer_duration}
        mainDuration={event.main_duration}
        dessertDuration={event.dessert_duration}
        isLocked={isLocked}
      />
    </div>
  )
}
