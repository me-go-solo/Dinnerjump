-- Reveals: participants can read their event's reveals
ALTER TABLE reveals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read event reveals"
  ON reveals FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM duos
      WHERE duos.event_id = reveals.event_id
        AND (duos.person1_id = auth.uid() OR duos.person2_id = auth.uid())
        AND duos.status != 'cancelled'
    )
    OR
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = reveals.event_id
        AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can manage reveals"
  ON reveals FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = reveals.event_id
        AND events.organizer_id = auth.uid()
    )
  );

-- Push tokens: users manage own tokens only
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens"
  ON push_tokens FOR ALL USING (profile_id = auth.uid());
