export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { duoId, eventSlug, locale } = await request.json()
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: duo } = await supabase.from('duos').select('id, event_id, person1_id').eq('id', duoId).eq('status', 'pending_payment').single()
  if (!duo) return NextResponse.json({ error: 'Duo not found' }, { status: 404 })

  // Verify the user owns this duo
  if (duo.person1_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: event } = await supabase.from('events').select('title').eq('id', duo.event_id).single()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['ideal', 'card', 'bancontact'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: { name: 'Dinner Jump Deelname', description: event?.title ?? 'Dinner Jump' },
        unit_amount: 1000,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${baseUrl}/${locale}/events/${eventSlug}/my?payment=success`,
    cancel_url: `${baseUrl}/${locale}/events/${eventSlug}/register?payment=cancelled`,
    metadata: { duo_id: duoId, event_id: duo.event_id },
  })

  return NextResponse.json({ url: session.url })
}
