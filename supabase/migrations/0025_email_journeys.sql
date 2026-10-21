-- 0025 — the emails agreed on 21 October 2026 (docs/email-copy-2026-10-21.md).
--
--   1. healer_journeys — three more slots: the outreach journey is now eight
--      emails, at days 0, 21, 42, 63, 84, 105, 126 and 147.
--   2. email_sends — "this email has gone", once per thing it is about. The
--      website claims a row before sending, so two racing requests cannot
--      send it twice, and gives it back if the send fails. Used for the
--      explorer welcome, Day 4, application received, claim request received,
--      the instant claim approval and the ownership check. It holds which
--      email and which account, request or listing, never an address.
--   3. email_preferences — an explorer's unsubscribe, with the token that lets
--      the link in an email work without signing in.
--
-- Both new tables are service role only (RLS on, no policies), like
-- healer_journeys and admin_notes: every read and write goes through the
-- website's server routes. No existing policy changes.
--
-- Reasons for a declined application, claim or review are not stored here:
-- the admin types the reason when deciding and it goes in the email (and its
-- archive copy). A column on reviews or claim_requests could be written by the
-- member through their existing policies.
--
-- Dev first, then live. Run once; it's safe to run again.


-- 1. Eight outreach emails ------------------------------------------------

ALTER TABLE public.healer_journeys
  ADD COLUMN IF NOT EXISTS email_6_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_7_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_8_sent_at TIMESTAMPTZ;

COMMENT ON TABLE public.healer_journeys IS
  'Outreach sequence to a listing nobody has claimed: a healers row (any type) or a publisher, exactly one. Eight emails at 0, 21, 42, 63, 84, 105, 126 and 147 days (0025). Service role only: there are no policies, as with admin_notes.';

COMMENT ON COLUMN public.healer_journeys.stop_reason IS
  'Why it ended. claimed, healer_removed, no_contact_email, suppressed and sequence_complete (email 8 has gone) are set automatically; asked_to_stop and anything else are set by an admin. A listing whose journey ended asked_to_stop or suppressed is never started again.';

COMMENT ON COLUMN public.healer_journeys.started_at IS
  'The clock every later email is measured from, NOT created_at. Days 21 to 147 are counted from here.';


-- 2. Emails that go once --------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_sends (
  -- Which email: explorer_welcome, explorer_day4, application_received,
  -- claim_request_received, claim_approved, ownership_check, …
  kind     TEXT NOT NULL,
  -- What it was about: an account id, a claim request id or a listing.
  ref      TEXT NOT NULL,
  sent_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kind, ref)
);

COMMENT ON TABLE public.email_sends IS
  'One row per email that must go only once, claimed before sending and removed if the send fails (0025). No addresses. Service role only: RLS on, no policies.';

ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;


-- 3. Explorer unsubscribe --------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Set: no Day 4 and no discovery emails. Account and review emails still go.
  unsubscribed_at    TIMESTAMPTZ,
  -- In the unsubscribe link, so it works without signing in. Not guessable,
  -- and it only ever unsubscribes its own account.
  unsubscribe_token  UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.email_preferences IS
  'An account''s choice about Day 4 and discovery emails, and the token for its one-click unsubscribe link (0025). Deleted with the account. Service role only: RLS on, no policies.';

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;


-- Check -------------------------------------------------------------------
-- Expect: 3, true, true, true, true, 0, 0.

SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'healer_journeys'
      AND column_name IN ('email_6_sent_at', 'email_7_sent_at', 'email_8_sent_at')) AS new_journey_columns,
  to_regclass('public.email_sends') IS NOT NULL AS sends_table,
  to_regclass('public.email_preferences') IS NOT NULL AS preferences_table,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.email_sends'::regclass) AS sends_rls,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.email_preferences'::regclass) AS preferences_rls,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_sends') AS sends_policies,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_preferences') AS preferences_policies;
