-- 0035 — Place alias for Sprint A2 (city first, 3 Nov 2026).
--
-- One of the sprint's new teachers publishes Bakewell (Derbyshire), a town of
-- under 5,000 people, so it isn't in places. It points at the nearest town of
-- 5,000+ in the same country (as in 0033). The listing keeps its own town;
-- only place_id uses the alias.
--
-- Run order (dev first, then live): this whole file, after 0034. Safe to run
-- again. Check row at the end.

INSERT INTO public.place_aliases (name, country_code, region, place_id, note) VALUES
('bakewell', 'GB', '', 2642910, 'town under 5,000; nearest town of 5,000+ is Matlock (12 km)')
ON CONFLICT (name, country_code, region) DO UPDATE
  SET place_id = EXCLUDED.place_id, note = EXCLUDED.note;

-- Backfill only the listings this name affects.
UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL AND place_id IS NULL;

-- Check: aliases loaded (53 from 0033 and 0034 + 1); listings with a town; of those, still without a place.
SELECT
  (SELECT count(*) FROM public.place_aliases) AS aliases,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL) AS with_town,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL AND place_id IS NULL) AS without_place;
