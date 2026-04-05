import { describe, it, expect } from 'vitest'
import { buildCacheKey, buildAllRoutePairs } from '@/lib/routes'

describe('buildCacheKey', () => {
  it('creates a deterministic key from coordinates and mode', () => {
    const key = buildCacheKey(52.37, 4.89, 52.38, 4.90, 'bicycling')
    expect(key).toBe('52.37,4.89→52.38,4.9:bicycling')
  })

  it('rounds coordinates to 6 decimal places', () => {
    const key = buildCacheKey(52.3700001, 4.8900001, 52.38, 4.90, 'driving')
    expect(key).toBe('52.37,4.89→52.38,4.9:driving')
  })
})

describe('buildAllRoutePairs', () => {
  it('generates route pairs for duo travel between courses', () => {
    const tables = [
      { course: 'appetizer' as const, tableNumber: 1, hostDuoId: 'a1', guestDuoIds: ['b1', 'c1'] as [string, string] },
      { course: 'main' as const, tableNumber: 1, hostDuoId: 'b1', guestDuoIds: ['a1', 'c2'] as [string, string] },
      { course: 'dessert' as const, tableNumber: 1, hostDuoId: 'c1', guestDuoIds: ['a2', 'b2'] as [string, string] },
    ]
    const duoLocations = new Map([
      ['a1', { lat: 52.37, lng: 4.89 }],
      ['a2', { lat: 52.38, lng: 4.90 }],
      ['b1', { lat: 52.36, lng: 4.88 }],
      ['b2', { lat: 52.39, lng: 4.91 }],
      ['c1', { lat: 52.35, lng: 4.87 }],
      ['c2', { lat: 52.40, lng: 4.92 }],
    ])

    const pairs = buildAllRoutePairs(tables, duoLocations)
    expect(pairs.length).toBeGreaterThan(0)
    for (const pair of pairs) {
      expect(pair.originLat === pair.destLat && pair.originLng === pair.destLng).toBe(false)
    }
  })
})
