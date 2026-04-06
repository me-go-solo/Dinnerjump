import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { useMyEvent } from '../../lib/hooks/useMyEvent'
import { useAuth } from '../../lib/auth'
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

type TablemateInfo = {
  name: string
  isHost: boolean
}

export default function HomeScreen() {
  const { user } = useAuth()
  const { event, duo, reveals, hostedCourse, nextReveal, loading, error, refresh } = useMyEvent()
  const [displayName, setDisplayName] = useState('')
  const [tablemates, setTablemates] = useState<TablemateInfo[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setDisplayName(data?.display_name ?? ''))
  }, [user])

  // Fetch tablemates for course 1 when names are revealed
  useEffect(() => {
    if (!event || !duo) return
    const namesReveal = reveals.find(r => r.reveal_type === 'names_course_1' && r.executed_at)
    if (!namesReveal) return

    loadTablemates()
  }, [event, duo, reveals])

  async function loadTablemates() {
    if (!event || !duo) return
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .eq('event_id', event.id)
      .eq('is_active', true)
      .single()

    if (!match) return

    // Find table where this duo is either host or guest for appetizer
    const { data: tables } = await supabase
      .from('match_tables')
      .select('id, host_duo_id')
      .eq('match_id', match.id)
      .eq('course', 'appetizer')

    if (!tables) return

    // Find which table this duo is at
    let myTable = tables.find(t => t.host_duo_id === duo.id)
    if (!myTable) {
      const { data: guestEntries } = await supabase
        .from('match_table_guests')
        .select('match_table_id')
        .eq('duo_id', duo.id)

      const guestTableIds = guestEntries?.map(g => g.match_table_id) ?? []
      myTable = tables.find(t => guestTableIds.includes(t.id))
    }

    if (!myTable) return

    // Get all guests at this table
    const { data: guests } = await supabase
      .from('match_table_guests')
      .select('duo_id')
      .eq('match_table_id', myTable.id)

    const allDuoIds = [myTable.host_duo_id, ...(guests?.map(g => g.duo_id) ?? [])].filter(id => id !== duo.id)

    // Get person names from duos -> profiles
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
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  if (loading) {
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

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a', padding: 32 }}>
        <Text style={{ color: '#e94560', fontSize: 16, textAlign: 'center' }}>{error}</Text>
      </View>
    )
  }

  const isRevealed = (type: string) => reveals.some(r => r.reveal_type === type && r.executed_at)

  // Determine disclosure level for tablemates
  const getDisclosureLevel = (): 'hidden' | 'initial' | 'full' => {
    if (isRevealed('names_course_1')) return 'full'
    if (isRevealed('initials')) return 'initial'
    return 'hidden'
  }

  const disclosureLevel = getDisclosureLevel()

  // Format date
  const eventDate = new Date(event.event_date)
  const dateStr = eventDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Build tijdschema
  const startParts = event.start_time.split(':')
  const startHour = parseInt(startParts[0])
  const startMin = parseInt(startParts[1])
  const formatTime = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  const appetizerStart = formatTime(startHour, startMin)
  const appetizerEndMin = startMin + event.appetizer_duration + event.travel_time_minutes
  const mainStartH = startHour + Math.floor(appetizerEndMin / 60)
  const mainStartM = appetizerEndMin % 60
  const mainStart = formatTime(mainStartH, mainStartM)
  const mainEndMin = mainStartM + event.main_duration + event.travel_time_minutes
  const dessertStartH = mainStartH + Math.floor(mainEndMin / 60)
  const dessertStartM = mainEndMin % 60
  const dessertStart = formatTime(dessertStartH, dessertStartM)
  const dessertEndMin = dessertStartM + event.dessert_duration
  const endH = dessertStartH + Math.floor(dessertEndMin / 60)
  const endM = dessertEndMin % 60
  const endTime = formatTime(endH, endM)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0f0f1a' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
    >
      {/* Event header */}
      <View style={{ padding: 24, paddingTop: 60, backgroundColor: '#1a1a2e' }}>
        <Text style={{ color: '#e94560', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700' }}>Dinner Jump</Text>
        <Text style={{ color: 'white', fontSize: 28, fontWeight: '700', marginTop: 8 }}>{event.title}</Text>
        <Text style={{ color: '#aaa', fontSize: 14, marginTop: 4 }}>{dateStr}</Text>
        <Text style={{ color: '#aaa', fontSize: 14, marginTop: 2 }}>Start: {event.start_time}</Text>
      </View>

      {/* Welcome text */}
      <View style={{ padding: 20 }}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
          Hoi {displayName || 'daar'},
        </Text>
        <Text style={{ color: '#aaa', fontSize: 14, lineHeight: 22 }}>
          Drie gangen op drie locaties met telkens andere tafelgasten is een bijzondere event. En dat is deelnemen aan een DinnerJump ook.{'\n\n'}
          Want tijdens dit culinaire event wordt er met aandacht en passie gekookt om elkaar te verrassen met heerlijke gerechten en drankjes.{'\n\n'}
          Nu is het aan jullie om er iets bijzonders van te maken en jullie gasten een ervaring te geven die ze niet snel vergeten.{'\n\n'}
          Hieronder ontdekken jullie wat jullie gaan bereiden.
        </Text>
      </View>

      {/* Hosted course */}
      {hostedCourse && (
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <RevealCard
            title="Jullie verzorgen het"
            emoji="🍽️"
            isRevealed={isRevealed('course_assignment')}
            scheduledAt={reveals.find(r => r.reveal_type === 'course_assignment')?.scheduled_at}
          >
            <Text style={{ color: '#e94560', fontSize: 24, fontWeight: '700' }}>
              {COURSE_LABELS[hostedCourse] ?? hostedCourse}
            </Text>
            <Text style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
              Jullie bereiden dit gerecht thuis voor je gasten
            </Text>
          </RevealCard>
        </View>
      )}

      {/* Countdown to next reveal */}
      {nextReveal && (
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <CountdownTimer targetDate={nextReveal.scheduled_at} label="Volgende onthulling" />
        </View>
      )}

      {/* Tablemate preview */}
      <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
        <RevealCard
          title="Je tafelgenoten (voorgerecht)"
          emoji="👥"
          isRevealed={isRevealed('initials') || isRevealed('names_course_1')}
          scheduledAt={reveals.find(r => r.reveal_type === 'initials' && !r.executed_at)?.scheduled_at}
        >
          {tablemates.length > 0 ? (
            tablemates.map((mate, i) => (
              <TablematePreview
                key={i}
                name={mate.name}
                disclosureLevel={disclosureLevel}
                color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                isHost={mate.isHost}
              />
            ))
          ) : (
            <Text style={{ color: '#666', fontSize: 14 }}>Tafelgenoten worden geladen...</Text>
          )}
        </RevealCard>
      </View>

      {/* Address reveal */}
      {isRevealed('address_course_1') && (
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <RevealCard title="Startadres" emoji="📍" isRevealed={true}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              {/* Address is shown on Route tab */}
              Bekijk de Route tab voor navigatie
            </Text>
          </RevealCard>
        </View>
      )}

      {/* Locked reveals for course 2 and 3 */}
      {!isRevealed('course_2_full') && (
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <RevealCard
            title="Tweede gang"
            emoji="🍝"
            isRevealed={false}
            scheduledAt={reveals.find(r => r.reveal_type === 'course_2_full')?.scheduled_at}
          />
        </View>
      )}

      {!isRevealed('course_3_full') && (
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <RevealCard
            title="Derde gang"
            emoji="🍰"
            isRevealed={false}
            scheduledAt={reveals.find(r => r.reveal_type === 'course_3_full')?.scheduled_at}
          />
        </View>
      )}

      {/* Afterparty */}
      {isRevealed('afterparty') && event.afterparty_address && (
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <RevealCard title="Afterparty" emoji="🎶" isRevealed={true}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>{event.afterparty_address}</Text>
          </RevealCard>
        </View>
      )}

      {!isRevealed('afterparty') && (
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <RevealCard
            title="Afterparty"
            emoji="🎶"
            isRevealed={false}
            scheduledAt={reveals.find(r => r.reveal_type === 'afterparty')?.scheduled_at}
          />
        </View>
      )}

      {/* Tijdschema */}
      <View style={{ marginHorizontal: 20, marginBottom: 16, padding: 16, backgroundColor: '#1a1a2e', borderRadius: 12 }}>
        <Text style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Tijdschema</Text>
        <ScheduleRow time={appetizerStart} label="Voorgerecht" duration={event.appetizer_duration} />
        <ScheduleRow time={mainStart} label="Hoofdgerecht" duration={event.main_duration} />
        <ScheduleRow time={dessertStart} label="Nagerecht" duration={event.dessert_duration} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: '#f5a623', fontSize: 14, fontWeight: '700', width: 60 }}>{endTime}</Text>
          <Text style={{ color: '#aaa', fontSize: 14 }}>Einde / Afterparty</Text>
        </View>
      </View>
    </ScrollView>
  )
}

function ScheduleRow({ time, label, duration }: { time: string; label: string; duration: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <Text style={{ color: 'white', fontSize: 14, fontWeight: '700', width: 60 }}>{time}</Text>
      <Text style={{ color: '#aaa', fontSize: 14, flex: 1 }}>{label}</Text>
      <Text style={{ color: '#555', fontSize: 12 }}>{duration} min</Text>
    </View>
  )
}
