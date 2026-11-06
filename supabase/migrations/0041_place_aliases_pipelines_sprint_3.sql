-- 0041 — Place aliases for pipelines sprint 3 (IMS, Sounds True and hub past
-- faculty lists; 6 Nov 2026).
--
-- Seven new listings publish a place that isn't in places (a village, an
-- island or a census-designated place). Each points at the nearest town of
-- 5,000+ in the same country (and state, for the US), as in 0033. The listing
-- keeps its own town; only place_id uses the alias.
--
-- Run order (dev first, then live): this whole file, after 0040. Safe to run
-- again. Check row at the end.

INSERT INTO public.place_aliases (name, country_code, region, place_id, note) VALUES
('yorkville', 'US', 'california', 5338104, 'Mendocino County hamlet; nearest town of 5,000+ is Cloverdale (21 km)'),
('whidbey island', 'US', 'washington', 5805441, 'island; its largest town is Oak Harbor'),
('vashon island', 'US', 'washington', 5814647, 'island; its census-designated place is Vashon (3 km)'),
('jemez springs', 'US', 'new mexico', 5476825, 'village under 5,000; nearest town of 5,000+ is Los Alamos (37 km)'),
('point reyes station', 'US', 'california', 5378044, 'Marin County village; nearest town of 5,000+ is Novato (21 km)'),
('stonington', 'US', 'maine', 4832458, 'Deer Isle town under 5,000; nearest town of 5,000+ is Rockland (36 km)'),
('marçay', 'FR', '', 3025132, 'village near Chinon; nearest town of 5,000+ is Chinon (8 km)')
ON CONFLICT (name, country_code, region) DO UPDATE
  SET place_id = EXCLUDED.place_id, note = EXCLUDED.note;

-- Backfill only the listings these names affect.
UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL AND place_id IS NULL;

-- Check: aliases loaded (85 from 0033–0040 + 7); listings with a town; of those, still without a place.
SELECT
  (SELECT count(*) FROM public.place_aliases) AS aliases,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL) AS with_town,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL AND place_id IS NULL) AS without_place;
