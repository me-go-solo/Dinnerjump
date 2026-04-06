export const COURSE_ORDER = ['appetizer', 'main', 'dessert'] as const

export const DEFAULT_DURATIONS = {
  appetizer: 90,
  main: 120,
  dessert: 60,
} as const

export const DEFAULT_TIMEZONE = 'Europe/Amsterdam'

export const REVEAL_ORDER = [
  'course_assignment',
  'initials',
  'names_course_1',
  'address_course_1',
  'course_2_full',
  'course_3_full',
  'afterparty',
] as const

export type RevealType = (typeof REVEAL_ORDER)[number]
