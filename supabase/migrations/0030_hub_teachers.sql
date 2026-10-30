-- 0030 — hub_teachers (README §17.11).
--
-- 0029's school_teachers now links teachers to Organisations as well as
-- Schools ("Teaches on The Shift Network", "Teaches at White Tiger Qigong"),
-- so it's renamed for what it is:
--
--   school_teachers            → hub_teachers
--   school_teachers.school_id  → hub_teachers.hub_id
--
-- and its constraints, keys, index and policy follow. The rows, the grants and
-- the one public-read policy are unchanged: anyone may read, only the service
-- role writes. The foreign key names matter, since the website embeds through
-- them (hub_teachers_hub_id_fkey, hub_teachers_teacher_id_fkey).
--
-- Dev first, then live. Run once; it's safe to run again.


DO $$
BEGIN
  IF to_regclass('public.school_teachers') IS NOT NULL AND to_regclass('public.hub_teachers') IS NULL THEN
    ALTER TABLE public.school_teachers RENAME TO hub_teachers;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'hub_teachers' AND column_name = 'school_id') THEN
    ALTER TABLE public.hub_teachers RENAME COLUMN school_id TO hub_id;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_teachers_pkey') THEN
    ALTER TABLE public.hub_teachers RENAME CONSTRAINT school_teachers_pkey TO hub_teachers_pkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_teachers_pair_key') THEN
    ALTER TABLE public.hub_teachers RENAME CONSTRAINT school_teachers_pair_key TO hub_teachers_pair_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_teachers_not_self') THEN
    ALTER TABLE public.hub_teachers RENAME CONSTRAINT school_teachers_not_self TO hub_teachers_not_self;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_teachers_role_known') THEN
    ALTER TABLE public.hub_teachers RENAME CONSTRAINT school_teachers_role_known TO hub_teachers_role_known;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_teachers_school_id_fkey') THEN
    ALTER TABLE public.hub_teachers RENAME CONSTRAINT school_teachers_school_id_fkey TO hub_teachers_hub_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_teachers_teacher_id_fkey') THEN
    ALTER TABLE public.hub_teachers RENAME CONSTRAINT school_teachers_teacher_id_fkey TO hub_teachers_teacher_id_fkey;
  END IF;

  IF to_regclass('public.school_teachers_teacher_idx') IS NOT NULL THEN
    ALTER INDEX public.school_teachers_teacher_idx RENAME TO hub_teachers_teacher_idx;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'hub_teachers' AND policyname = 'Public read school_teachers') THEN
    ALTER POLICY "Public read school_teachers" ON public.hub_teachers RENAME TO "Public read hub_teachers";
  END IF;
END $$;

COMMENT ON TABLE public.hub_teachers IS
  'Which teachers teach at which hub, a School or an Organisation (0029, renamed 0030): "Our Teachers" on the hub''s page, "Teaches at…" or "Teaches on…" on the teacher''s. Public read; only the service role writes.';
COMMENT ON COLUMN public.hub_teachers.hub_id IS
  'The School or Organisation (healers.id).';

-- Tell the API about the new names straight away.
NOTIFY pgrst, 'reload schema';


-- Check (read-only): the table under its new name, the column, both keys, the
-- policy, and the rows carried over.
SELECT
  to_regclass('public.hub_teachers') IS NOT NULL AS hub_teachers_table,
  to_regclass('public.school_teachers') IS NULL AS old_name_gone,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hub_teachers' AND column_name = 'hub_id') = 1 AS hub_id_column,
  (SELECT string_agg(conname, ', ' ORDER BY conname) FROM pg_constraint
    WHERE conrelid = 'public.hub_teachers'::regclass AND contype = 'f') AS foreign_keys,
  (SELECT string_agg(policyname || ' (' || cmd || ')', ', ') FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hub_teachers') AS policies,
  (SELECT count(*) FROM public.hub_teachers) AS links;
