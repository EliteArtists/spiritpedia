-- 0043 — Place aliases for the big content sprint of 10–11 Nov 2026 (owner's
-- OK, 11 Nov 2026).
--
-- These new listings publish a place that isn't in places (a village, a
-- hamlet or a census-designated place under 5,000). Each points at the
-- nearest town of 5,000+ in the same country and state, as in 0033. McLeod
-- Ganj is spelled Mcleodganj in places, and Sussex County, Delaware (an older
-- listing that gives only the county) points at its county seat. Accented
-- names also get a plain spelling. Distances are approximate. The listing
-- keeps its own town; only place_id uses the alias.
--
-- Not covered: Salmon, Idaho (marybeth-hyland). The nearest town of 5,000+
-- in Idaho is Hailey, 187 km away, which would place her wrongly for Near You.
-- Scheveningen, Batesville and Waldbröl already resolve.
--
-- Run order (dev first, then live): this whole file, after 0042. Safe to run
-- again. Check row at the end.

INSERT INTO public.place_aliases (name, country_code, region, place_id, note) VALUES
('west newbury', 'US', 'massachusetts', 4943784, 'Essex County town under 5,000; nearest town of 5,000+ is Merrimac (3 km)'),
('buckland', 'US', 'massachusetts', 4938378, 'Franklin County town under 5,000; nearest town of 5,000+ is Greenfield (16 km)'),
('woodville', 'US', 'texas', 4700731, 'Tyler County seat under 5,000; nearest town of 5,000+ is Jasper (43 km)'),
('cedar crest', 'US', 'new mexico', 5481793, 'East Mountains community; nearest town of 5,000+ is North Valley, Albuquerque (24 km)'),
('redwood valley', 'US', 'california', 5404476, 'Mendocino County community; nearest town of 5,000+ is Ukiah (13 km)'),
('mcleod ganj', 'IN', 'himachal pradesh', 1264627, 'spelled Mcleodganj in places (upper Dharamsala)'),
('pine bush', 'US', 'new york', 5143066, 'Orange County hamlet; nearest town of 5,000+ is Walden (11 km)'),
('crescent springs', 'US', 'kentucky', 4312088, 'Kenton County city under 5,000; nearest town of 5,000+ is Villa Hills (2 km)'),
('crestone', 'US', 'colorado', 5411479, 'Saguache County town under 5,000; nearest town of 5,000+ is Alamosa (61 km)'),
('sussex county', 'US', '', 4142643, 'Sussex County, Delaware (the listing gives only the county; any Sussex County given without a state lands here); its seat is Georgetown'),
('verdelot', 'FR', '', 3009481, 'Seine-et-Marne village; nearest town of 5,000+ in Île-de-France is La Ferté-sous-Jouarre (19 km)'),
('weiterswiller', 'FR', '', 2975588, 'Alsace village (Ryumon Ji); nearest town of 5,000+ is Saverne (11 km)'),
('saint-léon-sur-vézère', 'FR', '', 2976007, 'Dordogne village (Dhagpo Kagyu Ling); nearest town of 5,000+ is Sarlat-la-Canéda (17 km)'),
('saint-leon-sur-vezere', 'FR', '', 2976007, 'Dordogne village (Dhagpo Kagyu Ling); nearest town of 5,000+ is Sarlat-la-Canéda (17 km)'),
('la coquille', 'FR', '', 2976546, 'Dordogne village (Kanshōji); nearest town of 5,000+ is Saint-Yrieix-la-Perche (18 km)'),
('pomaia', 'IT', '', 3168931, 'Tuscan village (Istituto Lama Tzong Khapa); nearest town of 5,000+ is Rosignano Marittimo (7 km)'),
('reith bei kitzbühel', 'AT', '', 2774399, 'Tyrol village; nearest town of 5,000+ is Kirchberg in Tirol (3 km)'),
('reith bei kitzbuhel', 'AT', '', 2774399, 'Tyrol village; nearest town of 5,000+ is Kirchberg in Tirol (3 km)'),
('veliyanad', 'IN', 'kerala', 1259541, 'Ernakulam district village (Chinmaya International Foundation); nearest town of 5,000+ is Piravam (5 km)'),
('assagao', 'IN', 'goa', 1263580, 'North Goa village (Purple Valley); nearest town of 5,000+ is Mapusa (3 km)'),
('devarabetta', 'IN', 'tamil nadu', 1269934, 'village near Hosur (Arsha Vidya Paramparā, per its own site); nearest town of 5,000+ is Hosur'),
('kalatuwawa', 'LK', '', 1244773, 'Colombo District village (Jethavanarama); nearest town of 5,000+ is Hanwella Ihala (8 km)')
ON CONFLICT (name, country_code, region) DO UPDATE
  SET place_id = EXCLUDED.place_id, note = EXCLUDED.note;

-- Backfill only the listings these names affect.
UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL AND place_id IS NULL;

-- Check: aliases loaded (103 from 0033–0042 + 22 = 125); listings with a town; of those, still without a place
-- (on dev before the live insert: 125, 824, 1 — only Salmon, Idaho).
SELECT
  (SELECT count(*) FROM public.place_aliases) AS aliases,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL) AS with_town,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL AND place_id IS NULL) AS without_place;
