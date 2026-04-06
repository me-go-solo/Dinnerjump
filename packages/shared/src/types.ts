import type { RevealType } from './constants'
export type { RevealType }

export type CourseType = 'appetizer' | 'main' | 'dessert'

export type Reveal = {
  id: string
  event_id: string
  reveal_type: RevealType
  scheduled_at: string
  revealed_at: string | null
  created_at: string
}

export type PushToken = {
  id: string
  profile_id: string
  token: string
  platform: 'ios' | 'android'
  created_at: string
}

export type RevealScheduleInput = {
  eventDate: string
  startTime: string
  timezone: string
  appetizerDuration: number
  mainDuration: number
  dessertDuration: number
  travelTimeMinutes: number
  hasAfterparty: boolean
}
