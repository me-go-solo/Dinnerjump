ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_table_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_cache ENABLE ROW LEVEL SECURITY;

-- MATCHES: organizers can read/write their event matches
CREATE POLICY "Organizers can read event matches" ON matches FOR SELECT
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = matches.event_id AND events.organizer_id = auth.uid()));
CREATE POLICY "Organizers can insert event matches" ON matches FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = matches.event_id AND events.organizer_id = auth.uid()));
CREATE POLICY "Organizers can update event matches" ON matches FOR UPDATE
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = matches.event_id AND events.organizer_id = auth.uid()));

-- MATCH_ASSIGNMENTS: organizers can read/write
CREATE POLICY "Organizers can read match assignments" ON match_assignments FOR SELECT
  USING (EXISTS (SELECT 1 FROM matches JOIN events ON events.id = matches.event_id WHERE matches.id = match_assignments.match_id AND events.organizer_id = auth.uid()));
CREATE POLICY "Organizers can insert match assignments" ON match_assignments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM matches JOIN events ON events.id = matches.event_id WHERE matches.id = match_assignments.match_id AND events.organizer_id = auth.uid()));

-- MATCH_TABLES: organizers can read/write
CREATE POLICY "Organizers can read match tables" ON match_tables FOR SELECT
  USING (EXISTS (SELECT 1 FROM matches JOIN events ON events.id = matches.event_id WHERE matches.id = match_tables.match_id AND events.organizer_id = auth.uid()));
CREATE POLICY "Organizers can insert match tables" ON match_tables FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM matches JOIN events ON events.id = matches.event_id WHERE matches.id = match_tables.match_id AND events.organizer_id = auth.uid()));

-- MATCH_TABLE_GUESTS: organizers can read/write
CREATE POLICY "Organizers can read match table guests" ON match_table_guests FOR SELECT
  USING (EXISTS (SELECT 1 FROM match_tables JOIN matches ON matches.id = match_tables.match_id JOIN events ON events.id = matches.event_id WHERE match_tables.id = match_table_guests.match_table_id AND events.organizer_id = auth.uid()));
CREATE POLICY "Organizers can insert match table guests" ON match_table_guests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM match_tables JOIN matches ON matches.id = match_tables.match_id JOIN events ON events.id = matches.event_id WHERE match_tables.id = match_table_guests.match_table_id AND events.organizer_id = auth.uid()));

-- ROUTE_CACHE: service role only (no user access needed)
-- No RLS policies = only admin/service role can read/write
