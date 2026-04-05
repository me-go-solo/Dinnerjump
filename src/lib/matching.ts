import type { DuoForMatching, CourseType, TableAssignment, MatchResult } from '@/lib/types'

export type CourseGroups = {
  appetizer: DuoForMatching[]
  main: DuoForMatching[]
  dessert: DuoForMatching[]
}

export function assignCourses(duos: DuoForMatching[]): CourseGroups {
  if (duos.length % 3 !== 0) throw new Error(`Duo count must be divisible by 3, got ${duos.length}`)
  const shuffled = [...duos].sort(() => Math.random() - 0.5)
  const groupSize = duos.length / 3
  return {
    appetizer: shuffled.slice(0, groupSize),
    main: shuffled.slice(groupSize, groupSize * 2),
    dessert: shuffled.slice(groupSize * 2),
  }
}

export function buildTables(groups: CourseGroups): TableAssignment[] {
  const groupMap: Record<CourseType, DuoForMatching[]> = groups
  const n = groups.appetizer.length

  const tables: TableAssignment[] = []

  // Appetizer: host = A[i], guests = B[i], C[i]
  for (let i = 0; i < n; i++) {
    tables.push({
      course: 'appetizer',
      tableNumber: i + 1,
      hostDuoId: groupMap.appetizer[i].id,
      guestDuoIds: [groupMap.main[i].id, groupMap.dessert[i].id],
    })
  }

  // Main: host = B[j], guests = A[(j+2)%n], C[(j+1)%n]
  for (let j = 0; j < n; j++) {
    tables.push({
      course: 'main',
      tableNumber: j + 1,
      hostDuoId: groupMap.main[j].id,
      guestDuoIds: [groupMap.appetizer[(j + 2) % n].id, groupMap.dessert[(j + 1) % n].id],
    })
  }

  // Dessert: host = C[k], guests = A[(k+2)%n], B[(k+1)%n]
  for (let k = 0; k < n; k++) {
    tables.push({
      course: 'dessert',
      tableNumber: k + 1,
      hostDuoId: groupMap.dessert[k].id,
      guestDuoIds: [groupMap.appetizer[(k + 2) % n].id, groupMap.main[(k + 1) % n].id],
    })
  }

  return tables
}

export type ValidationResult = {
  valid: boolean
  errors: string[]
}

export function validateMatch(
  duos: DuoForMatching[],
  groups: CourseGroups,
  tables: TableAssignment[]
): ValidationResult {
  const errors: string[] = []
  const duoIds = new Set(duos.map(d => d.id))

  // Check all duos are assigned to tables
  const assignedIds = new Set<string>()
  for (const table of tables) {
    assignedIds.add(table.hostDuoId)
    table.guestDuoIds.forEach(id => assignedIds.add(id))
  }
  for (const id of duoIds) {
    if (!assignedIds.has(id)) errors.push(`Duo ${id} not assigned to any table`)
  }

  // Check no repeated tablemates
  const pairCounts = new Map<string, number>()
  for (const table of tables) {
    const allAtTable = [table.hostDuoId, ...table.guestDuoIds]
    for (let i = 0; i < allAtTable.length; i++) {
      for (let j = i + 1; j < allAtTable.length; j++) {
        const pair = [allAtTable[i], allAtTable[j]].sort().join('-')
        pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1)
      }
    }
  }
  for (const [pair, count] of pairCounts) {
    if (count > 1) errors.push(`Duo pair ${pair} shares a table ${count} times`)
  }

  // Check each table has exactly 3 duos
  for (const table of tables) {
    const total = 1 + table.guestDuoIds.length
    if (total !== 3) errors.push(`Table ${table.course}#${table.tableNumber} has ${total} duos, expected 3`)
  }

  return { valid: errors.length === 0, errors }
}

export type MatchScore = {
  totalMinutes: number
  maxSingleTrip: number
  weighted: number
}

export function scoreMatch(
  tables: TableAssignment[],
  travelTimes: Map<string, number>
): MatchScore {
  const courses: CourseType[] = ['appetizer', 'main', 'dessert']
  const duoLocationPerCourse = new Map<string, Map<CourseType, string>>()

  for (const table of tables) {
    const allAtTable = [table.hostDuoId, ...table.guestDuoIds]
    for (const duoId of allAtTable) {
      if (!duoLocationPerCourse.has(duoId)) duoLocationPerCourse.set(duoId, new Map())
      duoLocationPerCourse.get(duoId)!.set(table.course, table.hostDuoId)
    }
  }

  let totalMinutes = 0
  let maxSingleTrip = 0

  for (const [, locationMap] of duoLocationPerCourse) {
    for (let i = 0; i < courses.length - 1; i++) {
      const from = locationMap.get(courses[i])!
      const to = locationMap.get(courses[i + 1])!
      if (from === to) continue
      const key = `${from}-${to}`
      const time = travelTimes.get(key) ?? 0
      totalMinutes += time
      maxSingleTrip = Math.max(maxSingleTrip, time)
    }
  }

  return {
    totalMinutes,
    maxSingleTrip,
    weighted: totalMinutes + 2 * maxSingleTrip,
  }
}

export function generateOptimalMatch(
  duos: DuoForMatching[],
  travelTimes: Map<string, number>,
  attempts: number = 15
): MatchResult {
  let bestTables: TableAssignment[] | null = null
  let bestAssignments: Map<string, CourseType> | null = null
  let bestScore = Infinity

  for (let i = 0; i < attempts; i++) {
    const groups = assignCourses(duos)
    const tables = buildTables(groups)
    const validation = validateMatch(duos, groups, tables)
    if (!validation.valid) continue

    const score = scoreMatch(tables, travelTimes)
    if (score.weighted < bestScore) {
      bestScore = score.weighted
      bestTables = tables
      bestAssignments = new Map<string, CourseType>()
      for (const duo of groups.appetizer) bestAssignments.set(duo.id, 'appetizer')
      for (const duo of groups.main) bestAssignments.set(duo.id, 'main')
      for (const duo of groups.dessert) bestAssignments.set(duo.id, 'dessert')
    }
  }

  if (!bestTables || !bestAssignments) throw new Error('Could not generate a valid match')

  return { assignments: bestAssignments, tables: bestTables }
}

export function assignCoursesFromResult(duos: DuoForMatching[], result: MatchResult): CourseGroups {
  const groups: CourseGroups = { appetizer: [], main: [], dessert: [] }
  for (const duo of duos) {
    const course = result.assignments.get(duo.id)
    if (course) groups[course].push(duo)
  }
  return groups
}
