export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventsOverview } from '@/components/organizer/events-overview'

export default async function OrganizerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const { data: events } = await supabase
    .from('events')
    .select('*, duos(id, status)')
    .eq('organizer_id', user.id)
    .order('event_date', { ascending: false })

  const eventsWithCounts = (events ?? []).map((e) => ({
    ...e,
    confirmed_count: e.duos?.filter((d: any) => d.status === 'confirmed').length ?? 0,
    total_count: e.duos?.filter((d: any) => d.status !== 'cancelled').length ?? 0,
    duos: undefined,
  }))

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <EventsOverview
        displayName={profile?.display_name ?? ''}
        events={eventsWithCounts}
      />
    </div>
  )
}
