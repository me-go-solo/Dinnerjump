import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Platform } from 'react-native'
import { useMyEvent } from '../../lib/hooks/useMyEvent'
import { supabase } from '../../lib/supabase'
import { StaticMap } from '../../components/StaticMap'
import { openInGoogleMaps, openInAppleMaps } from '../../lib/navigation'

const COURSE_LABELS: Record<string, string> = {
  appetizer: 'Voorgerecht',
  main: 'Hoofdgerecht',
  dessert: 'Nagerecht',
}

type RouteInfo = {
  course: string
  hostName: string
  address: string
  city: string
  lat: number
  lng: number
  travelMinutes: number
  distanceKm: number | null
}

export default function RouteScreen() {
  const { event, duo, reveals, loading, error, refresh } = useMyEvent()
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [routeLoading, setRouteLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!event || !duo || !reveals.length) {
      setRouteLoading(false)
      return
    }
    loadRouteInfo()
  }, [event, duo, reveals])

  async function loadRouteInfo() {
    if (!event || !duo) return
    setRouteLoading(true)

    const isRevealed = (type: string) => reveals.some(r => r.reveal_type === type && r.revealed_at)

    // Determine which course to navigate to
    let course: 'appetizer' | 'main' | 'dessert' | null = null
    if (isRevealed('address_course_1') && !isRevealed('course_2_full')) {
      course = 'appetizer'
    } else if (isRevealed('course_2_full') && !isRevealed('course_3_full')) {
      course = 'main'
    } else if (isRevealed('course_3_full')) {
      course = 'dessert'
    }

    if (!course) {
      setRouteLoading(false)
      return
    }

    // Get match and table info
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .eq('event_id', event.id)
      .eq('is_active', true)
      .single()

    if (!match) { setRouteLoading(false); return }

    const { data: tables } = await supabase
      .from('match_tables')
      .select('id, host_duo_id')
      .eq('match_id', match.id)
      .eq('course', course)

    if (!tables || tables.length === 0) { setRouteLoading(false); return }

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

    if (!myTable) { setRouteLoading(false); return }

    // Get host duo details
    const { data: hostDuo } = await supabase
      .from('duos')
      .select('person1_id, address_line, city, lat, lng')
      .eq('id', myTable.host_duo_id)
      .single()

    if (!hostDuo) { setRouteLoading(false); return }

    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', hostDuo.person1_id)
      .single()

    // Try to get cached route distance
    let distanceKm: number | null = null
    const { data: cachedRoute } = await supabase
      .from('route_cache')
      .select('distance_km, duration_minutes')
      .eq('origin_lat', duo.lat)
      .eq('origin_lng', duo.lng)
      .eq('dest_lat', hostDuo.lat)
      .eq('dest_lng', hostDuo.lng)
      .single()

    if (cachedRoute) {
      distanceKm = cachedRoute.distance_km
    }

    setRouteInfo({
      course: COURSE_LABELS[course] ?? course,
      hostName: hostProfile?.display_name ?? 'Onbekend',
      address: hostDuo.address_line,
      city: hostDuo.city,
      lat: hostDuo.lat,
      lng: hostDuo.lng,
      travelMinutes: cachedRoute?.duration_minutes ?? event.travel_time_minutes,
      distanceKm,
    })

    setRouteLoading(false)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  if (loading || routeLoading) {
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

  if (!routeInfo) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a', padding: 32 }}>
        <Text style={{ color: '#888', fontSize: 18, textAlign: 'center', fontWeight: '600' }}>
          Nog niet beschikbaar
        </Text>
        <Text style={{ color: '#555', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
          De route wordt zichtbaar zodra het adres is onthuld.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0f0f1a' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
    >
      {/* Header */}
      <View style={{ padding: 24, paddingTop: 60, backgroundColor: '#1a2a2e' }}>
        <Text style={{ color: '#4ecdc4', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700' }}>Volgende stop</Text>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: '700', marginTop: 8 }}>
          {routeInfo.course} bij {routeInfo.hostName}
        </Text>
      </View>

      {/* Static map */}
      <StaticMap destLat={routeInfo.lat} destLng={routeInfo.lng} />

      {/* Route info */}
      <View style={{ marginHorizontal: 20, padding: 16, backgroundColor: '#1a1a2e', borderRadius: 12 }}>
        <Text style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Route-informatie</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#aaa', fontSize: 14 }}>Adres</Text>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 16 }}>
            {routeInfo.address}, {routeInfo.city}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#aaa', fontSize: 14 }}>Geschatte reistijd</Text>
          <Text style={{ color: '#f5a623', fontSize: 14, fontWeight: '600' }}>~{routeInfo.travelMinutes} min</Text>
        </View>

        {routeInfo.distanceKm != null && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#aaa', fontSize: 14 }}>Afstand</Text>
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>{routeInfo.distanceKm.toFixed(1)} km</Text>
          </View>
        )}
      </View>

      {/* Tablemate hint */}
      <View style={{ marginHorizontal: 20, marginTop: 16, padding: 16, backgroundColor: '#1a1a2e', borderRadius: 12 }}>
        <Text style={{ color: '#aaa', fontSize: 14 }}>
          Je zit aan tafel met nieuwe tafelgenoten. Bekijk de Gang tab voor meer details.
        </Text>
      </View>

      {/* Navigation buttons */}
      <View style={{ marginHorizontal: 20, marginTop: 20, gap: 12 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#e94560', padding: 16, borderRadius: 12, alignItems: 'center' }}
          onPress={() => openInGoogleMaps(routeInfo.lat, routeInfo.lng)}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>Open in Google Maps</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={{ backgroundColor: '#1a1a2e', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' }}
            onPress={() => openInAppleMaps(routeInfo.lat, routeInfo.lng, `${routeInfo.course} - ${routeInfo.hostName}`)}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Open in Apple Maps</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}
