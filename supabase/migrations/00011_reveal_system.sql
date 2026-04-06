-- Add course durations and timezone to events
ALTER TABLE events ADD COLUMN appetizer_duration INTEGER NOT NULL DEFAULT 90;
ALTER TABLE events ADD COLUMN main_duration INTEGER NOT NULL DEFAULT 120;
ALTER TABLE events ADD COLUMN dessert_duration INTEGER NOT NULL DEFAULT 60;
ALTER TABLE events ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Europe/Amsterdam';

-- Reveal types enum
CREATE TYPE reveal_type AS ENUM (
  'course_assignment',
  'initials',
  'names_course_1',
  'address_course_1',
  'course_2_full',
  'course_3_full',
  'afterparty'
);

-- Reveals table
CREATE TABLE reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reveal_type reveal_type NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  revealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, reveal_type)
);

CREATE INDEX idx_reveals_event ON reveals(event_id);
CREATE INDEX idx_reveals_pending ON reveals(scheduled_at) WHERE revealed_at IS NULL;

-- Push tokens table
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_tokens_profile ON push_tokens(profile_id);
