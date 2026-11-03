-- 0032 — the push notification package (app 1.0.1, owner's spec of 3 Nov 2026).
--
-- Invitations only, never reminders of things undone. Two switches:
--   Discoveries      new from someone they saved, a free resource for what
--                    they love, the two invitations back. OFF until the person
--                    turns it on (notification_preferences.discoveries, new).
--   Account updates  their review, listing or request to manage a listing
--                    approved, and the once-only "lovely getting to know you".
--                    This is the existing `general` column (default on), so
--                    builds 24–27, whose one switch writes `general`, keep
--                    working; the app calls it Account updates from 1.0.1.
--
-- What the server needs to keep the rules (web/utils/pushRules.js):
--   push_state  per account: the phone's offset from UTC (time zone and quiet
--               hours), when the app was last opened (invitations back, and
--               never "you haven't visited"), and the first real visit (the
--               welcome the next evening). Written only by the two functions
--               below, each for the caller's own account.
--   push_sends  every notification sent or waiting for its hour: which kind,
--               which switch, what it pointed at (references, never text
--               about the person). It is how the 7-day limit, "not recently
--               recommended", the once-only welcome and the queue for quiet
--               hours work. Service role only.
--
-- Nothing here is shown to the team beyond kinds and counts. No search words
-- are stored anywhere (the crisis guard is unchanged). Everything is deleted
-- with the account. No existing policy is loosened.
--
-- Dev first, then live. Safe to run again.


-- ── The Discoveries switch ──────────────────────────────────────────────────

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS discoveries BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.notification_preferences.general IS
  'Account updates (shown as "General" in builds 24–27): approvals of their review, listing or claim, and the once-only welcome. Default on.';
COMMENT ON COLUMN public.notification_preferences.discoveries IS
  'Discoveries (0032): new from someone they saved, a free resource for their interests, invitations back. Off until they turn it on. At most one a week, with admin messages.';


-- ── Per-account state the rules read ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_state (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Minutes east of UTC, as the phone last said (e.g. 0 in London in winter,
  -- 60 in summer, -300 in New York). Refreshed at every opening, so a
  -- clock change or a journey catches up the next time the app is used.
  utc_offset_minutes INTEGER CHECK (utc_offset_minutes BETWEEN -840 AND 840),
  last_opened_at     TIMESTAMPTZ,
  -- The first real visit: about 3 minutes, a save, or a feeling search.
  first_visit_at     TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.push_state IS
  'Per account, for the push rules (0032): time zone offset, last app opening, first real visit. Written only by note_app_open() and note_first_visit(), for the caller. The member may read their own row; the server reads it with the service role.';

ALTER TABLE public.push_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own push state" ON public.push_state;
CREATE POLICY "Users can read own push state"
ON public.push_state FOR SELECT
USING (auth.uid() = user_id);

-- The app opened (at start and on coming back to the front).
CREATE OR REPLACE FUNCTION public.note_app_open(p_utc_offset_minutes INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_offset INTEGER := CASE
    WHEN p_utc_offset_minutes BETWEEN -840 AND 840 THEN p_utc_offset_minutes
  END;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.push_state (user_id, utc_offset_minutes, last_opened_at)
  VALUES (v_user, v_offset, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET utc_offset_minutes = COALESCE(EXCLUDED.utc_offset_minutes, public.push_state.utc_offset_minutes),
        last_opened_at = NOW(),
        updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.note_app_open(INTEGER) IS
  'The calling account opened the app: records when, and the phone''s offset from UTC (0032). Signed-in callers only; writes only auth.uid().';

REVOKE ALL ON FUNCTION public.note_app_open(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.note_app_open(INTEGER) TO authenticated;

-- The first real visit. Only the first one is kept.
CREATE OR REPLACE FUNCTION public.note_first_visit()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.push_state (user_id, first_visit_at, last_opened_at)
  VALUES (v_user, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET first_visit_at = COALESCE(public.push_state.first_visit_at, NOW()),
        updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.note_first_visit() IS
  'The calling account''s first real visit (about 3 minutes, a save or a feeling search), kept once (0032). Signed-in callers only; writes only auth.uid().';

REVOKE ALL ON FUNCTION public.note_first_visit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.note_first_visit() TO authenticated;


-- ── Every notification, sent or waiting ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_sends (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  -- 'discovery' counts toward the one-a-week limit (the welcome and admin
  -- messages too); 'account' does not.
  category    TEXT NOT NULL,
  -- What it pointed at: [{ "type": "video", "ref": "<slug>" }, …]. Never text.
  refs        JSONB NOT NULL DEFAULT '[]'::jsonb,
  status      TEXT NOT NULL,
  -- A queued notification: what to send, and the hour it may go (after quiet
  -- hours). Cleared once sent.
  payload     JSONB,
  send_after  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at     TIMESTAMPTZ,
  CONSTRAINT push_sends_kind_known CHECK (kind IN (
    'new_from_saved', 'free_resource', 'return_first', 'return_second',
    'first_visit', 'admin', 'review_approved', 'listing_approved', 'claim_approved'
  )),
  CONSTRAINT push_sends_category_known CHECK (category IN ('discovery', 'account')),
  CONSTRAINT push_sends_status_known CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  CONSTRAINT push_sends_refs_is_list CHECK (jsonb_typeof(refs) = 'array'),
  CONSTRAINT push_sends_sent_has_time CHECK (status <> 'sent' OR sent_at IS NOT NULL)
);

COMMENT ON TABLE public.push_sends IS
  'Each push notification sent, queued for after quiet hours, failed or skipped (0032): kind, switch, references to what it pointed at. The 7-day limit, repeat rules and once-only welcome read it. Service role only: RLS on, no policies. Deleted with the account.';

-- The welcome goes once per account, however often it is tried.
CREATE UNIQUE INDEX IF NOT EXISTS push_sends_first_visit_once
  ON public.push_sends (user_id)
  WHERE kind = 'first_visit' AND status IN ('queued', 'sent');

CREATE INDEX IF NOT EXISTS push_sends_by_person
  ON public.push_sends (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS push_sends_queue
  ON public.push_sends (send_after)
  WHERE status = 'queued';

ALTER TABLE public.push_sends ENABLE ROW LEVEL SECURITY;


-- Check -------------------------------------------------------------------
-- Expect: true, true, true, true, 1, 0, 2.

SELECT
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'notification_preferences'
            AND column_name = 'discoveries') AS discoveries_column,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.push_state'::regclass) AS state_rls,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.push_sends'::regclass) AS sends_rls,
  to_regprocedure('public.note_app_open(integer)') IS NOT NULL
    AND to_regprocedure('public.note_first_visit()') IS NOT NULL AS functions,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_state') AS state_policies,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_sends') AS sends_policies,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname IN ('note_app_open', 'note_first_visit')
       AND has_function_privilege('authenticated', p.oid, 'EXECUTE')) AS authenticated_can_call;
