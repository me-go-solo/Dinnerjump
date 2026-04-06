export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOptimalMatch } from '@/lib/matching'
import { calculateDistance } from '@/lib/geo'
import type { DuoForMatching, CourseType } from '@/lib/types'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data: events } = await supabase.from('events')
    .select('id').eq('status', 'confirmed').lt('registration_deadline', now)

  if (!events?.length) return NextResponse.json({ matched: 0 })

  let matchedCount = 0

  for (const event of events) {
    const { data: existingMatch } = await supabase.from('matches')
      .select('id').eq('event_id', event.id).eq('is_active', true).single()
    if (existingMatch) continue

    const { data: duos } = await supabase.from('duos')
      .select('id, lat, lng, person1_id')
      .eq('event_id', event.id).eq('status', 'confirmed')

    if (!duos || duos.length < 9 || duos.length % 3 !== 0) continue

    const { data: profiles } = await supabase.from('profiles')
      .select('id, display_name').in('id', duos.map(d => d.person1_id))
    const nameMap = new Map((profiles ?? []).map(p => [p.id, p.display_name ?? 'Onbekend']))

    const duosForMatching: DuoForMatching[] = duos.map(d => ({
      id: d.id, lat: d.lat, lng: d.lng,
      displayName: nameMap.get(d.person1_id) ?? 'Onbekend',
    }))

    const travelTimes = new Map<string, number>()
    for (const d1 of duosForMatching) {
      for (const d2 of duosForMatching) {
        if (d1.id !== d2.id) {
          travelTimes.set(`${d1.id}-${d2.id}`, Math.round(calculateDistance(d1.lat, d1.lng, d2.lat, d2.lng) * 4))
        }
      }
    }

    const result = generateOptimalMatch(duosForMatching, travelTimes)

    const { data: match } = await supabase.from('matches').insert({
      event_id: event.id, version: 1, is_active: true,
    }).select('id').single()
    if (!match) continue

    await supabase.from('match_assignments').insert(
      duosForMatching.map(d => ({
        match_id: match.id, duo_id: d.id,
        hosted_course: result.assignments.get(d.id)! as CourseType,
        duo_display_name: d.displayName,
      }))
    )

    for (const table of result.tables) {
      const { data: tableRow } = await supabase.from('match_tables').insert({
        match_id: match.id, course: table.course,
        table_number: table.tableNumber, host_duo_id: table.hostDuoId,
      }).select('id').single()
      if (tableRow) {
        await supabase.from('match_table_guests').insert(
          table.guestDuoIds.map(guestId => ({ match_table_id: tableRow.id, duo_id: guestId }))
        )
      }
    }

    await supabase.from('events').update({ status: 'closed' }).eq('id', event.id)
    matchedCount++
  }

  return NextResponse.json({ matched: matchedCount })
}
