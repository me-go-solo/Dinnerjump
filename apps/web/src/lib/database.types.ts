export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; email: string; phone: string | null; locale: string; created_at: string; updated_at: string }
        Insert: { id: string; display_name?: string | null; email: string; phone?: string | null; locale?: string }
        Update: { display_name?: string | null; email?: string; phone?: string | null; locale?: string }
        Relationships: []
      }
      events: {
        Row: { id: string; organizer_id: string; title: string; description: string | null; slug: string; event_date: string; start_time: string; travel_time_minutes: number; center_lat: number; center_lng: number; center_address: string; radius_km: number; type: 'open' | 'closed'; status: 'draft' | 'registration_open' | 'confirmed' | 'closed' | 'active' | 'completed' | 'cancelled'; invite_code: string; invitation_policy: 'organizer_only' | 'participants_allowed'; afterparty_address: string | null; afterparty_lat: number | null; afterparty_lng: number | null; welcome_card_enabled: boolean; appetizer_duration: number; main_duration: number; dessert_duration: number; timezone: string; registration_deadline: string; created_at: string; updated_at: string }
        Insert: { id?: string; organizer_id: string; title: string; description?: string | null; slug: string; event_date: string; start_time: string; travel_time_minutes: number; center_lat: number; center_lng: number; center_address: string; radius_km?: number; type?: 'open' | 'closed'; status?: 'draft' | 'registration_open' | 'confirmed' | 'closed' | 'active' | 'completed' | 'cancelled'; invite_code: string; invitation_policy?: 'organizer_only' | 'participants_allowed'; afterparty_address?: string | null; afterparty_lat?: number | null; afterparty_lng?: number | null; welcome_card_enabled?: boolean; appetizer_duration?: number; main_duration?: number; dessert_duration?: number; timezone?: string; registration_deadline: string }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
        Relationships: [{ foreignKeyName: 'events_organizer_id_fkey'; columns: ['organizer_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      duos: {
        Row: { id: string; event_id: string; person1_id: string; person2_id: string | null; address_line: string; city: string; postal_code: string; country: string; lat: number; lng: number; status: 'pending_payment' | 'registered' | 'waitlisted' | 'confirmed' | 'cancelled'; payment_intent_id: string | null; is_organizer_duo: boolean; created_at: string }
        Insert: { id?: string; event_id: string; person1_id: string; person2_id?: string | null; address_line: string; city: string; postal_code: string; country?: string; lat: number; lng: number; status?: 'pending_payment' | 'registered' | 'waitlisted' | 'confirmed' | 'cancelled'; payment_intent_id?: string | null; is_organizer_duo?: boolean }
        Update: Partial<Database['public']['Tables']['duos']['Insert']>
        Relationships: [{ foreignKeyName: 'duos_event_id_fkey'; columns: ['event_id']; isOneToOne: false; referencedRelation: 'events'; referencedColumns: ['id'] }]
      }
      invitations: {
        Row: { id: string; event_id: string; invited_by_duo_id: string; invitee_name: string; invitee_email: string; personal_message: string | null; ref_code: string; status: 'sent' | 'opened' | 'registered'; created_at: string }
        Insert: { id?: string; event_id: string; invited_by_duo_id: string; invitee_name: string; invitee_email: string; personal_message?: string | null; ref_code: string; status?: 'sent' | 'opened' | 'registered' }
        Update: Partial<Database['public']['Tables']['invitations']['Insert']>
        Relationships: [{ foreignKeyName: 'invitations_event_id_fkey'; columns: ['event_id']; isOneToOne: false; referencedRelation: 'events'; referencedColumns: ['id'] }]
      }
      translation_cache: {
        Row: { id: string; source_locale: string; target_locale: string; source_key: string; source_text: string; translated_text: string; created_at: string }
        Insert: { id?: string; source_locale?: string; target_locale: string; source_key: string; source_text: string; translated_text: string }
        Update: Partial<Database['public']['Tables']['translation_cache']['Insert']>
        Relationships: []
      }
      matches: {
        Row: { id: string; event_id: string; version: number; is_active: boolean; total_travel_time_bike_min: number | null; total_travel_time_car_min: number | null; avg_travel_time_bike_min: number | null; avg_travel_time_car_min: number | null; created_at: string }
        Insert: { id?: string; event_id: string; version?: number; is_active?: boolean; total_travel_time_bike_min?: number | null; total_travel_time_car_min?: number | null; avg_travel_time_bike_min?: number | null; avg_travel_time_car_min?: number | null }
        Update: Partial<Database['public']['Tables']['matches']['Insert']>
        Relationships: [{ foreignKeyName: 'matches_event_id_fkey'; columns: ['event_id']; isOneToOne: false; referencedRelation: 'events'; referencedColumns: ['id'] }]
      }
      match_assignments: {
        Row: { id: string; match_id: string; duo_id: string; hosted_course: 'appetizer' | 'main' | 'dessert'; duo_display_name: string }
        Insert: { id?: string; match_id: string; duo_id: string; hosted_course: 'appetizer' | 'main' | 'dessert'; duo_display_name: string }
        Update: Partial<Database['public']['Tables']['match_assignments']['Insert']>
        Relationships: [{ foreignKeyName: 'match_assignments_match_id_fkey'; columns: ['match_id']; isOneToOne: false; referencedRelation: 'matches'; referencedColumns: ['id'] }]
      }
      match_tables: {
        Row: { id: string; match_id: string; course: 'appetizer' | 'main' | 'dessert'; table_number: number; host_duo_id: string }
        Insert: { id?: string; match_id: string; course: 'appetizer' | 'main' | 'dessert'; table_number: number; host_duo_id: string }
        Update: Partial<Database['public']['Tables']['match_tables']['Insert']>
        Relationships: [{ foreignKeyName: 'match_tables_match_id_fkey'; columns: ['match_id']; isOneToOne: false; referencedRelation: 'matches'; referencedColumns: ['id'] }]
      }
      match_table_guests: {
        Row: { id: string; match_table_id: string; duo_id: string }
        Insert: { id?: string; match_table_id: string; duo_id: string }
        Update: Partial<Database['public']['Tables']['match_table_guests']['Insert']>
        Relationships: [{ foreignKeyName: 'match_table_guests_match_table_id_fkey'; columns: ['match_table_id']; isOneToOne: false; referencedRelation: 'match_tables'; referencedColumns: ['id'] }]
      }
      reveals: {
        Row: { id: string; event_id: string; reveal_type: string; scheduled_at: string; executed_at: string | null; created_at: string }
        Insert: { id?: string; event_id: string; reveal_type: string; scheduled_at: string; executed_at?: string | null }
        Update: Partial<Database['public']['Tables']['reveals']['Insert']>
        Relationships: [{ foreignKeyName: 'reveals_event_id_fkey'; columns: ['event_id']; isOneToOne: false; referencedRelation: 'events'; referencedColumns: ['id'] }]
      }
      push_tokens: {
        Row: { id: string; profile_id: string; token: string; created_at: string }
        Insert: { id?: string; profile_id: string; token: string }
        Update: Partial<Database['public']['Tables']['push_tokens']['Insert']>
        Relationships: [{ foreignKeyName: 'push_tokens_profile_id_fkey'; columns: ['profile_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      route_cache: {
        Row: { id: string; origin_lat: number; origin_lng: number; dest_lat: number; dest_lng: number; mode: string; duration_minutes: number; distance_km: number; fetched_at: string }
        Insert: { id?: string; origin_lat: number; origin_lng: number; dest_lat: number; dest_lng: number; mode: string; duration_minutes: number; distance_km: number }
        Update: Partial<Database['public']['Tables']['route_cache']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      process_duo_registration: {
        Args: { p_duo_id: string }
        Returns: { action: string; total_paid: number; duos_needed: number }
      }
      set_active_match: {
        Args: { p_match_id: string }
        Returns: undefined
      }
    }
    Enums: {
      event_type: 'open' | 'closed'
      event_status: 'draft' | 'registration_open' | 'confirmed' | 'closed' | 'active' | 'completed' | 'cancelled'
      duo_status: 'pending_payment' | 'registered' | 'waitlisted' | 'confirmed' | 'cancelled'
      invitation_policy: 'organizer_only' | 'participants_allowed'
      invitation_status: 'sent' | 'opened' | 'registered'
      course_type: 'appetizer' | 'main' | 'dessert'
    }
  }
}
