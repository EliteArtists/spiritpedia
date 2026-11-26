-- 0057 — The address each journey went to, and replaced journeys (owner,
-- 26 Nov 2026, after Nigel Gee).
--
-- Nigel Gee's listing had two journeys: 18 Nov to his old address (a
-- temporary bounce) and 23 Nov to his new one, after the owner changed the
-- listing's email. Admin → Outreach showed the listing's current email on
-- both, and both as Claimed.
--
--   1. sent_to on healer_journeys (the address its latest email went to) and
--      on journey_messages (the address that email went to). The website
--      writes them on every send from now on; scripts/journey-sent-to.mjs
--      fills the past ones from Resend after this has run. Outreach shows
--      them instead of the listing's email today.
--   2. stop_reason 'replaced': Start stops a running or paused journey to
--      the same listing as "Replaced by a newer journey" before it begins a
--      new one. The claim trigger (0054) now leaves 'replaced' alone, so a
--      replaced journey isn't counted as Claimed a second time.
--   3. Backfill: an email journey with a newer email journey to the same
--      listing becomes stopped, 'replaced' (on live: Nigel Gee's 18 Nov one).
--      The never-again reasons (asked_to_stop, removal_requested,
--      suppressed, do_not_contact_email) keep theirs, and replied_at stays.
--
-- No grant or policy changes. Dev first, then live. Safe to run again.
-- Check row at the end.


-- 1. Where it went ---------------------------------------------------------

ALTER TABLE public.healer_journeys ADD COLUMN IF NOT EXISTS sent_to TEXT;
COMMENT ON COLUMN public.healer_journeys.sent_to IS
  'The address this journey''s latest email went to (0057). Null before 0057 unless filled from Resend.';

ALTER TABLE public.journey_messages ADD COLUMN IF NOT EXISTS sent_to TEXT;
COMMENT ON COLUMN public.journey_messages.sent_to IS
  'The address this email went to (0057).';


-- 2. The claim trigger leaves a replaced journey alone ----------------------

CREATE OR REPLACE FUNCTION public.stop_journey_on_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.linked_healer_slug IS NOT NULL
     AND NEW.linked_healer_slug IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.linked_healer_slug END) THEN
    UPDATE public.healer_journeys SET status = 'stopped', stop_reason = 'claimed'
      WHERE healer_slug = NEW.linked_healer_slug AND publisher_id IS NULL
        AND stop_reason IS DISTINCT FROM 'claimed'
        AND COALESCE(stop_reason, '') NOT IN ('asked_to_stop', 'removal_requested', 'suppressed', 'do_not_contact_email', 'replaced');
  END IF;
  IF NEW.linked_publisher_id IS NOT NULL
     AND NEW.linked_publisher_id IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.linked_publisher_id END) THEN
    UPDATE public.healer_journeys SET status = 'stopped', stop_reason = 'claimed'
      WHERE publisher_id = NEW.linked_publisher_id
        AND stop_reason IS DISTINCT FROM 'claimed'
        AND COALESCE(stop_reason, '') NOT IN ('asked_to_stop', 'removal_requested', 'suppressed', 'do_not_contact_email', 'replaced');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stop_journey_on_claim() FROM PUBLIC, anon, authenticated;


-- 3. Backfill: older journeys replaced by a newer one ------------------------

UPDATE public.healer_journeys j SET status = 'stopped', stop_reason = 'replaced'
WHERE j.channel = 'email'
  AND COALESCE(j.stop_reason, '') NOT IN ('asked_to_stop', 'removal_requested', 'suppressed', 'do_not_contact_email', 'replaced')
  AND EXISTS (
    SELECT 1 FROM public.healer_journeys newer
    WHERE newer.channel = 'email'
      AND newer.id <> j.id
      AND newer.started_at > j.started_at
      AND ((j.publisher_id IS NULL AND newer.publisher_id IS NULL AND newer.healer_slug = j.healer_slug)
        OR (j.publisher_id IS NOT NULL AND newer.publisher_id = j.publisher_id))
  );


-- Check -------------------------------------------------------------------
-- Expect on live: 2, 1, 1, 0 (Nigel Gee's 18 Nov journey replaced).
-- On dev: 2, 1, 0, 0.
--   sent_to columns, the trigger knows 'replaced', replaced journeys, and
--   listings with more than one email journey not replaced.

SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'sent_to'
      AND table_name IN ('healer_journeys', 'journey_messages')) AS sent_to_columns,
  (SELECT count(*) FROM pg_proc WHERE proname = 'stop_journey_on_claim' AND prosrc LIKE '%replaced%') AS trigger_knows_replaced,
  (SELECT count(*) FROM public.healer_journeys WHERE stop_reason = 'replaced') AS replaced,
  (SELECT count(*) FROM (
    SELECT COALESCE(publisher_id::text, healer_slug) FROM public.healer_journeys
    WHERE channel = 'email' AND stop_reason IS DISTINCT FROM 'replaced'
    GROUP BY 1 HAVING count(*) > 1) many) AS listings_with_two_live;
