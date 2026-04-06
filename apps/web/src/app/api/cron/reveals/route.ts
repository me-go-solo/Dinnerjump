export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushNotifications } from '@/lib/push'
import { resend } from '@/lib/resend'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // 1. Activate pending reveals
  const { data: pendingReveals } = await admin
    .from('reveals')
    .select('id, event_id, reveal_type, scheduled_at')
    .is('executed_at', null)
    .lte('scheduled_at', new Date().toISOString())

  let activated = 0
  for (const reveal of pendingReveals ?? []) {
    await admin.from('reveals')
      .update({ executed_at: new Date().toISOString() })
      .eq('id', reveal.id)

    // Get event participants' push tokens + emails
    const { data: duos } = await admin
      .from('duos')
      .select('person1_id, person2_id')
      .eq('event_id', reveal.event_id)
      .neq('status', 'cancelled')

    const profileIds = (duos ?? []).flatMap(d => [d.person1_id, d.person2_id].filter((id): id is string => id != null))

    const { data: tokens } = await admin
      .from('push_tokens')
      .select('token')
      .in('profile_id', profileIds)

    // Determine notification content
    const titles: Record<string, string> = {
      course_assignment: '🍽️ Je gang is onthuld!',
      initials: '👀 Eerste letters van je tafelgenoten!',
      names_course_1: '🎉 Je tafelgenoten zijn bekend!',
      address_course_1: '📍 Je startadres is onthuld!',
      course_2_full: '🍝 Volgende gang onthuld!',
      course_3_full: '🍰 Laatste gang onthuld!',
      afterparty: '🎶 De afterparty is bekendgemaakt!',
    }

    const isPreEvent = ['course_assignment', 'initials', 'names_course_1', 'address_course_1']
      .includes(reveal.reveal_type)

    // Push notification (always)
    if (tokens && tokens.length > 0) {
      await sendPushNotifications(tokens.map(t => ({
        to: t.token,
        sound: 'default',
        title: titles[reveal.reveal_type] ?? 'Nieuwe onthulling!',
        body: 'Open de app om te bekijken.',
        data: { eventId: reveal.event_id, revealType: reveal.reveal_type },
        priority: isPreEvent ? 'default' : 'high',
      })))
    }

    // Email (pre-event only)
    if (isPreEvent) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('email, display_name')
        .in('id', profileIds)

      for (const profile of profiles ?? []) {
        if (!profile.email) continue
        await resend.emails.send({
          from: 'Dinner Jump <noreply@dinnerjump.nl>',
          to: profile.email,
          subject: titles[reveal.reveal_type] ?? 'Nieuwe onthulling!',
          text: `Hoi ${profile.display_name ?? ''},\n\n${titles[reveal.reveal_type]}\n\nOpen de Dinner Jump app om te bekijken.\n\nTot snel!`,
        })
      }
    }

    activated++
  }

  // 2. Send 15-min alarm for upcoming reveals
  const fifteenMinLater = new Date(Date.now() + 20 * 60 * 1000).toISOString()
  const fifteenMinBefore = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { data: upcomingReveals } = await admin
    .from('reveals')
    .select('id, event_id, reveal_type, scheduled_at')
    .is('executed_at', null)
    .gte('scheduled_at', fifteenMinBefore)
    .lte('scheduled_at', fifteenMinLater)

  for (const reveal of upcomingReveals ?? []) {
    const { data: duos } = await admin
      .from('duos')
      .select('person1_id, person2_id')
      .eq('event_id', reveal.event_id)
      .neq('status', 'cancelled')

    const profileIds = (duos ?? []).flatMap(d => [d.person1_id, d.person2_id].filter((id): id is string => id != null))

    const { data: tokens } = await admin
      .from('push_tokens')
      .select('token')
      .in('profile_id', profileIds)

    if (tokens && tokens.length > 0) {
      await sendPushNotifications(tokens.map(t => ({
        to: t.token,
        sound: 'default',
        title: '🔔 Bekendmaking over 15 minuten...',
        body: 'Er komt zo een onthulling aan!',
        data: { eventId: reveal.event_id, type: 'alarm' },
        priority: 'high',
      })))
    }
  }

  return NextResponse.json({ activated, alarms: upcomingReveals?.length ?? 0 })
}
