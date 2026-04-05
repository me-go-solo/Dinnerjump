import { describe, it, expect } from 'vitest'
import { calculateDistance, isWithinRadius } from '@/lib/geo'

describe('calculateDistance', () => {
  it('returns 0 for same point', () => {
    expect(calculateDistance(52.3676, 4.9041, 52.3676, 4.9041)).toBe(0)
  })
  it('calculates distance between Amsterdam and Utrecht (~35km)', () => {
    const distance = calculateDistance(52.3676, 4.9041, 52.0907, 5.1214)
    expect(distance).toBeGreaterThan(33)
    expect(distance).toBeLessThan(37)
  })
})

describe('isWithinRadius', () => {
  it('returns true for point within radius', () => {
    expect(isWithinRadius(52.3676, 4.9041, 52.3700, 4.9080, 5)).toBe(true)
  })
  it('returns false for point outside radius', () => {
    expect(isWithinRadius(52.3676, 4.9041, 52.0907, 5.1214, 5)).toBe(false)
  })
})
