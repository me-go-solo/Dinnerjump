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
