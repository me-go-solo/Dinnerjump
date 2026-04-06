import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { useMyEvent } from '../../lib/hooks/useMyEvent'
import { supabase } from '../../lib/supabase'
import { CountdownTimer } from '../../components/CountdownTimer'
import { RevealCard } from '../../components/RevealCard'
import { TablematePreview } from '../../components/TablematePreview'

const COURSE_LABELS: Record<string, string> = {
  appetizer: 'Voorgerecht',
  main: 'Hoofdgerecht',
  dessert: 'Nagerecht',
}

const AVATAR_COLORS = ['#e94560', '#4ecdc4', '#a78bfa', '#f5a623', '#6366f1', '#ec4899']

type CourseInfo = {
  course: 'appetizer' | 'main' | 'dessert'
  hostName: string
  address: string
  endTime: string
}

type TablemateInfo = {
  name: string
  isHost: boolean
}

export default function CourseScreen() {
  const { event, duo, reveals, loading, error, refresh } = useMyEvent()
  const [activeCourse, setActiveCourse] = useState<CourseInfo | null>(null)
  const [tablemates, setTablemates] = useState<TablemateInfo[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [courseLoading, setCourseLoading] = useState(true)

  useEffect(() => {
    if (!event || !duo || !reveals.length) {
      setCourseLoading(false)
      return
    }
    determineCourse()
  }, [event, duo, reveals])

  async function determineCourse() {
    if (!event || !duo) return
    setCourseLoading(true)

    const isRevealed = (type: string) => reveals.some(r => r.reveal_type === type && r.executed_at)

    // Determine active course based on reveal state
    let course: 'appetizer' | 'main' | 'dessert' | null = null
    if (isRevealed('address_course_1') && !isRevealed('course_2_full')) {
      course = 'appetizer'
    } else if (isRevealed('course_2_full') && !isRevealed('course_3_full')) {
      course = 'main'
    } else if (isRevealed('course_3_full')) {
      course = 'dessert'
    }

    if (!course) {
      setCourseLoading(false)
      return
    }

    // Get match and table info
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .eq('event_id', event.id)
      .eq('is_active', true)
      .single()

    if (!match) { setCourseLoading(false); return }

    // Find the table for this course where this duo is
    const { data: tables } = await supabase
      .from('match_tables')
      .select('id, host_duo_id')
      .eq('match_id', match.id)
      .eq('course', course)

    if (!tables || tables.length === 0) { setCourseLoading(false); return }

    // Find which table this duo is at (as host or guest)
    let myTable = tables.find(t => t.host_duo_id === duo.id)
    if (!myTable) {
      const { data: guestEntries } = await supabase
        .from('match_table_guests')
        .select('match_table_id')
        .eq('duo_id', duo.id)

      const guestTableIds = guestEntries?.map(g => g.match_table_id) ?? []
      myTable = tables.find(t => guestTableIds.includes(t.id))
    }

    if (!myTable) { setCourseLoading(false); return }

    // Get host duo info
    const { data: hostDuo } = await supabase
      .from('duos')
      .select('person1_id, address_line, city')
      .eq('id', myTable.host_duo_id)
      .single()

    let hostName = 'Onbekend'
    if (hostDuo) {
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', hostDuo.person1_id)
        .single()
      hostName = hostProfile?.display_name ?? 'Onbekend'
    }

    // Calculate end time for this course
    const startParts = event.start_time.split(':')
    let courseMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1])
    if (course === 'main') courseMinutes += event.appetizer_duration + event.travel_time_minutes
    if (course === 'dessert') courseMinutes += event.appetizer_duration + event.travel_time_minutes + event.main_duration + event.travel_time_minutes

    const durationMap = { appetizer: event.appetizer_duration, main: event.main_duration, dessert: event.dessert_duration }
    const endMinutes = courseMinutes + durationMap[course]
    const endH = Math.floor(endMinutes / 60)
    const endM = endMinutes % 60
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

    setActiveCourse({
      course,
      hostName,
      address: hostDuo ? `${hostDuo.address_line}, ${hostDuo.city}` : '',
      endTime,
    })

    // Load tablemates
    const { data: guests } = await supabase
      .from('match_table_guests')
      .select('duo_id')
      .eq('match_table_id', myTable.id)

    const allDuoIds = [myTable.host_duo_id, ...(guests?.map(g => g.duo_id) ?? [])].filter(id => id !== duo.id)

    const mates: TablemateInfo[] = []
    for (const duoId of allDuoIds) {
      const { data: d } = await supabase
        .from('duos')
        .select('person1_id, person2_id')
        .eq('id', duoId)
        .single()

      if (!d) continue
      const personIds = [d.person1_id, d.person2_id].filter((id): id is string => id != null)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('display_name')
        .in('id', personIds)

      for (const p of profiles ?? []) {
        mates.push({ name: p.display_name ?? '?', isHost: duoId === myTable.host_duo_id })
      }
    }

    setTablemates(mates)
    setCourseLoading(false)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  if (loading || courseLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' }}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    )
  }

  if (!event || !duo) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a', padding: 32 }}>
        <Text style={{ color: '#888', fontSize: 16, textAlign: 'center' }}>
          Je bent nog niet aangemeld voor een event.
        </Text>
      </View>
    )
  }

  if (!activeCourse) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a', padding: 32 }}>
        <Text style={{ color: '#888', fontSize: 18, textAlign: 'center', fontWeight: '600' }}>
          Nog geen actieve gang
        </Text>
        <Text style={{ color: '#555', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
          De gang wordt zichtbaar zodra de onthulling plaatsvindt.
        </Text>
      </View>
    )
  }

  // Determine next course reveal
  const isRevealed = (type: string) => reveals.some(r => r.reveal_type === type && r.executed_at)
  let nextCourseReveal: { type: string; scheduledAt: string } | null = null
  if (activeCourse.course === 'appetizer' && !isRevealed('course_2_full')) {
    const r = reveals.find(r => r.reveal_type === 'course_2_full')
    if (r) nextCourseReveal = { type: 'Hoofdgerecht', scheduledAt: r.scheduled_at }
  } else if (activeCourse.course === 'main' && !isRevealed('course_3_full')) {
    const r = reveals.find(r => r.reveal_type === 'course_3_full')
    if (r) nextCourseReveal = { type: 'Nagerecht', scheduledAt: r.scheduled_at }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0f0f1a' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
    >
      {/* Course header */}
      <View style={{ padding: 24, paddingTop: 60, backgroundColor: '#1a2a2e' }}>
        <Text style={{ color: '#4ecdc4', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700' }}>Nu bezig</Text>
        <Text style={{ color: 'white', fontSize: 28, fontWeight: '700', marginTop: 8 }}>
          {COURSE_LABELS[activeCourse.course]}
        </Text>
        <Text style={{ color: '#aaa', fontSize: 14, marginTop: 4 }}>
          Bij {activeCourse.hostName}
        </Text>
        <Text style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
          {activeCourse.address}
        </Text>
      </View>

      {/* Timer */}
      <View style={{ marginHorizontal: 20, marginTop: 20 }}>
        <View style={{ padding: 16, backgroundColor: '#1a1a2e', borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Het {COURSE_LABELS[activeCourse.course].toLowerCase()} duurt nog
          </Text>
          <CourseTimer endTime={activeCourse.endTime} eventDate={event.event_date} timezone={event.timezone} />
        </View>
      </View>

      {/* Tablemates */}
      <View style={{ marginHorizontal: 20, marginTop: 16, padding: 16, backgroundColor: '#1a1a2e', borderRadius: 12 }}>
        <Text style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Aan tafel met</Text>
        {tablemates.map((mate, i) => (
          <TablematePreview
            key={i}
            name={mate.name}
            disclosureLevel="full"
            color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
            isHost={mate.isHost}
          />
        ))}
      </View>

      {/* Next course locked card */}
      {nextCourseReveal && (
        <View style={{ marginHorizontal: 20, marginTop: 16 }}>
          <RevealCard
            title={nextCourseReveal.type}
            emoji={nextCourseReveal.type === 'Hoofdgerecht' ? '🍝' : '🍰'}
            isRevealed={false}
            scheduledAt={nextCourseReveal.scheduledAt}
          />
        </View>
      )}
    </ScrollView>
  )
}

function CourseTimer({ endTime, eventDate, timezone }: { endTime: string; eventDate: string; timezone: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const target = new Date(`${eventDate}T${endTime}:00`)
      const diff = target.getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Afgelopen!'); return }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setTimeLeft(`${hours}u ${String(minutes).padStart(2, '0')}m`)
    }

    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [endTime, eventDate])

  return (
    <Text style={{ color: '#f5a623', fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{timeLeft}</Text>
  )
}
