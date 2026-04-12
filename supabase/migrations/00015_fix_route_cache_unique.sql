-- Add unique constraint to prevent duplicate route cache entries
-- and add index for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_route_cache_unique
  ON route_cache(origin_lat, origin_lng, dest_lat, dest_lng, mode);
