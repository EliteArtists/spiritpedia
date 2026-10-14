-- 0018 — "Never show": subjects a member would rather not see, beside the
-- "More of" subjects of 0017. Set at onboarding ("Anything you'd rather not
-- see?") or in Account → Tailor Spiritpedia.
--
-- Same row, same owner-only access as 0017: a second list on
-- user_interests. A row still means "has chosen"; both lists come from the
-- account when it has one.
--
-- The trigger now checks both lists against public.subjects, drops
-- duplicates, and refuses a subject in both: it cannot be "More of" and
-- "Never show" at once.

ALTER TABLE public.user_interests
  ADD COLUMN IF NOT EXISTS hidden_subjects TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.user_interests
  DROP CONSTRAINT IF EXISTS user_interests_hidden_subjects_size;
ALTER TABLE public.user_interests
  ADD CONSTRAINT user_interests_hidden_subjects_size
  CHECK (cardinality(hidden_subjects) <= 100);

COMMENT ON TABLE public.user_interests IS
  'Each member''s tailoring: subjects (More of) and hidden_subjects (Never show), slugs from public.subjects. Used to rank and filter Discover, Videos, Books and Spiritpedia Suggests. Owner-only; cascades with the account.';

CREATE OR REPLACE FUNCTION public.user_interests_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_unknown TEXT;
  v_both TEXT;
BEGIN
  NEW.subjects := ARRAY(SELECT DISTINCT s FROM unnest(NEW.subjects) AS s ORDER BY s);
  NEW.hidden_subjects := ARRAY(
    SELECT DISTINCT s FROM unnest(NEW.hidden_subjects) AS s ORDER BY s
  );

  SELECT s INTO v_unknown
  FROM unnest(NEW.subjects || NEW.hidden_subjects) AS s
  WHERE NOT EXISTS (SELECT 1 FROM public.subjects WHERE slug = s)
  LIMIT 1;

  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION 'unknown subject: %', v_unknown USING ERRCODE = '23503';
  END IF;

  SELECT s INTO v_both
  FROM unnest(NEW.subjects) AS s
  WHERE s = ANY (NEW.hidden_subjects)
  LIMIT 1;

  IF v_both IS NOT NULL THEN
    RAISE EXCEPTION 'subject both shown more and hidden: %', v_both
      USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
-- The trigger from 0017 already calls this function; nothing else changes.
