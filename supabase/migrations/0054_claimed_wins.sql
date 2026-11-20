-- 0054 — Claimed wins (owner, 20 Nov 2026).
--
-- 0053's claim trigger only stopped running or paused journeys. A journey
-- already marked replied (Cambridge Zen Center, replied 19 Nov, claimed
-- 20 Nov), contacted via form, complete or stopped kept its old reason, so
-- Admin → Outreach didn't count it as Claimed.
--
--   1. The trigger now marks every journey to the claimed listing or
--      publisher as stopped, 'claimed', whatever state it was in. replied_at
--      is left alone, so a reply before the claim still shows. The never-again
--      reasons (asked_to_stop, removal_requested, suppressed) keep their
--      reason, so the block outlives a revoked claim; the admin shows those
--      as Claimed all the same (utils/journey.js → journeyState).
--   2. Backfill: every journey to a listing or publisher that is claimed
--      today, on the same rule.
--
-- No grant or policy changes. Dev first, then live. Safe to run again.
-- Check row at the end.


-- 1. The trigger -----------------------------------------------------------

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
        AND COALESCE(stop_reason, '') NOT IN ('asked_to_stop', 'removal_requested', 'suppressed');
  END IF;
  IF NEW.linked_publisher_id IS NOT NULL
     AND NEW.linked_publisher_id IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.linked_publisher_id END) THEN
    UPDATE public.healer_journeys SET status = 'stopped', stop_reason = 'claimed'
      WHERE publisher_id = NEW.linked_publisher_id
        AND stop_reason IS DISTINCT FROM 'claimed'
        AND COALESCE(stop_reason, '') NOT IN ('asked_to_stop', 'removal_requested', 'suppressed');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stop_journey_on_claim() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_profiles_stop_journey_on_claim ON public.user_profiles;
CREATE TRIGGER user_profiles_stop_journey_on_claim
  AFTER INSERT OR UPDATE OF linked_healer_slug, linked_publisher_id ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.stop_journey_on_claim();


-- 2. Backfill --------------------------------------------------------------

UPDATE public.healer_journeys j SET status = 'stopped', stop_reason = 'claimed'
WHERE j.stop_reason IS DISTINCT FROM 'claimed'
  AND COALESCE(j.stop_reason, '') NOT IN ('asked_to_stop', 'removal_requested', 'suppressed')
  AND EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE (j.publisher_id IS NULL AND p.linked_healer_slug = j.healer_slug)
       OR (j.publisher_id IS NOT NULL AND p.linked_publisher_id = j.publisher_id)
  );


-- Check -------------------------------------------------------------------
-- Expect on live: 1, 0, 2, 1 (Mike Maher and Cambridge Zen Center claimed,
-- Cambridge Zen Center's reply date kept). On dev: 1, 0, 0, 0.

SELECT
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'user_profiles_stop_journey_on_claim') AS claim_trigger,
  (SELECT count(*) FROM public.healer_journeys j
    WHERE j.stop_reason IS DISTINCT FROM 'claimed'
      AND COALESCE(j.stop_reason, '') NOT IN ('asked_to_stop', 'removal_requested', 'suppressed')
      AND EXISTS (SELECT 1 FROM public.user_profiles p
        WHERE (j.publisher_id IS NULL AND p.linked_healer_slug = j.healer_slug)
           OR (j.publisher_id IS NOT NULL AND p.linked_publisher_id = j.publisher_id))) AS claimed_not_marked,
  (SELECT count(*) FROM public.healer_journeys WHERE stop_reason = 'claimed') AS marked_claimed,
  (SELECT count(*) FROM public.healer_journeys WHERE stop_reason = 'claimed' AND replied_at IS NOT NULL) AS claimed_after_reply;
