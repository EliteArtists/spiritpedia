-- 0017 — "What interests you most?": the subjects a member chose at
-- onboarding, or later in Account → Your interests.
--
-- One row per account. A row means the person has chosen (an empty list is a
-- choice too: "nothing in particular"); no row means they never have. When a
-- phone and the account disagree, the account wins, so the app needs to tell
-- those two apart.
--
-- The choices are subject slugs from public.subjects, the canonical list
-- behind the pills. A subject's name can change freely; its slug is what is
-- kept here. An array cannot carry a foreign key, so a trigger checks every
-- slug against public.subjects on each write instead.
--
-- Only the owner can read or change their own row. It cascades off
-- auth.users, so deleting the account deletes it.

CREATE TABLE IF NOT EXISTS public.user_interests (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subjects TEXT[] NOT NULL DEFAULT '{}'
    CHECK (cardinality(subjects) <= 100),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_interests IS
  'The subjects (slugs from public.subjects) each member chose, used to tailor Discover, Videos, Books and Spiritpedia Suggests. Owner-only; cascades with the account.';

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own interests" ON public.user_interests;
CREATE POLICY "Users can read own interests"
ON public.user_interests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add own interests" ON public.user_interests;
CREATE POLICY "Users can add own interests"
ON public.user_interests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can change own interests" ON public.user_interests;
CREATE POLICY "Users can change own interests"
ON public.user_interests FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own interests" ON public.user_interests;
CREATE POLICY "Users can remove own interests"
ON public.user_interests FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Signed-out visitors have no business here at all.
REVOKE ALL ON public.user_interests FROM anon;

-- Every write: drop duplicates, refuse any slug that is not a real subject,
-- and keep updated_at honest.
CREATE OR REPLACE FUNCTION public.user_interests_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_unknown TEXT;
BEGIN
  NEW.subjects := ARRAY(SELECT DISTINCT s FROM unnest(NEW.subjects) AS s ORDER BY s);

  SELECT s INTO v_unknown
  FROM unnest(NEW.subjects) AS s
  WHERE NOT EXISTS (SELECT 1 FROM public.subjects WHERE slug = s)
  LIMIT 1;

  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION 'unknown subject: %', v_unknown USING ERRCODE = '23503';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_interests_check ON public.user_interests;
CREATE TRIGGER user_interests_check
BEFORE INSERT OR UPDATE ON public.user_interests
FOR EACH ROW EXECUTE FUNCTION public.user_interests_check();
