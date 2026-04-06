export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { EventHeader } from '@/components/organizer/event-header'
import { RegistrationThermometer } from '@/components/organizer/registration-thermometer'
import { InvitationsBlock } from '@/components/organizer/invitations-block'
import { MessagingBlock } from '@/components/organizer/messaging-block'
import { ChevronLeft } from 'lucide-react'

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
    </div>
  )
}
