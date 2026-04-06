import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { getCache, setCache } from '../cache'

type EventData = {
  id: string
  title: string
  event_date: string
  start_time: string
  appetizer_duration: number
  main_duration: number
  dessert_duration: number
  timezone: string
  afterparty_address: string | null
  center_address: string
  travel_time_minutes: number
}

type DuoData = {
  id: string
  address_line: string
  city: string
  lat: number
  lng: number
}

type RevealData = {
  id: string
  reveal_type: string
  scheduled_at: string
  executed_at: string | null
}

export function useMyEvent() {
  const { user } = useAuth()
  const [event, setEvent] = useState<EventData | null>(null)
  const [duo, setDuo] = useState<DuoData | null>(null)
  const [reveals, setReveals] = useState<RevealData[]>([])
  const [hostedCourse, setHostedCourse] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    try {
      // Try cache first
      const cached = await getCache<{ event: EventData; duo: DuoData; reveals: RevealData[]; hostedCourse: string | null }>('myEvent')
      if (cached) {
        setEvent(cached.event)
        setDuo(cached.duo)
        setReveals(cached.reveals)
        setHostedCourse(cached.hostedCourse)
        setLoading(false)
      }

      // Fetch fresh data
      const { data: duos } = await supabase
        .from('duos')
        .select('id, event_id, address_line, city, lat, lng')
        .or(`person1_id.eq.${user!.id},person2_id.eq.${user!.id}`)
        .neq('status', 'cancelled')

      if (!duos || duos.length === 0) {
        setLoading(false)
        return
      }

      const myDuo = duos[0]
      setDuo(myDuo)

      const { data: eventData } = await supabase
        .from('events')
        .select('id, title, event_date, start_time, appetizer_duration, main_duration, dessert_duration, timezone, afterparty_address, center_address, travel_time_minutes')
        .eq('id', myDuo.event_id)
        .eq('status', 'active')
        .single()

      if (!eventData) {
        setLoading(false)
        return
      }

      setEvent(eventData)

      const { data: revealData } = await supabase
        .from('reveals')
        .select('id, reveal_type, scheduled_at, executed_at')
        .eq('event_id', eventData.id)
        .order('scheduled_at', { ascending: true })

      setReveals(revealData ?? [])

      // Get hosted course from match
      let foundHostedCourse: string | null = null
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .eq('event_id', eventData.id)
        .eq('is_active', true)
        .single()

      if (matches) {
        const { data: assignment } = await supabase
          .from('match_assignments')
          .select('hosted_course')
          .eq('match_id', matches.id)
          .eq('duo_id', myDuo.id)
          .single()

        foundHostedCourse = assignment?.hosted_course ?? null
        setHostedCourse(foundHostedCourse)
      }

      // Cache the data
      await setCache('myEvent', { event: eventData, duo: myDuo, reveals: revealData ?? [], hostedCourse: foundHostedCourse })

      setLoading(false)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const nextReveal = reveals.find(r => !r.executed_at)

  return { event, duo, reveals, hostedCourse, nextReveal, loading, error, refresh: loadData }
}
