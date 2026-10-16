-- 0019 — Your area: Practitioners Near You.
--
-- Areas are PLACES, never coordinates. A practitioner's city and a member's
-- area both resolve to a row of public.places (world towns of 5,000+ people,
-- from GeoNames, CC BY 4.0), and distance is measured between town centres.
-- No one's own position is ever stored.
--
--   places                 the towns; public reference data, read-only
--   healers.place_id       filled by trigger from city + country
--   user_preferences       each member's area (owner-only, like 0017)
--   nearest_place(lat,lng) the town for a rounded position; stores nothing
--
-- Run order (dev first, then live):
--   1. this file;
--   2. import places.csv into public.places (Table Editor → Import data);
--   3. the backfill at the end of this file, again, so existing healers get
--      their place (it is harmless before the import: nothing matches).

-- ── The towns ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.places (
  id           INTEGER PRIMARY KEY,        -- the GeoNames id
  name         TEXT NOT NULL,              -- "Zürich"
  ascii_name   TEXT NOT NULL,              -- "Zurich", for typing without accents
  region       TEXT,                       -- "England", "Colorado"
  country_code CHAR(2) NOT NULL,           -- "GB"
  country      TEXT NOT NULL,              -- "United Kingdom"
  lat          NUMERIC(7,4) NOT NULL,      -- the town centre
  lng          NUMERIC(7,4) NOT NULL,
  population   INTEGER NOT NULL DEFAULT 0
);

-- "Type my city": prefix search, biggest towns first.
CREATE INDEX IF NOT EXISTS places_ascii_prefix
  ON public.places (lower(ascii_name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS places_name_prefix
  ON public.places (lower(name) text_pattern_ops);
-- nearest_place's first cut.
CREATE INDEX IF NOT EXISTS places_lat ON public.places (lat);

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read places" ON public.places;
CREATE POLICY "Anyone can read places" ON public.places
  FOR SELECT TO anon, authenticated USING (true);

-- Read-only to everyone but the service role (the import runs as that).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.places FROM anon, authenticated;

COMMENT ON TABLE public.places IS
  'World towns of 5,000+ people (GeoNames cities5000, CC BY 4.0): the only coordinates Spiritpedia keeps, and they are town centres. Practitioners and members point at a place; nobody''s own position is stored.';

-- ── A practitioner's place ─────────────────────────────────────────────────

ALTER TABLE public.healers
  ADD COLUMN IF NOT EXISTS place_id INTEGER
  REFERENCES public.places(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS healers_place_id ON public.healers (place_id);

-- The place for a free-text city and country: the first part of the city
-- ("Carbondale, Colorado" → "Carbondale"), in that country, the biggest town
-- of that name — in the region the city names, when it names one. NULL if
-- nothing matches.
CREATE OR REPLACE FUNCTION public.resolve_place(p_city TEXT, p_country TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  WITH wanted AS (
    SELECT
      lower(trim(split_part(coalesce(p_city, ''), ',', 1))) AS town,
      lower(trim(split_part(coalesce(p_city, ''), ',', 2))) AS region,
      CASE lower(trim(coalesce(p_country, '')))
        WHEN '' THEN NULL
        WHEN 'uk' THEN 'GB'
        WHEN 'england' THEN 'GB'
        WHEN 'scotland' THEN 'GB'
        WHEN 'wales' THEN 'GB'
        WHEN 'northern ireland' THEN 'GB'
        WHEN 'great britain' THEN 'GB'
        WHEN 'usa' THEN 'US'
        WHEN 'us' THEN 'US'
        WHEN 'united states of america' THEN 'US'
        ELSE NULL
      END AS alias,
      lower(trim(coalesce(p_country, ''))) AS country
  )
  SELECT p.id
  FROM public.places p, wanted w
  WHERE w.town <> ''
    AND w.town IN (lower(p.name), lower(p.ascii_name))
    AND (
      w.country = ''
      OR p.country_code = w.alias
      OR w.country IN (lower(p.country), lower(p.country_code))
    )
    -- A named region that really is one ("Colorado") must match: a wrong
    -- town is worse than none. One that isn't ("D.C.") is ignored.
    AND (
      w.region = ''
      OR lower(coalesce(p.region, '')) = w.region
      OR NOT EXISTS (
        SELECT 1 FROM public.places q
        WHERE q.country_code = p.country_code AND lower(q.region) = w.region
      )
    )
  ORDER BY p.population DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.healers_set_place()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.city IS DISTINCT FROM OLD.city
     OR NEW.country IS DISTINCT FROM OLD.country THEN
    NEW.place_id := public.resolve_place(NEW.city, NEW.country);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS healers_set_place ON public.healers;
CREATE TRIGGER healers_set_place
  BEFORE INSERT OR UPDATE OF city, country ON public.healers
  FOR EACH ROW EXECUTE FUNCTION public.healers_set_place();

-- ── A member's area ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  area_place_id INTEGER REFERENCES public.places(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read their own preferences" ON public.user_preferences;
CREATE POLICY "Members read their own preferences" ON public.user_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members add their own preferences" ON public.user_preferences;
CREATE POLICY "Members add their own preferences" ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members change their own preferences" ON public.user_preferences;
CREATE POLICY "Members change their own preferences" ON public.user_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members remove their own preferences" ON public.user_preferences;
CREATE POLICY "Members remove their own preferences" ON public.user_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.user_preferences FROM anon;

CREATE OR REPLACE FUNCTION public.user_preferences_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_preferences_touch ON public.user_preferences;
CREATE TRIGGER user_preferences_touch
  BEFORE INSERT OR UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.user_preferences_touch();

COMMENT ON TABLE public.user_preferences IS
  'Each member''s area (a town, public.places) for Practitioners Near You. Owner-only; no admin access; cascades with the account.';

-- ── The town for a position ────────────────────────────────────────────────

-- "Use my location": the nearest town to a position the device has already
-- rounded (about 1 km). It is rounded again here, used once, and kept
-- nowhere. Nothing within about 110 km: no row.
CREATE OR REPLACE FUNCTION public.nearest_place(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS TABLE (id INTEGER, name TEXT, region TEXT, country TEXT)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  WITH here AS (
    SELECT round(p_lat::numeric, 2) AS lat, round(p_lng::numeric, 2) AS lng
    WHERE p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180
  )
  SELECT p.id, p.name, p.region, p.country
  FROM public.places p, here h
  WHERE p.lat BETWEEN h.lat - 1 AND h.lat + 1
    -- Within about 110 km (one degree of latitude), east-west included.
    AND (p.lat - h.lat) ^ 2
      + ((p.lng - h.lng) * cos(radians(h.lat::double precision))) ^ 2 <= 1
  ORDER BY (p.lat - h.lat) ^ 2
         + ((p.lng - h.lng) * cos(radians(h.lat::double precision))) ^ 2
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.nearest_place(DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nearest_place(DOUBLE PRECISION, DOUBLE PRECISION)
  TO anon, authenticated;

-- ── Backfill (run again after the places import) ───────────────────────────

UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL;
