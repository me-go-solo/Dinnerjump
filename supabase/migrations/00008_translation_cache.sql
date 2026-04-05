CREATE TABLE translation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_locale TEXT NOT NULL DEFAULT 'en',
  target_locale TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_locale, target_locale, source_key)
);

CREATE INDEX idx_translations_lookup ON translation_cache(target_locale, source_key);

ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read translations" ON translation_cache FOR SELECT USING (true);
