-- 0038 — Place aliases for pipelines sprint 1 (The Shift Network and Insight
-- Timer lists; 4 Nov 2026).
--
-- Eleven new listings publish a place that isn't in places (a village,
-- suburb or municipality). Each points at the nearest town of 5,000+ in the
-- same country (and state, for the US, Australia and India), as in 0033. The
-- listing keeps its own town; only place_id uses the alias.
--
-- Run order (dev first, then live): this whole file, after 0037. Safe to run
-- again. Check row at the end.

INSERT INTO public.place_aliases (name, country_code, region, place_id, note) VALUES
('nevada city', 'US', 'california', 5353775, 'city under 5,000; nearest town of 5,000+ is Grass Valley (6 km)'),
('kilauea', 'US', 'hawaii', 7262802, 'Kauai village; nearest town of 5,000+ is Wailua Homesteads (16 km)'),
('lewes', 'US', 'delaware', 4142643, 'city under 5,000; nearest town of 5,000+ is Georgetown (23 km)'),
('forestville', 'US', 'california', 5394165, 'Sonoma County village; nearest town of 5,000+ is Sebastopol (10 km)'),
('clonakilty', 'IE', '', 2966370, 'not in places; nearest town of 5,000+ is Bandon (16 km)'),
('tzur hadassa', 'IL', '', 293821, 'village; nearest town of 5,000+ is Qiryat Ye''arim (9 km)'),
('avalon beach', 'AU', 'new south wales', 2155412, 'Sydney northern-beaches suburb; nearest place of 5,000+ is Newport (3 km)'),
('castell''azzara', 'IT', '', 3183581, 'village (Tuscany); nearest town of 5,000+ is Abbadia San Salvatore (12 km)'),
('hewitt', 'US', 'new jersey', 5106279, 'community in West Milford township (5 km)'),
('laakdal', 'BE', '', 2784364, 'municipality; its place in places is Vorst (1 km)'),
('upper bhattu', 'IN', 'himachal pradesh', 1268849, 'village near Bir; nearest town of 5,000+ is Jogindarnagar (10 km)')
ON CONFLICT (name, country_code, region) DO UPDATE
  SET place_id = EXCLUDED.place_id, note = EXCLUDED.note;

-- Backfill only the listings these names affect.
UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL AND place_id IS NULL;

-- Check: aliases loaded (58 from 0033–0037 + 11); listings with a town; of those, still without a place.
SELECT
  (SELECT count(*) FROM public.place_aliases) AS aliases,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL) AS with_town,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL AND place_id IS NULL) AS without_place;
