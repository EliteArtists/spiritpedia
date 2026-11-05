-- 0040 — Place aliases for pipelines sprint 2 (The Shift Network and Insight
-- Timer lists; 5 Nov 2026).
--
-- Sixteen new listings publish a place that isn't in places (a village, an
-- island, a census-designated place or a region). Each points at the nearest
-- town of 5,000+ in the same country (and state, for the US and Australia), as
-- in 0033. The listing keeps its own town; only place_id uses the alias.
--
-- Run order (dev first, then live): this whole file, after 0039. Safe to run
-- again. Check row at the end.

INSERT INTO public.place_aliases (name, country_code, region, place_id, note) VALUES
('slippery rock', 'US', 'pennsylvania', 5192184, 'borough under 5,000 (students not counted); nearest town of 5,000+ is Grove City (11 km)'),
('kauai', 'US', 'hawaii', 5850248, 'island; its county seat is Lihue'),
('maui', 'US', 'hawaii', 5847411, 'island; its main town is Kahului'),
('redding ridge', 'US', 'connecticut', 5282297, 'village in Redding; nearest town of 5,000+ is Bethel (8 km)'),
('mount shasta', 'US', 'california', 5574093, 'city under 5,000; nearest town of 5,000+ is Yreka (54 km)'),
('bay area', 'US', 'california', 5391959, 'a region, not a town; San Francisco'),
('la crescenta', 'US', 'california', 7261553, 'part of La Crescenta-Montrose (1 km)'),
('hatfield', 'US', 'massachusetts', 4945819, 'town under 5,000; nearest town of 5,000+ is Northampton (6 km)'),
('salt springs', 'US', 'florida', 4167482, 'village in Ocala National Forest; nearest town of 5,000+ is Palatka (34 km)'),
('saylorsburg', 'US', 'pennsylvania', 5178996, 'village; nearest town of 5,000+ is Bangor (10 km)'),
('malmsbury', 'AU', 'victoria', 2160885, 'village; nearest town of 5,000+ is Kyneton (9 km)'),
('ancient epidavros', 'GR', '', 256637, 'village (Palaia Epidavros); nearest mainland town of 5,000+ is Náfplio (32 km; Aegina, 27 km, is an island)'),
('culross', 'GB', '', 2655215, 'Fife village; nearest town of 5,000+ is Bo''ness, across the Forth (4 km)'),
('oy-mittelberg', 'DE', '', 2934509, 'municipality; nearest town of 5,000+ is Durach (8 km)'),
('tzofar', 'IL', '', 294166, 'Arava moshav; nearest town of 5,000+ is Mitzpe Ramon (37 km)'),
('beatenberg', 'CH', '', 2658240, 'village above Lake Thun; nearest town of 5,000+ is Unterseen, beside Interlaken (5 km)')
ON CONFLICT (name, country_code, region) DO UPDATE
  SET place_id = EXCLUDED.place_id, note = EXCLUDED.note;

-- Backfill only the listings these names affect.
UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL AND place_id IS NULL;

-- Check: aliases loaded (69 from 0033–0038 + 16); listings with a town; of those, still without a place.
SELECT
  (SELECT count(*) FROM public.place_aliases) AS aliases,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL) AS with_town,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL AND place_id IS NULL) AS without_place;
