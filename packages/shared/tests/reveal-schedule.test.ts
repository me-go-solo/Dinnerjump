import { describe, it, expect } from 'vitest'
import { calculateRevealSchedule } from '../src/reveal-schedule'

describe('calculateRevealSchedule', () => {
  const base = {
    eventDate: '2026-06-15',
    startTime: '18:00',
    timezone: 'Europe/Amsterdam',
    appetizerDuration: 90,
    mainDuration: 120,
    dessertDuration: 60,
    travelTimeMinutes: 30,
    hasAfterparty: true,
  }

  it('creates 7 reveals with correct types', () => {
    const reveals = calculateRevealSchedule(base)
    expect(reveals).toHaveLength(7)
    expect(reveals.map(r => r.revealType)).toEqual([
      'course_assignment', 'initials', 'names_course_1', 'address_course_1',
      'course_2_full', 'course_3_full', 'afterparty',
    ])
  })

  it('spaces pre-event reveals at D-7, D-5, D-3, D-1 at noon local', () => {
    const reveals = calculateRevealSchedule(base)
    // D-7 = June 8 at 12:00 CEST (UTC+2) = June 8 10:00 UTC
    expect(reveals[0].scheduledAt).toBe('2026-06-08T10:00:00.000Z')
    // D-5 = June 10 at 12:00 CEST
    expect(reveals[1].scheduledAt).toBe('2026-06-10T10:00:00.000Z')
    // D-3 = June 12 at 12:00 CEST
    expect(reveals[2].scheduledAt).toBe('2026-06-12T10:00:00.000Z')
    // D-1 = June 14 at 12:00 CEST
    expect(reveals[3].scheduledAt).toBe('2026-06-14T10:00:00.000Z')
  })

  it('calculates event-day reveals based on gang durations', () => {
    const reveals = calculateRevealSchedule(base)
    // Event starts 18:00 CEST (16:00 UTC)
    // Appetizer: 18:00-19:30 (90 min). 15 min before end = 19:15 CEST = 17:15 UTC
    expect(reveals[4].scheduledAt).toBe('2026-06-15T17:15:00.000Z')
    // Travel: 30 min. Main: 20:00-22:00 (120 min). 15 min before end = 21:45 CEST = 19:45 UTC
    expect(reveals[5].scheduledAt).toBe('2026-06-15T19:45:00.000Z')
    // Travel: 30 min. Dessert: 22:30-23:30 (60 min). 15 min before end = 23:15 CEST = 21:15 UTC
    expect(reveals[6].scheduledAt).toBe('2026-06-15T21:15:00.000Z')
  })

  it('skips afterparty reveal when hasAfterparty is false', () => {
    const reveals = calculateRevealSchedule({ ...base, hasAfterparty: false })
    expect(reveals).toHaveLength(6)
    expect(reveals.map(r => r.revealType)).not.toContain('afterparty')
  })

  it('handles different timezone (UTC)', () => {
    const reveals = calculateRevealSchedule({ ...base, timezone: 'UTC' })
    // D-7 at noon UTC
    expect(reveals[0].scheduledAt).toBe('2026-06-08T12:00:00.000Z')
  })
})
