'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { sendPushNotifications } from '@/lib/push'
import { generateDuoCsv } from '@/lib/csv'

async function requireOrganizer(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event || event.organizer_id !== user.id) throw new Error('Not authorized')

  return { supabase, user, event }
}

export async function sendEmailToParticipants(eventId: string, body: string) {
  try {
    const { event } = await requireOrganizer(eventId)
    const admin = createAdminClient()

    // Get confirmed duos and their participant profile emails
    const { data: duos } = await admin.from('duos')
      .select('person1_id, person2_id')
      .eq('event_id', eventId)
      .eq('status', 'confirmed')

    if (!duos || duos.length === 0) return { error: 'No confirmed duos' }

    const profileIds = duos.flatMap(d =>
      d.person2_id ? [d.person1_id, d.person2_id] : [d.person1_id]
    )

    const { data: profiles } = await admin.from('profiles')
      .select('email')
      .in('id', profileIds)

    const emails = [...new Set((profiles ?? []).map(p => p.email))]
    if (emails.length === 0) return { error: 'No email addresses found' }

    await resend.emails.send({
      from: 'Dinner Jump <noreply@dinnerjump.nl>',
      to: emails,
      subject: `Update: ${event.title}`,
      text: body,
    })

    return { success: true, count: emails.length }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function sendEmergencyPush(eventId: string, message: string) {
  try {
    const { event } = await requireOrganizer(eventId)
    const admin = createAdminClient()

    const { data: duos } = await admin.from('duos')
      .select('person1_id, person2_id')
      .eq('event_id', eventId)
      .eq('status', 'confirmed')

    if (!duos || duos.length === 0) return { error: 'No confirmed duos' }

    const profileIds = duos.flatMap(d =>
      d.person2_id ? [d.person1_id, d.person2_id] : [d.person1_id]
    )

    const { data: tokens } = await admin.from('push_tokens')
      .select('token')
      .in('profile_id', profileIds)

    if (!tokens || tokens.length === 0) return { error: 'No push tokens found' }

    await sendPushNotifications(
      tokens.map(t => ({
        to: t.token,
        title: event.title,
        body: message,
        sound: 'default',
        priority: 'high' as const,
      }))
    )

    return { success: true, count: tokens.length }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function exportDuosCsv(eventId: string) {
  try {
    const { supabase } = await requireOrganizer(eventId)
    const admin = createAdminClient()

    const { data: duos } = await admin.from('duos')
      .select('id, person1_id, person2_id, status, created_at')
      .eq('event_id', eventId)
      .neq('status', 'cancelled')

    if (!duos || duos.length === 0) return { error: 'No duos found' }

    const allProfileIds = duos.flatMap(d =>
      d.person2_id ? [d.person1_id, d.person2_id] : [d.person1_id]
    )
    const { data: profiles } = await admin.from('profiles')
      .select('id, display_name, email')
      .in('id', allProfileIds)

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

    // Check for active match assignments
    const { data: activeMatch } = await admin.from('matches')
      .select('id')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .single()

    let assignmentMap = new Map<string, string>()
    if (activeMatch) {
      const { data: assignments } = await admin.from('match_assignments')
        .select('duo_id, hosted_course')
        .eq('match_id', activeMatch.id)
      for (const a of assignments ?? []) {
        assignmentMap.set(a.duo_id, a.hosted_course)
      }
    }

    const csvRows = duos.map(d => {
      const p1 = profileMap.get(d.person1_id)
      const p2 = d.person2_id ? profileMap.get(d.person2_id) : null
      return {
        person1_name: p1?.display_name ?? 'Onbekend',
        person2_name: p2?.display_name ?? null,
        person1_email: p1?.email ?? '',
        person2_email: p2?.email ?? null,
        status: d.status,
        created_at: d.created_at,
        hosted_course: assignmentMap.get(d.id) ?? null,
      }
    })

    const csv = generateDuoCsv(csvRows)
    return { csv }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function promoteDuo(eventId: string, duoId: string) {
  try {
    await requireOrganizer(eventId)
    const admin = createAdminClient()

    const { data: duo } = await admin.from('duos')
      .select('id, status')
      .eq('id', duoId)
      .eq('event_id', eventId)
      .single()

    if (!duo) return { error: 'Duo not found' }
    if (duo.status !== 'waitlisted') return { error: 'Duo is not waitlisted' }

    await admin.from('duos')
      .update({ status: 'confirmed' })
      .eq('id', duoId)

    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function updateEventSettings(
  eventId: string,
  settings: {
    title?: string
    description?: string | null
    afterparty_address?: string | null
    afterparty_lat?: number | null
    afterparty_lng?: number | null
    welcome_card_enabled?: boolean
    invitation_policy?: 'organizer_only' | 'participants_allowed'
  }
) {
  try {
    const { event } = await requireOrganizer(eventId)

    // Check T-7 lock: no changes within 7 days of event
    const eventDate = new Date(event.event_date)
    const now = new Date()
    const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntilEvent < 7) {
      return { error: 'Cannot update settings within 7 days of the event' }
    }

    const admin = createAdminClient()
    await admin.from('events').update(settings).eq('id', eventId)

    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function duplicateEvent(eventId: string) {
  try {
    const { event } = await requireOrganizer(eventId)

    return {
      prefill: {
        title: event.title,
        description: event.description,
        center_lat: event.center_lat,
        center_lng: event.center_lng,
        center_address: event.center_address,
        radius_km: event.radius_km,
        type: event.type,
        invitation_policy: event.invitation_policy,
        afterparty_address: event.afterparty_address,
        afterparty_lat: event.afterparty_lat,
        afterparty_lng: event.afterparty_lng,
        welcome_card_enabled: event.welcome_card_enabled,
        appetizer_duration: event.appetizer_duration,
        main_duration: event.main_duration,
        dessert_duration: event.dessert_duration,
        travel_time_minutes: event.travel_time_minutes,
      },
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function reinviteDuos(
  sourceEventId: string,
  targetEventId: string,
  duoIds: string[]
) {
  try {
    const { user } = await requireOrganizer(sourceEventId)

    // Verify target event also belongs to this organizer
    const supabase = await createClient()
    const { data: targetEvent } = await supabase.from('events')
      .select('id, organizer_id, title, slug')
      .eq('id', targetEventId)
      .single()

    if (!targetEvent || targetEvent.organizer_id !== user.id) {
      return { error: 'Not authorized for target event' }
    }

    const admin = createAdminClient()

    // Get profile emails for selected duos
    const { data: duos } = await admin.from('duos')
      .select('person1_id, person2_id')
      .in('id', duoIds)
      .eq('event_id', sourceEventId)

    if (!duos || duos.length === 0) return { error: 'No duos found' }

    const profileIds = duos.flatMap(d =>
      d.person2_id ? [d.person1_id, d.person2_id] : [d.person1_id]
    )

    const { data: profiles } = await admin.from('profiles')
      .select('email, display_name')
      .in('id', profileIds)

    const emails = [...new Set((profiles ?? []).map(p => p.email))]
    if (emails.length === 0) return { error: 'No email addresses found' }

    const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${targetEvent.slug}`

    await resend.emails.send({
      from: 'Dinner Jump <noreply@dinnerjump.nl>',
      to: emails,
      subject: `Je bent uitgenodigd voor ${targetEvent.title}`,
      text: [
        'Hoi,',
        '',
        `Je wordt uitgenodigd voor een nieuw Dinner Jump event: ${targetEvent.title}!`,
        '',
        `Schrijf je in via: ${eventUrl}`,
      ].join('\n'),
    })

    return { success: true, count: emails.length }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
