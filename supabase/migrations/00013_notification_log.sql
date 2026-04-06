-- supabase/migrations/00013_notification_log.sql
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'push')),
  subject TEXT,
  body TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  sent_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_log_event ON notification_log(event_id);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can read their event notifications"
  ON notification_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = notification_log.event_id
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can insert notifications for their events"
  ON notification_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = notification_log.event_id
      AND events.organizer_id = auth.uid()
    )
  );
