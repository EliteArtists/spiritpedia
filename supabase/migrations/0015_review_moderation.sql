-- 0015 — reporting and blocking for reviews (App Store guideline 1.2).
--
-- Reviews were already moderated before publication (0008). Apple also asks
-- for a way to report content, a way to block abusive users, and that reports
-- are acted on. Three tables:
--
--   review_reports  someone reported an approved review. Written only through
--                   report_review(), which takes a snapshot of the review as it
--                   was, so editing or deleting it afterwards hides nothing
--                   from the admin. A reporter can read their own reports
--                   ("you reported this"); the admin reads all of them with the
--                   service role.
--   user_blocks     one person blocked a reviewer: that reviewer's reviews no
--                   longer show to them, wherever they are signed in (the public
--                   read policy below excludes them). Written only through
--                   block_review_author(), which takes a review, so no client
--                   ever names a user id. Owner-only read and delete (unblock).
--   review_bans     the admin removed someone's right to post reviews. Service
--                   role only: RLS on, no policies. Enforced by the reviews
--                   trigger, so no client can get around it.
--
-- Idempotent: safe to run twice. Nothing here loosens an existing policy; the
-- public read of reviews gets narrower, never wider.

-- ── review_reports ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.review_reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  review_id BIGINT REFERENCES public.reviews(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  note TEXT,
  content_type TEXT NOT NULL,
  content_slug TEXT NOT NULL,
  review_rating SMALLINT,
  review_body TEXT,
  review_author_name TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT review_reports_reason_known CHECK (
    reason IN ('spam', 'offensive', 'harassment', 'misleading', 'other')
  ),
  CONSTRAINT review_reports_note_length CHECK (note IS NULL OR char_length(note) <= 500),
  CONSTRAINT review_reports_status_known CHECK (status IN ('open', 'resolved', 'dismissed')),
  CONSTRAINT review_reports_once UNIQUE (review_id, reporter_id)
);

COMMENT ON TABLE public.review_reports IS
  'Reports of approved reviews, for the admin Inbox. Written only through report_review(). The review_* columns are a snapshot taken when it was reported, so the admin sees what was reported even if the review is later edited or deleted. Reporter reads own; everything else is the service role.';

COMMENT ON COLUMN public.review_reports.reason IS
  'spam, offensive (offensive or hateful), harassment, misleading (false or misleading) or other.';

COMMENT ON COLUMN public.review_reports.status IS
  'open, resolved (acted on) or dismissed (nothing wrong). Admin-set only.';

CREATE INDEX IF NOT EXISTS review_reports_status_idx
  ON public.review_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS review_reports_reporter_idx
  ON public.review_reports (reporter_id);

ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own review reports" ON public.review_reports;
CREATE POLICY "Users can read own review reports"
ON public.review_reports FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

-- No INSERT, UPDATE or DELETE policy: reporting goes through report_review(),
-- and only the admin (service role) changes a report.

-- ── user_blocks ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id)
);

COMMENT ON TABLE public.user_blocks IS
  'A signed-in person blocked a reviewer: that reviewer''s reviews are hidden from them by the reviews read policy. Written only through block_review_author(); the blocker reads and deletes (unblocks) their own rows.';

COMMENT ON COLUMN public.user_blocks.blocked_name IS
  'The review''s author_name when they were blocked, for the "Blocked reviewers" list. Never joined from user_profiles, which only its owner can read.';

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- The reviews read policy looks in here for every reader, signed in or not,
-- so both roles need SELECT; RLS still shows each person only their own rows.
GRANT SELECT ON public.user_blocks TO anon, authenticated;

DROP POLICY IF EXISTS "Users can read own blocks" ON public.user_blocks;
CREATE POLICY "Users can read own blocks"
ON public.user_blocks FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can delete own blocks" ON public.user_blocks;
CREATE POLICY "Users can delete own blocks"
ON public.user_blocks FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

-- ── review_bans ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.review_bans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.review_bans IS
  'Accounts the admin has stopped from posting or editing reviews. Service role only (RLS on, no policies). Enforced by reviews_pin_author(); a person can ask about themselves only, through review_posting_banned().';

ALTER TABLE public.review_bans ENABLE ROW LEVEL SECURITY;

-- ── Reading reviews: never a blocked reviewer's ─────────────────────────────

DROP POLICY IF EXISTS "Public read approved reviews" ON public.reviews;
CREATE POLICY "Public read approved reviews"
ON public.reviews FOR SELECT
TO anon, authenticated
USING (
  status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_blocks b
     WHERE b.blocker_id = auth.uid()
       AND b.blocked_id = reviews.user_id
  )
);

-- ── Functions ───────────────────────────────────────────────────────────────

-- Whether the CALLER may not post reviews. About yourself only.
CREATE OR REPLACE FUNCTION public.review_posting_banned()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.review_bans WHERE user_id = auth.uid());
$$;

COMMENT ON FUNCTION public.review_posting_banned() IS
  'True if the calling account is banned from posting reviews. Takes no argument, so nobody can ask about anyone else.';

-- Report an approved review. Once per person per review; a second report of
-- the same review changes nothing and is not an error. Returns the report id,
-- or NULL if this person had already reported it.
CREATE OR REPLACE FUNCTION public.report_review(
  p_review_id BIGINT,
  p_reason TEXT,
  p_note TEXT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_review public.reviews%ROWTYPE;
  v_id BIGINT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_review FROM public.reviews
   WHERE id = p_review_id AND status = 'approved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'review not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_review.user_id = v_user THEN
    RAISE EXCEPTION 'cannot report your own review' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.review_reports (
    review_id, reporter_id, reported_user_id, reason, note,
    content_type, content_slug, review_rating, review_body, review_author_name
  ) VALUES (
    v_review.id, v_user, v_review.user_id, p_reason, nullif(btrim(p_note), ''),
    v_review.content_type, v_review.content_slug, v_review.rating,
    v_review.body, v_review.author_name
  )
  ON CONFLICT (review_id, reporter_id) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.report_review(BIGINT, TEXT, TEXT) IS
  'Reports an approved review for the calling account, snapshotting it. Not your own review; once per review. Returns the new report id, or NULL if already reported.';

-- Block the author of an approved review, for the calling account.
CREATE OR REPLACE FUNCTION public.block_review_author(p_review_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_review public.reviews%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_review FROM public.reviews
   WHERE id = p_review_id AND status = 'approved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'review not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_review.user_id = v_user THEN
    RAISE EXCEPTION 'cannot block yourself' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_blocks (blocker_id, blocked_id, blocked_name)
  VALUES (v_user, v_review.user_id, v_review.author_name)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.block_review_author(BIGINT) IS
  'Blocks the author of an approved review for the calling account. Takes a review, never a user id.';

REVOKE ALL ON FUNCTION public.review_posting_banned() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.report_review(BIGINT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.block_review_author(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_posting_banned() TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_review(BIGINT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_review_author(BIGINT) TO authenticated;

-- ── The reviews trigger, now refusing banned accounts ───────────────────────

CREATE OR REPLACE FUNCTION public.reviews_pin_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claim TEXT;
  v_role TEXT;
BEGIN
  BEGIN
    v_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  EXCEPTION WHEN others THEN
    v_role := 'authenticated';
  END;

  IF v_role IS DISTINCT FROM 'authenticated' AND v_role IS DISTINCT FROM 'anon' THEN
    RETURN NEW;
  END IF;

  -- review_bans has no policies, so ask through the definer function.
  IF public.review_posting_banned() THEN
    RAISE EXCEPTION 'review posting is not available for this account'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.user_id := COALESCE(auth.uid(), NEW.user_id);
    NEW.created_at := now();
    NEW.status := 'pending';

    SELECT linked_healer_slug INTO v_claim
      FROM public.user_profiles
     WHERE id = NEW.user_id;
    NEW.author_healer_slug := v_claim;
  ELSE
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
    NEW.content_type := OLD.content_type;
    NEW.content_slug := OLD.content_slug;
    NEW.status := OLD.status;
    NEW.author_healer_slug := OLD.author_healer_slug;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.reviews_pin_author() IS
  'Pins the columns an author must not control, and refuses any insert or edit from an account in review_bans (0015). On insert: user_id, created_at, status forced to pending, and author_healer_slug derived from the users own profile rather than taken from the payload, so nobody can link their name to someone elses healer page. On update: all of those plus the identity columns are frozen, so an edit cannot approve itself or move onto another item. Yields to any role that is not anon or authenticated, which is what lets the service role moderate: a BEFORE UPDATE trigger runs for every role, and the service role bypasses RLS, not triggers. The first version of this function lacked that exemption and no review could be approved by anything.';

-- ── Check ───────────────────────────────────────────────────────────────────

SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('reviews', 'review_reports', 'user_blocks', 'review_bans')
ORDER BY tablename, policyname;
