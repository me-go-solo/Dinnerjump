import type { TableAssignment, CourseType } from '@/lib/types'

export type RoutePair = {
  originLat: number
  originLng: number
  destLat: number
  destLng: number
}

export function buildCacheKey(
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  mode: string
): string {
  const round = (n: number) => parseFloat(n.toFixed(6))
  return `${round(originLat)},${round(originLng)}→${round(destLat)},${round(destLng)}:${mode}`
}

export function buildAllRoutePairs(
  tables: TableAssignment[],
  duoLocations: Map<string, { lat: number; lng: number }>
): RoutePair[] {
  const courses: CourseType[] = ['appetizer', 'main', 'dessert']

  const duoHostPerCourse = new Map<string, Map<CourseType, string>>()
  for (const table of tables) {
    const allAtTable = [table.hostDuoId, ...table.guestDuoIds]
    for (const duoId of allAtTable) {
      if (!duoHostPerCourse.has(duoId)) duoHostPerCourse.set(duoId, new Map())
      duoHostPerCourse.get(duoId)!.set(table.course, table.hostDuoId)
    }
  }

  const seen = new Set<string>()
  const pairs: RoutePair[] = []

  for (const [, hostMap] of duoHostPerCourse) {
    for (let i = 0; i < courses.length - 1; i++) {
      const fromHost = hostMap.get(courses[i])
      const toHost = hostMap.get(courses[i + 1])
      if (!fromHost || !toHost || fromHost === toHost) continue

      const fromLoc = duoLocations.get(fromHost)
      const toLoc = duoLocations.get(toHost)
      if (!fromLoc || !toLoc) continue
      const key = `${fromLoc.lat},${fromLoc.lng}→${toLoc.lat},${toLoc.lng}`
      if (seen.has(key)) continue
      seen.add(key)

      pairs.push({
        originLat: fromLoc.lat, originLng: fromLoc.lng,
        destLat: toLoc.lat, destLng: toLoc.lng,
      })
    }
  }

  return pairs
}
