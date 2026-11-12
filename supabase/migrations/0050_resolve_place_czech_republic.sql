-- 0050 — resolve_place reads "Czech Republic".
--
-- After 0049, listings with a town but no place were 2, not 1: Vrážné Zen
-- Center has the country "Czech Republic", but places calls it "Czechia", so
-- the country code came out empty and its alias (0049) never matched. This
-- adds "czech republic" → CZ beside the other spellings ("uk", "usa",
-- "holland"); the function is otherwise the same as in 0033. Every other
-- country our listings use already matches places.
--
-- Run order (dev first, then live): this whole file, after 0049. Safe to run
-- again. Check row at the end.

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
        WHEN 'czech republic' THEN 'CZ'
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

-- Backfill: only listings with a town and no place.
UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL AND place_id IS NULL;

-- Check: aliases unchanged (141); listings with a town; of those, still
-- without a place (expected 1 on both: Salmon, Idaho).
SELECT
  (SELECT count(*) FROM public.place_aliases) AS aliases,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL) AS with_town,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL AND place_id IS NULL) AS without_place;
