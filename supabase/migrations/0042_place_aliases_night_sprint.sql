-- 0042 — Place aliases for the night sprint of 9–10 Nov 2026 (practice
-- centres, Quantum-Touch and the pipelines sprint 3 continuation).
--
-- Ten new listings publish a place that isn't in places (a village or a
-- census-designated place under 5,000). Each points at the nearest town of
-- 5,000+ in the same country and state, as in 0033. Haiku, Hawaii is spelled
-- Haʻikū in places, so it gets a plain-spelling alias (for Bodhi Be, held for
-- now). The listing keeps its own town; only place_id uses the alias.
--
-- Run order (dev first, then live): this whole file, after 0041. Safe to run
-- again. Check row at the end.

INSERT INTO public.place_aliases (name, country_code, region, place_id, note) VALUES
('lakemont', 'US', 'georgia', 4226722, 'Rabun County community; nearest town of 5,000+ is Toccoa (23 km)'),
('shipman', 'US', 'virginia', 4788070, 'Nelson County community; nearest town of 5,000+ is Stuarts Draft (38 km)'),
('faber', 'US', 'virginia', 4754901, 'Nelson County community; nearest town of 5,000+ is Crozet (25 km)'),
('pagosa springs', 'US', 'colorado', 5420241, 'town under 5,000; nearest town of 5,000+ is Durango (77 km)'),
('garrison', 'US', 'new york', 5143966, 'Putnam County hamlet; nearest town of 5,000+ is West Point (1 km, across the Hudson)'),
('gualala', 'US', 'california', 5338104, 'Mendocino coast community; nearest town of 5,000+ is Cloverdale (45 km)'),
('sonora', 'US', 'california', 5378500, 'Tuolumne County seat under 5,000; nearest town of 5,000+ is Oakdale (47 km)'),
('prather', 'US', 'california', 5338122, 'Fresno County community; nearest town of 5,000+ is Clovis (29 km)'),
('haiku', 'US', 'hawaii', 5855252, 'plain spelling of Haʻikū, Maui'),
('sutton', 'CA', 'quebec', 5931074, 'Eastern Townships town under 5,000; nearest town of 5,000+ is Cowansville (15 km)'),
('berkshires', 'US', 'massachusetts', 4947459, 'region (the Berkshires); its largest town is Pittsfield')
ON CONFLICT (name, country_code, region) DO UPDATE
  SET place_id = EXCLUDED.place_id, note = EXCLUDED.note;

-- Backfill only the listings these names affect.
UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL AND place_id IS NULL;

-- Check: aliases loaded (92 from 0033–0041 + 11); listings with a town; of those, still without a place.
SELECT
  (SELECT count(*) FROM public.place_aliases) AS aliases,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL) AS with_town,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL AND place_id IS NULL) AS without_place;
