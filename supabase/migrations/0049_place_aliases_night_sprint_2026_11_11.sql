-- 0049 — Place aliases for the night sprint of 11–12 Nov 2026.
--
-- These new listings publish a place that isn't in places (a village or a
-- hamlet under 5,000, or, for Lismore, a town that places lacks). Each points
-- at the nearest town of 5,000+ in the same country and state, as in 0033 and
-- 0043, except New Lebanon, New York, which points at Pittsfield,
-- Massachusetts (13 km; owner, 12 Nov 2026: the state line doesn't matter to
-- a user). Distances are approximate. The listing keeps its own
-- town; only place_id uses the alias.
--
-- Run order (dev first, then live): this whole file, after 0048. Safe to run
-- again. Check row at the end.

INSERT INTO public.place_aliases (name, country_code, region, place_id, note) VALUES
('villeneuve-sur-bellot', 'FR', '', 3009481, 'Seine-et-Marne village (Maison de l''Inspir); nearest town of 5,000+ is La Ferté-sous-Jouarre (18 km)'),
('porcupine ridge', 'AU', 'victoria', 2160885, 'locality near Daylesford (Stream Entering Monastery); nearest town of 5,000+ is Kyneton (24 km)'),
('new lebanon', 'US', 'new york', 4947459, 'Columbia County town (Inayatiyya Hudson Valley Center); nearest town of 5,000+ is Pittsfield, Massachusetts (13 km; owner, 12 Nov 2026)'),
('buckingham', 'US', 'virginia', 4758495, 'Buckingham County (Satchidananda Ashram Yogaville); nearest town of 5,000+ is Farmville (31 km)'),
('colville', 'NZ', '', 2179103, 'Coromandel settlement (Mahamudra Centre); nearest town of 5,000+ is Whitianga (31 km)'),
('upper moutere', 'NZ', '', 2184361, 'Tasman village (Chandrakirti); nearest town of 5,000+ is Motueka (15 km)'),
('scharnstein', 'AT', '', 2778436, 'Upper Austria village (Rangjung Yeshe Gomde); nearest town of 5,000+ is Gmunden (12 km)'),
('poggio nativo', 'IT', '', 3171558, 'Lazio village (Santacittarama); nearest town of 5,000+ is Palombara Sabina (17 km)'),
('heilig landstichting', 'NL', '', 2750053, 'village beside Nijmegen (Zen Centrum Nijmegen); Nijmegen (4 km)'),
('lismore', 'AU', 'new south wales', 6697124, 'Lismore isn''t in places (Kuan Yin Meditation Centre); East Lismore (2 km)'),
('doonan', 'AU', 'queensland', 2146997, 'Noosa hinterland locality (Way of the Forest); nearest town of 5,000+ is Tewantin (6 km)'),
('ridgeland', 'US', 'wisconsin', 5262634, 'Dunn County village (Hay River KTC); nearest town of 5,000+ is Menomonie (36 km)'),
('kuttolsheim', 'FR', '', 2967437, 'Alsace village (Sakya Tsechen Ling); nearest town of 5,000+ is Wasselonne (7 km)'),
('conway', 'US', 'massachusetts', 4938378, 'Franklin County town (Tsegyalgar East); nearest town of 5,000+ is Greenfield (12 km)')
ON CONFLICT (name, country_code, region) DO UPDATE
  SET place_id = EXCLUDED.place_id, note = EXCLUDED.note;

-- Backfill only the listings these names affect.
UPDATE public.healers
SET place_id = public.resolve_place(city, country)
WHERE city IS NOT NULL AND place_id IS NULL;

-- Check: aliases loaded (up by 14 on what each database had); listings with a
-- town; of those, still without a place (on dev before any new insert: 1, only
-- Salmon, Idaho).
SELECT
  (SELECT count(*) FROM public.place_aliases) AS aliases,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL) AS with_town,
  (SELECT count(*) FROM public.healers WHERE city IS NOT NULL AND place_id IS NULL) AS without_place;
