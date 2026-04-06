export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') return NextResponse.json({ received: true })

  const session = event.data.object
  const duoId = session.metadata?.duo_id
  const eventId = session.metadata?.event_id
  if (!duoId || !eventId) return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })

  const supabase = createAdminClient()

  // Idempotency check
  const { data: duo } = await supabase.from('duos').select('status, payment_intent_id').eq('id', duoId).single()
  if (!duo || duo.status !== 'pending_payment') return NextResponse.json({ received: true })

  // Store payment intent
  await supabase.from('duos').update({ payment_intent_id: session.payment_intent as string }).eq('id', duoId)

  // Process waitlist via database function
  const { data: result, error: rpcError } = await supabase.rpc('process_duo_registration', { p_duo_id: duoId })
  if (rpcError) {
    console.error('Waitlist processing error:', rpcError)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  // Fire-and-forget email notifications
  sendNotificationEmails(supabase, result, eventId, duoId).catch(console.error)

  return NextResponse.json({ received: true, action: result.action })
}

async function sendNotificationEmails(supabase: ReturnType<typeof createAdminClient>, result: any, eventId: string, duoId: string) {
  const { data: event } = await supabase.from('events').select('title, organizer_id').eq('id', eventId).single()
  const { data: duo } = await supabase.from('duos').select('person1_id, person2_id').eq('id', duoId).single()
  if (!event || !duo) return

  const profileIds = [duo.person1_id, duo.person2_id].filter((id): id is string => id !== null)
  const { data: profiles } = await supabase.from('profiles').select('id, email, display_name, locale').in('id', profileIds)
  if (!profiles) return

  switch (result.action) {
    case 'registered':
      for (const p of profiles) {
        await resend.emails.send({ from: 'Dinner Jump <noreply@dinnerjump.nl>', to: p.email, subject: `Ingeschreven voor ${event.title}`, text: `Je bent ingeschreven. We wachten op het minimum van 9 duo's.` })
      }
      break
    case 'event_confirmed': {
      const { data: allDuos } = await supabase.from('duos').select('person1_id, person2_id').eq('event_id', eventId).eq('status', 'confirmed')
      if (allDuos) {
        const ids = allDuos.flatMap(d => [d.person1_id, d.person2_id].filter((id): id is string => id !== null))
        const { data: allProfiles } = await supabase.from('profiles').select('email').in('id', ids)
        for (const p of allProfiles ?? []) {
          await resend.emails.send({ from: 'Dinner Jump <noreply@dinnerjump.nl>', to: p.email, subject: `${event.title} gaat door!`, text: 'Het event gaat door! Je plek is bevestigd.' })
        }
      }
      break
    }
    case 'table_confirmed':
      for (const p of profiles) {
        await resend.emails.send({ from: 'Dinner Jump <noreply@dinnerjump.nl>', to: p.email, subject: `Plek bevestigd voor ${event.title}!`, text: 'Jullie plek is bevestigd!' })
      }
      break
    case 'waitlisted': {
      for (const p of profiles) {
        await resend.emails.send({ from: 'Dinner Jump <noreply@dinnerjump.nl>', to: p.email, subject: `Wachtlijst — ${event.title}`, text: `Je staat op de wachtlijst. Nog ${result.duos_needed} duo nodig.` })
      }
      const { data: waitlistedDuos } = await supabase.from('duos').select('person1_id').eq('event_id', eventId).eq('status', 'waitlisted').neq('id', duoId)
      if (waitlistedDuos) {
        const ids = waitlistedDuos.map(d => d.person1_id)
        const { data: wp } = await supabase.from('profiles').select('email').in('id', ids)
        for (const p of wp ?? []) {
          await resend.emails.send({ from: 'Dinner Jump <noreply@dinnerjump.nl>', to: p.email, subject: `Update wachtlijst — ${event.title}`, text: `Nog ${result.duos_needed} duo nodig!` })
        }
      }
      break
    }
  }

  // Notify organizer
  const { data: organizer } = await supabase.from('profiles').select('email').eq('id', event.organizer_id).single()
  if (organizer) {
    await resend.emails.send({ from: 'Dinner Jump <noreply@dinnerjump.nl>', to: organizer.email, subject: `Nieuw duo — ${event.title}`, text: `Nieuw duo ingeschreven. Totaal: ${result.total_paid}.` })
  }
}
