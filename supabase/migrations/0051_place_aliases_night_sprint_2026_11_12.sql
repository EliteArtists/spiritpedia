-- 0051 — Place aliases for the night sprint of 12–13 Nov 2026.
--
-- These new listings publish a place that isn't in places (a village, a
-- hamlet or an island under 5,000, or a town places lacks). Each points at the
-- nearest town of 5,000+ in places, as in 0033, 0043 and 0049 (the state line
-- doesn't matter to a user; owner, 12 Nov 2026). Distances are approximate.
-- The listing keeps its own town; only place_id uses the alias.
--
-- Run order (dev first, then live): this whole file, after 0050. Safe to run
-- again. Check row at the end.

INSERT INTO public.place_aliases (name, country_code, region, place_id, note) VALUES
('big island', 'US', 'hawaii', 5855927, 'Hawaii Island (Destiny Marie Love); its largest town is Hilo'),
('lesvos', 'GR', '', 256866, 'island (Giten Tonkov); its main town is Mytilene'),
('carmel', 'US', 'california', 5374361, 'Carmel-by-the-Sea (Elise Browning Miller); nearest town of 5,000+ is Monterey (6 km)'),
('newington', 'US', 'new hampshire', 5091383, 'Rockingham County town (Hilary Crowley); nearest town of 5,000+ is Portsmouth (6 km)'),
('eudlo', 'AU', 'queensland', 2153887, 'Sunshine Coast hinterland village (Chenrezig Institute); nearest town of 5,000+ is Palmwoods (5 km)'),
('gosse', 'AU', 'south australia', 8539243, 'Kangaroo Island locality (De-Tong Ling Retreat Centre); the island has no town of 5,000+, nearest is Aldinga Beach on the mainland (150 km)'),
('tonasket', 'US', 'washington', 5815342, 'Okanogan County town (Pamtingpa Center); nearest town of 5,000+ is Wenatchee (156 km)'),
('greenhaugh', 'GB', '', 2647007, 'Northumberland hamlet (Land of Joy); nearest town of 5,000+ is Hexham (27 km)'),
('loenen', 'NL', '', 2756351, 'Gelderland village (Maitreya Instituut); nearest town of 5,000+ is Eerbeek (3 km)'),
('kealakekua', 'US', 'hawaii', 5847504, 'Kona coast village (Daifukuji Soto Mission); Kailua-Kona (16 km)'),
('alexander', 'US', 'north carolina', 4453066, 'Buncombe County community (Great Tree Zen Temple); Asheville (13 km)'),
('clatskanie', 'US', 'oregon', 5801617, 'Columbia County town (Great Vow Zen Monastery); nearest town of 5,000+ is Longview, Washington (21 km)'),
('arroyo seco', 'US', 'new mexico', 5493811, 'Taos County village (Hokoji); nearest town of 5,000+ is Taos (11 km)'),
('dorchester', 'US', 'iowa', 4853608, 'Allamakee County village (Ryumonji Zen Monastery); nearest town of 5,000+ is Decorah (about 25 km)'),
('graton', 'US', 'california', 5394165, 'Sonoma County village (Stone Creek Zen Center); nearest town of 5,000+ is Sebastopol (5 km)'),
('surry', 'US', 'maine', 4963692, 'Hancock County town (Zen DownEast); nearest town of 5,000+ is Ellsworth (8 km)'),
('mountain center', 'US', 'california', 5405346, 'San Jacinto Mountains community (Zen Mountain Center / Yokoji); nearest town of 5,000+ is Valle Vista (16 km)')
ON CONFLICT (name, country_code, region) DO UPDATE
  SET place_id = EXCLUDED.place_id, note = EXCLUDED.note;

-- Backfill only the listings these names affect.
UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL AND place_id IS NULL;

-- Check: listings with a town but still without a place (Marybeth Hyland's
-- Salmon, Idaho, from an earlier sprint, stays until the owner rules).
SELECT count(*) AS still_without_place
FROM public.healers
WHERE city IS NOT NULL AND place_id IS NULL;
