-- 0034 — Place aliases for the UK & Europe sprint (Sprint A, 3 Nov 2026).
--
-- The sprint's new teachers publish a few towns that aren't in places under
-- that name: two other spellings (Cologne is "Köln" in GeoNames, St. Gallen
-- is "Sankt Gallen") and four villages under 5,000 people, each pointed at
-- the nearest town of 5,000+ in the same country (as in 0033). The listing
-- keeps its own town; only place_id uses the alias.
--
-- Run order (dev first, then live): this whole file, after 0033. Safe to run
-- again. Check row at the end.

INSERT INTO public.place_aliases (name, country_code, region, place_id, note) VALUES
('cologne', 'DE', '', 2886242, 'another spelling of Köln'),
('st. gallen', 'CH', '', 2658822, 'another spelling of Sankt Gallen'),
('st gallen', 'CH', '', 2658822, 'another spelling of Sankt Gallen'),
('thénac', 'FR', '', 3033391, 'village (Plum Village); nearest town of 5,000+ is Bergerac (19 km)'),
('thenac', 'FR', '', 3033391, 'village (Plum Village); nearest town of 5,000+ is Bergerac (19 km)'),
('findhorn', 'GB', '', 2649192, 'village; nearest town of 5,000+ is Forres (6 km)'),
('cubjac', 'FR', '', 2971890, 'village; nearest town of 5,000+ is Trélissac (12 km)'),
('minsterley', 'GB', '', 2656129, 'village; nearest town of 5,000+ is Bayston Hill (11 km)')
ON CONFLICT (name, country_code, region) DO UPDATE
  SET place_id = EXCLUDED.place_id, note = EXCLUDED.note;

-- Backfill only the listings these names affect.
UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL AND place_id IS NULL;

-- Check: aliases loaded (45 from 0033 + 8); listings with a town; of those, with a place.
SELECT
  (SELECT count(*) FROM public.place_aliases) AS aliases,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL) AS with_town,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL AND place_id IS NULL) AS without_place;
