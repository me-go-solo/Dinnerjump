import { describe, it, expect } from 'vitest'
import { validateTableData } from '@/lib/matching'

const makeTable = (course: string, hostId: string, guestIds: string[]) => ({
  id: 'table-1', course, tableNumber: 1, hostDuoId: hostId,
  hostName: hostId, hostCity: 'City',
  guests: guestIds.map(id => ({ duoId: id, name: id, city: 'City' })),
})

describe('validateTableData', () => {
  it('returns valid for correct 9-duo arrangement', () => {
    const tables = [
      makeTable('appetizer', 'a1', ['b1', 'c1']),
      makeTable('appetizer', 'a2', ['b2', 'c2']),
      makeTable('appetizer', 'a3', ['b3', 'c3']),
      makeTable('main', 'b1', ['a3', 'c2']),
      makeTable('main', 'b2', ['a1', 'c3']),
      makeTable('main', 'b3', ['a2', 'c1']),
      makeTable('dessert', 'c1', ['a3', 'b2']),
      makeTable('dessert', 'c2', ['a1', 'b3']),
      makeTable('dessert', 'c3', ['a2', 'b1']),
    ]
    const result = validateTableData(tables)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('detects repeated tablemates', () => {
    const tables = [
      makeTable('appetizer', 'a1', ['b1', 'c1']),
      makeTable('appetizer', 'a2', ['b2', 'c2']),
      makeTable('appetizer', 'a3', ['b3', 'c3']),
      makeTable('main', 'b1', ['a1', 'c2']),
      makeTable('main', 'b2', ['a3', 'c3']),
      makeTable('main', 'b3', ['a2', 'c1']),
      makeTable('dessert', 'c1', ['a3', 'b2']),
      makeTable('dessert', 'c2', ['a1', 'b3']),
      makeTable('dessert', 'c3', ['a2', 'b1']),
    ]
    const result = validateTableData(tables)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('a1') && e.includes('b1'))).toBe(true)
  })

  it('detects table with wrong number of duos', () => {
    const tables = [
      makeTable('appetizer', 'a1', ['b1']),
      makeTable('appetizer', 'a2', ['b2', 'c2', 'c1']),
    ]
    const result = validateTableData(tables)
    expect(result.valid).toBe(false)
  })
})
