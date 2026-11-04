-- 0037 — Place aliases for hubs sprint 2 (Hollyhock, Findhorn, The Shift Network; 4 Nov 2026).
--
-- Three new listings publish a place of under 5,000 people, so it isn't in
-- places. Each points at the nearest town of 5,000+ in the same country and
-- state (as in 0033). The listing keeps its own town; only place_id uses the
-- alias.
--
-- Run order (dev first, then live): this whole file, after 0036. Safe to run
-- again. Check row at the end.

INSERT INTO public.place_aliases (name, country_code, region, place_id, note) VALUES
('mansons landing', 'CA', '', 5914132, 'settlement on Cortes Island (Hollyhock); nearest town of 5,000+ is Campbell River (20 km)'),
('nellysford', 'US', 'virginia', 4792522, 'village; nearest town of 5,000+ is Waynesboro (20 km)'),
('new hope', 'US', 'pennsylvania', 5187247, 'borough under 5,000; nearest town of 5,000+ in Pennsylvania is Doylestown (16 km)')
ON CONFLICT (name, country_code, region) DO UPDATE
  SET place_id = EXCLUDED.place_id, note = EXCLUDED.note;

-- Backfill only the listings these names affect.
UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL AND place_id IS NULL;

-- Check: aliases loaded (55 from 0033–0036 + 3); listings with a town; of those, still without a place.
SELECT
  (SELECT count(*) FROM public.place_aliases) AS aliases,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL) AS with_town,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL AND place_id IS NULL) AS without_place;
