-- 0033 — Every listing's base finds its town (Near You).
--
-- A practitioner's place comes from their city and country (0019). Two things
-- left published towns without a place:
--   1. places holds towns of 5,000+ people only, so a village (Woodacre, Big
--      Sur, Puerto Viejo) never matches;
--   2. spellings: "New York" (places: New York City), "St. George" (Saint
--      George), "Tunbridge Wells" (Royal Tunbridge Wells), "Netherlands"
--      (places: The Netherlands).
--
--   place_aliases     a name we store → the place it means: for a village, the
--                     nearest town of 5,000+; for a spelling, the town itself.
--                     Public reference data, read-only, like places.
--   resolve_place()   also: "St"/"St." = Saint, dots ignored, a leading "The"
--                     ignored in country names, any country name or code
--                     places knows; then the aliases.
--
-- The listing keeps the town it publishes (Woodacre); only place_id points
-- at the nearby town, for distances.
--
-- Run order (dev first, then live): this whole file. The backfill at the end
-- gives every listing its place again. Check row at the end.

-- ── The aliases ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.place_aliases (
  name         TEXT NOT NULL CHECK (name = lower(name)),       -- "woodacre"
  country_code CHAR(2) NOT NULL,                               -- "US"
  region       TEXT NOT NULL DEFAULT '' CHECK (region = lower(region)), -- "california", or '' for any
  place_id     INTEGER NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  note         TEXT,                                           -- "village; nearest town Fairfax"
  PRIMARY KEY (name, country_code, region)
);

ALTER TABLE public.place_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read place aliases" ON public.place_aliases;
CREATE POLICY "Anyone can read place aliases" ON public.place_aliases
  FOR SELECT TO anon, authenticated USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.place_aliases FROM anon, authenticated;

COMMENT ON TABLE public.place_aliases IS
  'Names stored on listings that aren''t a town in places (villages under 5,000 people, other spellings) → the place they mean: the town itself, or the nearest town of 5,000+. Only for Near You distances; the listing keeps its own town name.';

-- ── The place for a city and country ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.resolve_place(p_city TEXT, p_country TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  WITH raw AS (
    SELECT
      lower(trim(split_part(coalesce(p_city, ''), ',', 1))) AS town,
      lower(trim(split_part(coalesce(p_city, ''), ',', 2))) AS region,
      regexp_replace(lower(trim(coalesce(p_country, ''))), '^the\s+', '') AS country
  ),
  wanted AS (
    SELECT
      r.region,
      r.country,
      -- "St. George" → also "saint george" and "st george".
      ARRAY[
        r.town,
        replace(r.town, '.', ''),
        regexp_replace(r.town, '^st\.?\s+', 'saint ')
      ] AS towns,
      CASE r.country
        WHEN '' THEN NULL
        WHEN 'uk' THEN 'GB'
        WHEN 'england' THEN 'GB'
        WHEN 'scotland' THEN 'GB'
        WHEN 'wales' THEN 'GB'
        WHEN 'northern ireland' THEN 'GB'
        WHEN 'great britain' THEN 'GB'
        WHEN 'usa' THEN 'US'
        WHEN 'united states of america' THEN 'US'
        WHEN 'holland' THEN 'NL'
        ELSE coalesce(
          (SELECT c.country_code FROM public.places c
           WHERE regexp_replace(lower(c.country), '^the\s+', '') = r.country
           LIMIT 1),
          (SELECT c.country_code FROM public.places c
           WHERE length(r.country) = 2 AND c.country_code = upper(r.country)
           LIMIT 1)
        )
      END AS code
    FROM raw r
    WHERE r.town <> ''
  )
  SELECT coalesce(
    (
      SELECT p.id
      FROM public.places p, wanted w
      WHERE (lower(p.name) = ANY (w.towns) OR lower(p.ascii_name) = ANY (w.towns))
        AND (w.country = '' OR p.country_code = w.code)
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
      LIMIT 1
    ),
    (
      SELECT a.place_id
      FROM public.place_aliases a, wanted w
      WHERE a.name = ANY (w.towns)
        AND a.country_code = w.code
        AND (a.region = '' OR a.region = w.region)
      ORDER BY a.region DESC
      LIMIT 1
    )
  );
$$;

-- ── The aliases we know of (3 Nov 2026 location audit) ─────────────────────
-- name, country, region ('' for any), place (GeoNames id), why.

INSERT INTO public.place_aliases (name, country_code, region, place_id, note) VALUES
('alonissos', 'GR', '', 259806, 'village; nearest town of 5,000+ is Kými (61 km)'),
('puerto viejo', 'CR', '', 3622247, 'village; nearest town of 5,000+ is Limón (48 km)'),
('grand manan', 'CA', 'new brunswick', 13592175, 'village; nearest town of 5,000+ is Eastern Charlotte (46 km)'),
('waikoloa', 'US', 'hawaii', 5854571, 'village; nearest town of 5,000+ is Waimea (16 km)'),
('woodstock', 'US', 'new york', 5123477, 'village; nearest town of 5,000+ is Kingston (16 km)'),
('joseph', 'US', 'oregon', 5735537, 'village; nearest town of 5,000+ is La Grande (67 km)'),
('whittier', 'US', 'north carolina', 4462701, 'village; nearest town of 5,000+ is Cullowhee (21 km)'),
('molkom', 'SE', '', 2713971, 'village; nearest town of 5,000+ is Forshaga (16 km)'),
('noosa', 'AU', 'queensland', 2155135, 'village; nearest town of 5,000+ is Noosa Heads (0 km)'),
('noosa', 'AU', '', 2155135, 'village; nearest town of 5,000+ is Noosa Heads (0 km)'),
('durham', 'US', 'maine', 4969622, 'village; nearest town of 5,000+ is Lisbon (7 km)'),
('somerset', 'US', 'california', 5343038, 'village; nearest town of 5,000+ is Diamond Springs (13 km)'),
('hebden bridge', 'GB', '', 2635744, 'village; nearest town of 5,000+ is Todmorden (6 km)'),
('rhinebeck', 'US', 'new york', 5123477, 'village; nearest town of 5,000+ is Kingston (7 km)'),
('rhinebeck', 'US', '', 5123477, 'village; nearest town of 5,000+ is Kingston (7 km)'),
('stockbridge', 'US', 'massachusetts', 4938157, 'village; nearest town of 5,000+ is Great Barrington (10 km)'),
('big sur', 'US', 'california', 5374361, 'village; nearest town of 5,000+ is Monterey (37 km)'),
('big sur', 'US', '', 5374361, 'village; nearest town of 5,000+ is Monterey (37 km)'),
('willsboro', 'US', 'new york', 5234372, 'village; nearest town of 5,000+ is Burlington (19 km)'),
('barre', 'US', 'massachusetts', 4952731, 'village; nearest town of 5,000+ is Templeton (15 km)'),
('hinesburg', 'US', 'vermont', 5243008, 'village; nearest town of 5,000+ is Williston (12 km)'),
('orcas island', 'US', 'washington', 5785657, 'village; nearest town of 5,000+ is Anacortes (28 km)'),
('woodacre', 'US', 'california', 5347322, 'village; nearest town of 5,000+ is Fairfax (5 km)'),
('woodacre', 'US', '', 5347322, 'village; nearest town of 5,000+ is Fairfax (5 km)'),
('mount tomah', 'AU', '', 2144127, 'village; nearest town of 5,000+ is Wentworth Falls (19 km)'),
('salt point', 'US', '', 5116819, 'village; nearest town of 5,000+ is Fairview (14 km)'),
('chinchero', 'PE', '', 3926438, 'village; nearest town of 5,000+ is Urubamba (12 km)'),
('saddle river', 'US', '', 5105957, 'village; nearest town of 5,000+ is Waldwick (3 km)'),
('sag harbor', 'US', '', 5139294, 'village; nearest town of 5,000+ is Springs (11 km)'),
('stonesfield', 'GB', '', 2633729, 'village; nearest town of 5,000+ is Witney (8 km)'),
('sandia park', 'US', '', 5457198, 'village; nearest town of 5,000+ is Bernalillo (22 km)'),
('castleton-on-hudson', 'US', '', 5114831, 'village; nearest town of 5,000+ is Delmar (12 km)'),
('new preston', 'US', '', 4839435, 'village; nearest town of 5,000+ is New Milford (12 km)'),
('marin county', 'US', '', 5392567, 'village; nearest town of 5,000+ is San Rafael (0 km)'),
('west stockbridge', 'US', '', 4938157, 'village; nearest town of 5,000+ is Great Barrington (15 km)'),
('bowler', 'US', '', 5272873, 'village; nearest town of 5,000+ is Shawano (31 km)'),
('green lane', 'US', '', 5192662, 'village; nearest town of 5,000+ is Harleysville (10 km)'),
('gold beach', 'US', '', 5715905, 'village; nearest town of 5,000+ is Brookings (41 km)'),
('gabriola island', 'CA', '', 6085772, 'village; nearest town of 5,000+ is Nanaimo (10 km)'),
('magnac-laval', 'FR', '', 3006387, 'village; nearest town of 5,000+ is La Souterraine (25 km)'),
('zalaszentlászló', 'HU', '', 3042603, 'village; nearest town of 5,000+ is Zalaszentgrót (8 km)'),
('tilba', 'AU', '', 2176639, 'village; nearest town of 5,000+ is Batemans Bay (69 km)'),
('new york', 'US', '', 5128581, 'another spelling of New York City'),
('tunbridge wells', 'GB', '', 2639022, 'another spelling of Royal Tunbridge Wells'),
('koh phangan', 'TH', '', 6698658, 'another spelling of Ko Pha Ngan')
ON CONFLICT (name, country_code, region) DO UPDATE
  SET place_id = EXCLUDED.place_id, note = EXCLUDED.note;

-- ── Backfill: every listing's place again ──────────────────────────────────

UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL OR place_id IS NOT NULL;

-- Check: aliases loaded; listings with a town; of those, with a place.
SELECT
  (SELECT count(*) FROM public.place_aliases) AS aliases,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL) AS with_town,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL AND place_id IS NOT NULL) AS with_place;
