-- 0044 — Outreach tracking (owner's admin decisions, 11 Nov 2026).
--
--   1. healer_journeys.replied_at — "Mark replied" in the admin. A reply ends
--      the automatic emails; the conversation carries on by hand.
--   2. healer_journeys.channel — 'email' (the eight-email sequence) or 'form':
--      a listing with no published email, contacted once by hand through its
--      own contact form. A form contact sends nothing and the daily job never
--      touches it; started_at is the day the admin used the form.
--   3. journey_messages — one row per outreach email Resend accepted, with
--      Resend's message id, so its webhook can record "delivered" and
--      "bounced" against the right email of the right journey. No address and
--      no wording are kept: the message id, which email, and what happened.
--
-- Journeys to publishers need nothing new: healer_journeys.publisher_id and
-- the exactly-one-target check (healer_journeys_one_listing) came in 0020.
-- The emails for publishers, channels, apps, organisations and schools stay
-- off in the website until the owner sends the approved wording.
--
-- Click and open tracking are deliberately absent: outreach is plain text and
-- the owner chose delivered and bounced only.
--
-- Service role only, as with healer_journeys: RLS on, no policies. No
-- existing policy changes.
--
-- Dev first, then live. Run once; it's safe to run again. Check row at the end.


-- 1. Replied ---------------------------------------------------------------

ALTER TABLE public.healer_journeys
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

COMMENT ON COLUMN public.healer_journeys.replied_at IS
  'When they replied, as marked by an admin (0044). Marking it stops a running sequence with stop_reason replied; a reply never blocks a later journey.';


-- 2. Contacted through the listing's contact form ------------------------

ALTER TABLE public.healer_journeys
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email';

ALTER TABLE public.healer_journeys
  DROP CONSTRAINT IF EXISTS healer_journeys_channel_known;
ALTER TABLE public.healer_journeys
  ADD CONSTRAINT healer_journeys_channel_known CHECK (channel IN ('email', 'form'));

COMMENT ON COLUMN public.healer_journeys.channel IS
  'email: the eight-email sequence. form: contacted once by hand through the listing''s own contact form (0044), recorded stopped with stop_reason contacted_via_form; started_at is the day the form was used. The daily job sends only for email.';


-- 3. What happened to each email -----------------------------------------

CREATE TABLE IF NOT EXISTS public.journey_messages (
  -- Resend's id for the message (the webhook's data.email_id).
  resend_id     TEXT PRIMARY KEY,
  journey_id    UUID NOT NULL REFERENCES public.healer_journeys(id) ON DELETE CASCADE,
  email_number  INTEGER NOT NULL CHECK (email_number BETWEEN 1 AND 8),
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at  TIMESTAMPTZ,
  bounced_at    TIMESTAMPTZ,
  -- Resend's bounce type, e.g. Permanent or Transient. A permanent bounce
  -- stops the journey as suppressed.
  bounce_type   TEXT
);

CREATE INDEX IF NOT EXISTS journey_messages_journey_idx
  ON public.journey_messages (journey_id, email_number);

COMMENT ON TABLE public.journey_messages IS
  'One row per outreach email Resend accepted (0044): its Resend id, which journey and which email, and when Resend reported it delivered or bounced. No address, no wording. Service role only: RLS on, no policies.';

ALTER TABLE public.journey_messages ENABLE ROW LEVEL SECURITY;


-- Check -------------------------------------------------------------------
-- Expect: 2, true, true, 0, then the journeys so far, all of them email and
-- none replied. On 11 Nov 2026 dev and live had no journeys: 2, true, true,
-- 0, 0, 0, 0.

SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'healer_journeys'
      AND column_name IN ('replied_at', 'channel')) AS new_journey_columns,
  to_regclass('public.journey_messages') IS NOT NULL AS messages_table,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.journey_messages'::regclass) AS messages_rls,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'journey_messages') AS messages_policies,
  (SELECT count(*) FROM public.healer_journeys) AS journeys,
  (SELECT count(*) FROM public.healer_journeys WHERE channel = 'email') AS email_journeys,
  (SELECT count(*) FROM public.healer_journeys WHERE replied_at IS NOT NULL) AS replied;
