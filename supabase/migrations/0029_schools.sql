-- 0029 — schools (README §17.2, §17.11).
--
-- A school is a kind of listing, like a channel: healers.entity_type 'school'.
-- It keeps everything a listing has (page, offerings, videos, reviews, saves,
-- claiming), so turning a Channel into a School is one change of entity_type.
--
--   1. healers.entity_type      — 'school' joins the known list (0020).
--   2. healers.founded_year     — "Founded 2008" on a school's page and card.
--   3. school_teachers          — which teachers teach at which school. A
--                                 teacher can belong to several schools.
--
-- Content stays read-only for everyone but the service role (0007): anyone may
-- read school_teachers, and only the service role writes it. No other policy
-- changes.
--
-- Dev first, then live. Run once; it's safe to run again.


-- 1. Listing types --------------------------------------------------------

ALTER TABLE public.healers
  DROP CONSTRAINT IF EXISTS healers_entity_type_known;
ALTER TABLE public.healers
  ADD CONSTRAINT healers_entity_type_known CHECK (
    entity_type IS NULL OR entity_type IN ('individual', 'channel', 'app', 'organisation', 'school')
  );

COMMENT ON COLUMN public.healers.entity_type IS
  'individual (a practitioner or teacher), channel (YouTube or podcast), app, organisation (a network), or school (trains and certifies teachers; 0029). Set by the admin; can be changed later. Publishers are their own table.';


-- 2. Founded --------------------------------------------------------------

ALTER TABLE public.healers
  ADD COLUMN IF NOT EXISTS founded_year INTEGER;

COMMENT ON COLUMN public.healers.founded_year IS
  'The year a school (or other non-person listing) was founded, shown as "Founded YYYY" (0029). NULL when unknown; unused for people.';


-- 3. Teachers at a school -------------------------------------------------

CREATE TABLE IF NOT EXISTS public.school_teachers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   BIGINT NOT NULL REFERENCES public.healers(id) ON DELETE CASCADE,
  teacher_id  BIGINT NOT NULL REFERENCES public.healers(id) ON DELETE CASCADE,
  -- 'founder' or 'instructor'; founders are listed first.
  role        TEXT NOT NULL DEFAULT 'instructor',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT school_teachers_pair_key UNIQUE (school_id, teacher_id),
  CONSTRAINT school_teachers_not_self CHECK (school_id <> teacher_id),
  CONSTRAINT school_teachers_role_known CHECK (role IN ('founder', 'instructor'))
);

COMMENT ON TABLE public.school_teachers IS
  'Which teachers teach at which school (0029): "Our Teachers" on the school''s page, "Teaches at…" on the teacher''s. Public read; only the service role writes.';

CREATE INDEX IF NOT EXISTS school_teachers_teacher_idx ON public.school_teachers (teacher_id);

ALTER TABLE public.school_teachers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_teachers FROM anon, authenticated;
GRANT SELECT ON public.school_teachers TO anon, authenticated;
GRANT ALL ON public.school_teachers TO service_role;

DROP POLICY IF EXISTS "Public read school_teachers" ON public.school_teachers;
CREATE POLICY "Public read school_teachers" ON public.school_teachers
  FOR SELECT TO anon, authenticated USING (true);


-- Check (read-only): the new type allowed, the column, the table, its one
-- read policy, and that nothing is a school yet.
SELECT
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'healers_entity_type_known') AS entity_types,
  (SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'healers' AND column_name = 'founded_year') AS founded_year_type,
  to_regclass('public.school_teachers') IS NOT NULL AS school_teachers_table,
  (SELECT string_agg(policyname || ' (' || cmd || ')', ', ') FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'school_teachers') AS policies,
  (SELECT count(*) FROM public.healers WHERE entity_type = 'school') AS schools;
