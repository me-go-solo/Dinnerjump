import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function JoinPage({ params }: { params: Promise<{ invite_code: string }> }) {
  const { invite_code } = await params
  const supabase = await createClient()
  const { data: event } = await supabase.from('events').select('slug').eq('invite_code', invite_code).single()
  if (!event) redirect('/events')
  redirect(`/events/${event.slug}`)
}
