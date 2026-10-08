-- Emotion vocabulary added after the original seed.
--
-- ALREADY APPLIED IN PRODUCTION (7 October 2026). This file is the migration
-- record, not the act: these 43 rows were written by hand in the Supabase SQL
-- editor during the emotion-search work and existed in no file until now. The
-- values below were read back OUT of production rather than retyped from the
-- original statements, so this is what the database actually holds.
--
-- READ THIS BEFORE ASSUMING A REBUILD WORKS.
--
-- Nothing in supabase/migrations/ creates the emotion_mappings table, and the
-- original seed — spiritpedia-emotion-mappings.sql, roughly 3,488 rows across
-- 693 emotions — is NOT in this repository. This file adds 43 rows on top of
-- that seed; it does not stand alone. Against a database rebuilt from these
-- migrations only, it fails on a table that does not exist, and that failure
-- is the correct outcome: it tells you the seed is missing rather than
-- quietly producing a search with 2% of its vocabulary.
--
-- WHY THESE EIGHT. Each was a real miss found by typing phrases into the live
-- search. The vocabulary was never the weak part of that system — the matcher
-- was — but these eight had no row to match at all:
--
--   anger        'angry' was stored, 'anger' was not. The matcher has no
--                stemmer, and the whole-word rule added in the same week
--                correctly refuses to find 'anger' inside 'angry'.
--   sadness      same noun/adjective gap against 'sad'.
--   confusion    same gap against 'confused'.
--   despair      absent entirely; mirrors 'hopeless'.
--   i feel empty 'empty inside' was stored, but containment requires every
--                stored word to be present and nobody types "inside".
--   i feel nothing   no numbness entry shares the word "nothing", so no
--                matcher change could ever reach it. Only a row could.
--   i feel like im going in circles   nothing in the table for circles.
--   i dont know what i want from life  mirrors the stored
--                'i dont know what im doing with my life'.
--
-- CONVENTIONS THAT MATTER HERE. Emotions are stored lower-case and
-- APOSTROPHE-FREE ('im', not 'I''m'), because normaliseQuery() strips
-- apostrophes before looking anything up — a row written with one would never
-- match. Each emotion maps to 5-8 weighted subjects rather than one, so a
-- search returns a shelf rather than a single lonely link.
--
-- DO UPDATE, not DO NOTHING. The rows are already in production, so this is
-- written to converge the weights on what is below rather than skip them.
-- That makes the file the authority on these 43 rows and safe to re-run.

INSERT INTO public.emotion_mappings (emotion, subject_slug, weight) VALUES
  -- anger — mirrors the 'angry' bundle (7 rows, two subjects at weight 3)
  ('anger', 'breathwork', 3),
  ('anger', 'shadow-work', 3),
  ('anger', 'meditation', 2),
  ('anger', 'mindfulness', 2),
  ('anger', 'eft-tapping', 1),
  ('anger', 'qi-gong', 1),
  ('anger', 'self-healing', 1),

  -- sadness — mirrors 'sad'
  ('sadness', 'self-healing', 3),
  ('sadness', 'meditation', 2),
  ('sadness', 'sound-healing', 2),
  ('sadness', 'eft-tapping', 1),
  ('sadness', 'shadow-work', 1),
  ('sadness', 'spirituality', 1),

  -- confusion — mirrors 'confused'
  ('confusion', 'consciousness', 3),
  ('confusion', 'mindfulness', 2),
  ('confusion', 'non-duality', 2),
  ('confusion', 'soul-purpose', 2),
  ('confusion', 'life-coaching', 1),

  -- despair — mirrors 'hopeless'
  ('despair', 'self-healing', 3),
  ('despair', 'breathwork', 2),
  ('despair', 'meditation', 2),
  ('despair', 'yoga', 2),
  ('despair', 'energy-medicine', 1),

  -- i feel empty — the depression/emptiness bundle shared by 'empty inside',
  -- 'depression', 'numb' and 'hopeless'
  ('i feel empty', 'self-healing', 3),
  ('i feel empty', 'breathwork', 2),
  ('i feel empty', 'meditation', 2),
  ('i feel empty', 'yoga', 2),
  ('i feel empty', 'energy-medicine', 1),

  -- i feel nothing — same bundle; mirrors 'numb'
  ('i feel nothing', 'self-healing', 3),
  ('i feel nothing', 'breathwork', 2),
  ('i feel nothing', 'meditation', 2),
  ('i feel nothing', 'yoga', 2),
  ('i feel nothing', 'energy-medicine', 1),

  -- i feel like im going in circles — the stuck/lost family rather than
  -- 'confused': going in circles is repetition without progress
  ('i feel like im going in circles', 'life-coaching', 3),
  ('i feel like im going in circles', 'law-of-attraction', 2),
  ('i feel like im going in circles', 'soul-purpose', 2),
  ('i feel like im going in circles', 'manifestation', 1),
  ('i feel like im going in circles', 'meditation', 1),

  -- i dont know what i want from life — mirrors
  -- 'i dont know what im doing with my life'
  ('i dont know what i want from life', 'spirituality', 3),
  ('i dont know what i want from life', 'life-coaching', 2),
  ('i dont know what i want from life', 'meditation', 2),
  ('i dont know what i want from life', 'soul-purpose', 2),
  ('i dont know what i want from life', 'self-healing', 1)
ON CONFLICT (emotion, subject_slug) DO UPDATE
  SET weight = EXCLUDED.weight;


/* ─────────────────────────────────────────────────────────────────────────
   VERIFICATION
   ───────────────────────────────────────────────────────────────────────── */

-- 1. These 43 rows. True wherever this file has been applied on top of the
--    seed, and the only check here that is portable.
--    Expect: 8 emotions, 43 rows.
SELECT
  count(DISTINCT emotion) AS emotions_added,
  count(*)                AS rows_added
FROM public.emotion_mappings
WHERE emotion IN (
  'anger', 'sadness', 'confusion', 'despair',
  'i feel empty', 'i feel nothing',
  'i feel like im going in circles',
  'i dont know what i want from life'
);

-- 2. Per emotion, so a partial paste is visible rather than silent. A single
--    statement of this size has been truncated in the SQL editor before now,
--    which left 'confusion' holding 2 of its 5 rows and the search returning
--    a thin, oddly-ranked result.
--    Expect: anger 7, sadness 6, every other emotion 5.
SELECT emotion, count(*) AS subjects, max(weight) AS top_weight
FROM public.emotion_mappings
WHERE emotion IN (
  'anger', 'sadness', 'confusion', 'despair',
  'i feel empty', 'i feel nothing',
  'i feel like im going in circles',
  'i dont know what i want from life'
)
GROUP BY emotion
ORDER BY emotion;

-- 3. WHOLE-TABLE TOTALS — an assertion about THIS production database on
--    8 October 2026, not about a rebuild. 3,488 of these rows come from the
--    seed file that is not in this repository, so a database built from
--    supabase/migrations/ alone cannot reach these numbers and should not be
--    expected to.
--    Expect against production: 701 emotions, 3,531 rows, 42 subjects.
SELECT
  count(DISTINCT emotion)      AS total_emotions,   -- expect 701
  count(*)                     AS total_rows,       -- expect 3531
  count(DISTINCT subject_slug) AS subjects_covered  -- expect 42
FROM public.emotion_mappings;

-- 4. Every subject_slug above must exist in `subjects`, or the search will
--    offer a link to a page that does not resolve. There is no foreign key on
--    this column, so nothing enforces it.
--    Expect: zero rows.
SELECT DISTINCT m.subject_slug AS orphaned_slug
FROM public.emotion_mappings m
LEFT JOIN public.subjects s ON s.slug = m.subject_slug
WHERE s.slug IS NULL;
