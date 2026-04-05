import type { Database } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Duo = Database['public']['Tables']['duos']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']

export type EventType = Database['public']['Enums']['event_type']
export type EventStatus = Database['public']['Enums']['event_status']
export type DuoStatus = Database['public']['Enums']['duo_status']
export type InvitationPolicy = Database['public']['Enums']['invitation_policy']
export type InvitationStatus = Database['public']['Enums']['invitation_status']

export type EventWithCounts = Event & {
  confirmed_duos: number
  total_duos: number
  duos_needed_for_next_table: number
}

export type Match = Database['public']['Tables']['matches']['Row']
export type MatchAssignment = Database['public']['Tables']['match_assignments']['Row']
export type MatchTable = Database['public']['Tables']['match_tables']['Row']
export type MatchTableGuest = Database['public']['Tables']['match_table_guests']['Row']
export type RouteCache = Database['public']['Tables']['route_cache']['Row']
export type CourseType = Database['public']['Enums']['course_type']

export type DuoForMatching = {
  id: string
  lat: number
  lng: number
  displayName: string
}

export type TableAssignment = {
  course: CourseType
  tableNumber: number
  hostDuoId: string
  guestDuoIds: [string, string]
}

export type MatchResult = {
  assignments: Map<string, CourseType>
  tables: TableAssignment[]
}
