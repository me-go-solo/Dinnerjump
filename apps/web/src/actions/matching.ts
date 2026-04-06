'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOptimalMatch } from '@/lib/matching'
import { calculateDistance } from '@/lib/geo'
import { calculateRevealSchedule } from '@dinnerjump/shared'
import type { DuoForMatching, CourseType } from '@/lib/types'

export async function generateMatch(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: event } = await supabase.from('events').select('id, organizer_id').eq('id', eventId).single()
  if (!event || event.organizer_id !== user.id) return { error: 'Not authorized' }

  const { data: duos } = await supabase.from('duos')
    .select('id, lat, lng, person1_id')
    .eq('event_id', eventId)
    .eq('status', 'confirmed')

  if (!duos || duos.length < 9 || duos.length % 3 !== 0) {
    return { error: 'Invalid duo count for matching' }
  }

  const { data: profiles } = await supabase.from('profiles')
    .select('id, display_name')
    .in('id', duos.map(d => d.person1_id))
  const nameMap = new Map((profiles ?? []).map(p => [p.id, p.display_name ?? 'Onbekend']))

  const duosForMatching: DuoForMatching[] = duos.map(d => ({
    id: d.id, lat: d.lat, lng: d.lng,
    displayName: nameMap.get(d.person1_id) ?? 'Onbekend',
  }))

  // Build travel times using Haversine fallback (~4 min/km cycling)
  const travelTimes = new Map<string, number>()
  for (const d1 of duosForMatching) {
    for (const d2 of duosForMatching) {
      if (d1.id !== d2.id) {
        const dist = calculateDistance(d1.lat, d1.lng, d2.lat, d2.lng)
        travelTimes.set(`${d1.id}-${d2.id}`, Math.round(dist * 4))
      }
    }
  }

  // Try Google Maps for better times
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const pairs = duosForMatching.flatMap(d1 =>
      duosForMatching.filter(d2 => d2.id !== d1.id).map(d2 => ({
        originLat: d1.lat, originLng: d1.lng, destLat: d2.lat, destLng: d2.lng,
      }))
    )
    const response = await fetch(`${baseUrl}/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origins: pairs, mode: 'bicycling' }),
    })
    if (response.ok) {
      const { routes } = await response.json()
      for (const d1 of duosForMatching) {
        for (const d2 of duosForMatching) {
          if (d1.id === d2.id) continue
          const route = routes.find((r: any) =>
            r.originLat === d1.lat && r.originLng === d1.lng &&
            r.destLat === d2.lat && r.destLng === d2.lng
          )
          if (route) travelTimes.set(`${d1.id}-${d2.id}`, route.durationMinutes)
        }
      }
    }
  } catch { /* fallback to Haversine */ }

  const result = generateOptimalMatch(duosForMatching, travelTimes)

  const admin = createAdminClient()

  // Get next version
  const { data: existing } = await admin.from('matches')
    .select('version')
    .eq('event_id', eventId)
    .order('version', { ascending: false })
    .limit(1)
  const nextVersion = (existing?.[0]?.version ?? 0) + 1

  // Deactivate previous
  await admin.from('matches').update({ is_active: false }).eq('event_id', eventId).eq('is_active', true)

  // Insert match
  const { data: match, error: matchError } = await admin.from('matches').insert({
    event_id: eventId, version: nextVersion, is_active: true,
  }).select('id').single()

  if (matchError || !match) return { error: 'Failed to save match' }

  // Insert assignments
  await admin.from('match_assignments').insert(
    duosForMatching.map(d => ({
      match_id: match.id, duo_id: d.id,
      hosted_course: result.assignments.get(d.id)! as CourseType,
      duo_display_name: d.displayName,
    }))
  )

  // Insert tables + guests
  for (const table of result.tables) {
    const { data: tableRow } = await admin.from('match_tables').insert({
      match_id: match.id, course: table.course,
      table_number: table.tableNumber, host_duo_id: table.hostDuoId,
    }).select('id').single()

    if (tableRow) {
      await admin.from('match_table_guests').insert(
        table.guestDuoIds.map(guestId => ({ match_table_id: tableRow.id, duo_id: guestId }))
      )
    }
  }

  return { matchId: match.id, version: nextVersion }
}

export async function mixMatch(eventId: string) {
  return generateMatch(eventId)
}

export async function approveMatching(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: event } = await supabase
    .from('events')
    .select('id, organizer_id, status, event_date, start_time, appetizer_duration, main_duration, dessert_duration, timezone, travel_time_minutes, afterparty_address')
    .eq('id', eventId)
    .single()

  if (!event || event.organizer_id !== user.id) return { error: 'Not authorized' }
  if (event.status !== 'closed') return { error: 'Event must be in closed status' }

  // Check active match exists
  const { data: activeMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .single()

  if (!activeMatch) return { error: 'No active match found' }

  // Calculate reveal schedule
  const schedule = calculateRevealSchedule({
    eventDate: event.event_date,
    startTime: event.start_time.slice(0, 5),
    timezone: event.timezone,
    appetizerDuration: event.appetizer_duration,
    mainDuration: event.main_duration,
    dessertDuration: event.dessert_duration,
    travelTimeMinutes: event.travel_time_minutes,
    hasAfterparty: !!event.afterparty_address,
  })

  const admin = createAdminClient()

  // Insert reveals
  const { error: revealError } = await admin.from('reveals').insert(
    schedule.map(r => ({
      event_id: eventId,
      reveal_type: r.revealType,
      scheduled_at: r.scheduledAt,
    }))
  )

  if (revealError) return { error: 'Failed to create reveals' }

  // Update event status to active
  await admin.from('events').update({ status: 'active' }).eq('id', eventId)

  return { success: true }
}

export async function saveMatchOverride(
  eventId: string,
  tables: Array<{
    id: string
    course: string
    tableNumber: number
    hostDuoId: string
    hostName: string
    hostCity: string
    guests: Array<{ duoId: string; name: string; city: string }>
  }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: event } = await supabase
    .from('events')
    .select('id, organizer_id')
    .eq('id', eventId)
    .single()
  if (!event || event.organizer_id !== user.id) return { error: 'Not authorized' }

  // Validate
  const { validateTableData } = await import('@/lib/matching')
  const validation = validateTableData(tables)
  if (!validation.valid) {
    return { error: 'Ongeldige indeling', errors: validation.errors }
  }

  const admin = createAdminClient()

  const { data: currentMatch } = await admin
    .from('matches')
    .select('id, version')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .single()

  if (!currentMatch) return { error: 'No active match found' }

  const nextVersion = currentMatch.version + 1

  await admin.from('matches').update({ is_active: false }).eq('id', currentMatch.id)

  const { data: newMatch, error: matchError } = await admin
    .from('matches')
    .insert({ event_id: eventId, version: nextVersion, is_active: true })
    .select('id')
    .single()

  if (matchError || !newMatch) return { error: 'Failed to create new version' }

  const assignments = new Map<string, CourseType>()
  for (const table of tables) {
    assignments.set(table.hostDuoId, table.course as CourseType)
  }

  const allDuoIds = [...new Set(tables.flatMap(t => [t.hostDuoId, ...t.guests.map(g => g.duoId)]))]

  const { data: duos } = await admin.from('duos').select('id, person1_id').in('id', allDuoIds)
  const { data: profiles } = await admin.from('profiles').select('id, display_name').in('id', (duos ?? []).map(d => d.person1_id))
  const nameMap = new Map((profiles ?? []).map(p => [p.id, p.display_name ?? 'Onbekend']))
  const duoNameMap = new Map((duos ?? []).map(d => [d.id, nameMap.get(d.person1_id) ?? 'Onbekend']))

  await admin.from('match_assignments').insert(
    allDuoIds.map(duoId => ({
      match_id: newMatch.id,
      duo_id: duoId,
      hosted_course: assignments.get(duoId) ?? 'appetizer' as CourseType,
      duo_display_name: duoNameMap.get(duoId) ?? 'Onbekend',
    }))
  )

  for (const table of tables) {
    const { data: tableRow } = await admin
      .from('match_tables')
      .insert({
        match_id: newMatch.id,
        course: table.course as CourseType,
        table_number: table.tableNumber,
        host_duo_id: table.hostDuoId,
      })
      .select('id')
      .single()

    if (tableRow) {
      await admin.from('match_table_guests').insert(
        table.guests.map(g => ({ match_table_id: tableRow.id, duo_id: g.duoId }))
      )
    }
  }

  return { success: true, version: nextVersion }
}

export async function setActiveMatchVersion(eventId: string, version: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: event } = await supabase.from('events').select('id, organizer_id').eq('id', eventId).single()
  if (!event || event.organizer_id !== user.id) return { error: 'Not authorized' }

  const admin = createAdminClient()
  const { data: match } = await admin.from('matches')
    .select('id').eq('event_id', eventId).eq('version', version).single()

  if (!match) return { error: 'Match version not found' }

  await admin.rpc('set_active_match', { p_match_id: match.id })
  return { success: true }
}
