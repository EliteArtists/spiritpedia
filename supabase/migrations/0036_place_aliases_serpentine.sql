-- 0036 — Place alias for Sprint B (US, Canada, Australia; 3 Nov 2026).
--
-- Two of the sprint's new teachers (Bodhinyana Monastery) publish Serpentine,
-- Western Australia, a village of under 5,000 people, so it isn't in places. It points at the nearest town of
-- 5,000+ in the same country (as in 0033). The listing keeps its own town;
-- only place_id uses the alias.
--
-- Run order (dev first, then live): this whole file, after 0035. Safe to run
-- again. Check row at the end.

INSERT INTO public.place_aliases (name, country_code, region, place_id, note) VALUES
('serpentine', 'AU', '', 8349017, 'village (Bodhinyana Monastery); nearest town of 5,000+ is Baldivis (15 km)')
ON CONFLICT (name, country_code, region) DO UPDATE
  SET place_id = EXCLUDED.place_id, note = EXCLUDED.note;

-- Backfill only the listings this name affects.
UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL AND place_id IS NULL;

-- Check: aliases loaded (54 from 0033–0035 + 1); listings with a town; of those, still without a place.
SELECT
  (SELECT count(*) FROM public.place_aliases) AS aliases,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL) AS with_town,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL AND place_id IS NULL) AS without_place;
