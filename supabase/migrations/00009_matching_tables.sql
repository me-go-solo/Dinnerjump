-- New enum for course types
CREATE TYPE course_type AS ENUM ('appetizer', 'main', 'dessert');

-- Matching versions per event
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,
  total_travel_time_bike_min DOUBLE PRECISION,
  total_travel_time_car_min DOUBLE PRECISION,
  avg_travel_time_bike_min DOUBLE PRECISION,
  avg_travel_time_car_min DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, version)
);

CREATE INDEX idx_matches_event ON matches(event_id);
CREATE INDEX idx_matches_active ON matches(event_id, is_active) WHERE is_active = true;

-- Per-duo course assignment
CREATE TABLE match_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  duo_id UUID NOT NULL REFERENCES duos(id) ON DELETE CASCADE,
  hosted_course course_type NOT NULL,
  duo_display_name TEXT NOT NULL,
  UNIQUE(match_id, duo_id)
);

CREATE INDEX idx_match_assignments_match ON match_assignments(match_id);

-- Tables per course per match
CREATE TABLE match_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  course course_type NOT NULL,
  table_number INT NOT NULL,
  host_duo_id UUID NOT NULL REFERENCES duos(id) ON DELETE CASCADE,
  UNIQUE(match_id, course, table_number)
);

CREATE INDEX idx_match_tables_match ON match_tables(match_id);

-- Guests at each table
CREATE TABLE match_table_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_table_id UUID NOT NULL REFERENCES match_tables(id) ON DELETE CASCADE,
  duo_id UUID NOT NULL REFERENCES duos(id) ON DELETE CASCADE,
  UNIQUE(match_table_id, duo_id)
);

CREATE INDEX idx_match_table_guests_table ON match_table_guests(match_table_id);

-- Route cache for Google Maps
CREATE TABLE route_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  mode TEXT NOT NULL,
  duration_minutes DOUBLE PRECISION NOT NULL,
  distance_km DOUBLE PRECISION NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_route_cache_lookup ON route_cache(origin_lat, origin_lng, dest_lat, dest_lng, mode);

-- Function to ensure only 1 active match per event
CREATE OR REPLACE FUNCTION set_active_match(p_match_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE matches SET is_active = false
    WHERE event_id = (SELECT event_id FROM matches WHERE id = p_match_id)
    AND is_active = true;
  UPDATE matches SET is_active = true WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
