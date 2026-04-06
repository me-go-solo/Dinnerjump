import { describe, it, expect } from 'vitest'
import { assignCourses, buildTables, validateMatch, scoreMatch, generateOptimalMatch, assignCoursesFromResult } from '@/lib/matching'
import type { DuoForMatching } from '@/lib/types'

function makeDuos(n: number): DuoForMatching[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `duo-${i}`,
    lat: 52.37 + i * 0.01,
    lng: 4.89 + i * 0.01,
    displayName: `Duo ${i}`,
  }))
}

describe('assignCourses', () => {
  it('divides 9 duos into 3 equal groups', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    expect(groups.appetizer).toHaveLength(3)
    expect(groups.main).toHaveLength(3)
    expect(groups.dessert).toHaveLength(3)
  })

  it('divides 12 duos into 3 equal groups', () => {
    const duos = makeDuos(12)
    const groups = assignCourses(duos)
    expect(groups.appetizer).toHaveLength(4)
    expect(groups.main).toHaveLength(4)
    expect(groups.dessert).toHaveLength(4)
  })

  it('every duo appears in exactly one group', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const allIds = [...groups.appetizer, ...groups.main, ...groups.dessert].map(d => d.id)
    expect(new Set(allIds).size).toBe(9)
  })

  it('throws if duo count is not divisible by 3', () => {
    expect(() => assignCourses(makeDuos(10))).toThrow()
  })
})

describe('buildTables', () => {
  it('creates correct number of tables for 9 duos', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)
    expect(tables).toHaveLength(9)
    expect(tables.filter(t => t.course === 'appetizer')).toHaveLength(3)
    expect(tables.filter(t => t.course === 'main')).toHaveLength(3)
    expect(tables.filter(t => t.course === 'dessert')).toHaveLength(3)
  })

  it('each table has 1 host from correct group + 2 guests from other groups', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)
    const appetizerHostIds = new Set(groups.appetizer.map(d => d.id))

    for (const table of tables.filter(t => t.course === 'appetizer')) {
      expect(appetizerHostIds.has(table.hostDuoId)).toBe(true)
      expect(appetizerHostIds.has(table.guestDuoIds[0])).toBe(false)
      expect(appetizerHostIds.has(table.guestDuoIds[1])).toBe(false)
    }
  })

  it('no duo sits with the same tablemate twice across courses', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)

    const tablemates = new Map<string, string[]>()
    for (const table of tables) {
      const allAtTable = [table.hostDuoId, ...table.guestDuoIds]
      for (const duoId of allAtTable) {
        const mates = allAtTable.filter(id => id !== duoId)
        const existing = tablemates.get(duoId) ?? []
        tablemates.set(duoId, [...existing, ...mates])
      }
    }

    for (const [, mates] of tablemates) {
      expect(mates.length).toBe(6)
      expect(new Set(mates).size).toBe(6)
    }
  })

  it('works for 12 duos', () => {
    const duos = makeDuos(12)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)
    expect(tables).toHaveLength(12)

    // Also verify no repeat tablemates for 12
    const tablemates = new Map<string, string[]>()
    for (const table of tables) {
      const allAtTable = [table.hostDuoId, ...table.guestDuoIds]
      for (const duoId of allAtTable) {
        const mates = allAtTable.filter(id => id !== duoId)
        const existing = tablemates.get(duoId) ?? []
        tablemates.set(duoId, [...existing, ...mates])
      }
    }
    for (const [, mates] of tablemates) {
      expect(new Set(mates).size).toBe(mates.length)
    }
  })

  it('works for 15 duos', () => {
    const duos = makeDuos(15)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)
    expect(tables).toHaveLength(15)
  })
})

describe('validateMatch', () => {
  it('returns valid for a correct 9-duo match', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)
    const result = validateMatch(duos, groups, tables)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('detects repeated tablemates', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)
    // Corrupt: make dessert table 0 have same guests as appetizer table 0
    tables[6].guestDuoIds = [...tables[0].guestDuoIds] as [string, string]
    const result = validateMatch(duos, groups, tables)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('scoreMatch', () => {
  it('returns a score based on travel times', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)

    const travelTimes = new Map<string, number>()
    for (const d1 of duos) {
      for (const d2 of duos) {
        if (d1.id !== d2.id) {
          travelTimes.set(`${d1.id}-${d2.id}`, 10)
        }
      }
    }

    const score = scoreMatch(tables, travelTimes)
    expect(score.totalMinutes).toBeGreaterThan(0)
    expect(score.maxSingleTrip).toBe(10)
    expect(score.weighted).toBe(score.totalMinutes + 2 * score.maxSingleTrip)
  })
})

describe('generateOptimalMatch', () => {
  it('returns a valid match with the best score from multiple shuffles', () => {
    const duos = makeDuos(9)
    const travelTimes = new Map<string, number>()
    for (const d1 of duos) {
      for (const d2 of duos) {
        if (d1.id !== d2.id) {
          const idx1 = duos.indexOf(d1)
          const idx2 = duos.indexOf(d2)
          travelTimes.set(`${d1.id}-${d2.id}`, Math.abs(idx1 - idx2) * 5)
        }
      }
    }

    const result = generateOptimalMatch(duos, travelTimes, 10)
    expect(result.tables).toHaveLength(9)
    const validation = validateMatch(duos, assignCoursesFromResult(duos, result), result.tables)
    expect(validation.valid).toBe(true)
  })

  it('works for 12 duos', () => {
    const duos = makeDuos(12)
    const travelTimes = new Map<string, number>()
    for (const d1 of duos) {
      for (const d2 of duos) {
        if (d1.id !== d2.id) {
          travelTimes.set(`${d1.id}-${d2.id}`, 10)
        }
      }
    }
    const result = generateOptimalMatch(duos, travelTimes, 5)
    expect(result.tables).toHaveLength(12)
    const validation = validateMatch(duos, assignCoursesFromResult(duos, result), result.tables)
    expect(validation.valid).toBe(true)
  })
})
