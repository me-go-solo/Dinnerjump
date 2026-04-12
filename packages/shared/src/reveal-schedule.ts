import type { RevealScheduleInput } from './types'
import type { RevealType } from './constants'
import { REVEAL_ORDER } from './constants'

export type RevealScheduleEntry = {
  revealType: RevealType
  scheduledAt: string
}

/**
 * Compute the UTC offset in minutes for a given timezone at a specific date.
 * Returns the offset such that local = UTC + offset.
 */
function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  // Format the date in the target timezone to extract its components
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const get = (type: string) => parseInt(parts.find(p => p.type === type)!.value)

  const localYear = get('year')
  const localMonth = get('month')
  const localDay = get('day')
  let localHour = get('hour')
  // Intl may return hour 24 for midnight
  if (localHour === 24) localHour = 0
  const localMinute = get('minute')
  const localSecond = get('second')

  // Build a UTC date with the same numeric components as the local time
  const localAsUtc = Date.UTC(localYear, localMonth - 1, localDay, localHour, localMinute, localSecond)

  // The offset is the difference: local representation - actual UTC
  const offsetMs = localAsUtc - date.getTime()
  return Math.round(offsetMs / 60000)
}

/**
 * Convert a local date+time in a given timezone to a UTC ISO string.
 * Handles DST transitions:
 * - Spring forward (nonexistent time): shifts to the next valid time
 * - Fall back (ambiguous time): picks the first occurrence (summer time)
 */
function localToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string,
): string {
  // Start with a rough UTC estimate
  const rough = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const offset = getTimezoneOffsetMinutes(timezone, rough)

  // Subtract offset to get the actual UTC time
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - offset * 60000
  const corrected = new Date(utcMs)
  const offset2 = getTimezoneOffsetMinutes(timezone, corrected)

  if (offset2 !== offset) {
    // DST transition detected — recalculate with the corrected offset
    const utcMs2 = Date.UTC(year, month - 1, day, hour, minute) - offset2 * 60000
    const corrected2 = new Date(utcMs2)
    const offset3 = getTimezoneOffsetMinutes(timezone, corrected2)

    if (offset3 !== offset2) {
      // Nonexistent time (spring forward): the requested local time doesn't exist.
      // Use the later offset (after the clock jumps forward) to land on the
      // first valid instant after the gap.
      const laterOffset = Math.min(offset, offset2)
      const utcFinal = Date.UTC(year, month - 1, day, hour, minute) - laterOffset * 60000
      return new Date(utcFinal).toISOString()
    }

    return corrected2.toISOString()
  }

  return corrected.toISOString()
}

export function calculateRevealSchedule(input: RevealScheduleInput): RevealScheduleEntry[] {
  const {
    eventDate,
    startTime,
    timezone,
    appetizerDuration,
    mainDuration,
    dessertDuration,
    travelTimeMinutes,
    hasAfterparty,
  } = input

  const [year, month, day] = eventDate.split('-').map(Number)
  const [startHour, startMinute] = startTime.split(':').map(Number)

  const reveals: RevealScheduleEntry[] = []

  // Pre-event reveals at D-7, D-5, D-3, D-1 at noon local time
  const preEventDays = [7, 5, 3, 1]
  const preEventTypes: RevealType[] = [
    'course_assignment',
    'initials',
    'names_course_1',
    'address_course_1',
  ]

  for (let i = 0; i < preEventDays.length; i++) {
    const daysBack = preEventDays[i]
    const revealDate = new Date(Date.UTC(year, month - 1, day - daysBack))
    reveals.push({
      revealType: preEventTypes[i],
      scheduledAt: localToUtc(
        revealDate.getUTCFullYear(),
        revealDate.getUTCMonth() + 1,
        revealDate.getUTCDate(),
        12,
        0,
        timezone,
      ),
    })
  }

  // Event-day reveals: 15 min before end of each course
  // Event start in UTC
  const eventStartUtc = localToUtc(year, month, day, startHour, startMinute, timezone)
  const eventStartMs = new Date(eventStartUtc).getTime()

  // course_2_full: appetizer end - 15 min
  const appetizerEnd = eventStartMs + appetizerDuration * 60000
  reveals.push({
    revealType: 'course_2_full',
    scheduledAt: new Date(appetizerEnd - 15 * 60000).toISOString(),
  })

  // course_3_full: appetizer + travel + main end - 15 min
  const mainEnd = appetizerEnd + travelTimeMinutes * 60000 + mainDuration * 60000
  reveals.push({
    revealType: 'course_3_full',
    scheduledAt: new Date(mainEnd - 15 * 60000).toISOString(),
  })

  // afterparty: appetizer + travel + main + travel + dessert end - 15 min
  if (hasAfterparty) {
    const dessertEnd = mainEnd + travelTimeMinutes * 60000 + dessertDuration * 60000
    reveals.push({
      revealType: 'afterparty',
      scheduledAt: new Date(dessertEnd - 15 * 60000).toISOString(),
    })
  }

  return reveals
}
