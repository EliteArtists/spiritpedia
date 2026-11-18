-- 0053 — Owner requests (owner, 18 Nov 2026).
--
--   1. listing_locks — the "keep minimal" lock. A listing whose owner asked
--      for changes or removals is locked so that no sprint, restore, image
--      fix or ingest adds items back. Set and cleared in Admin → Content →
--      listing → Content; shown there and in Admin → Ops. Service role only.
--   2. Items can't be added to a locked listing. A trigger on videos, books,
--      courses and free_resources refuses the insert, whatever sends it (the
--      scripts check first and say so; this is the backstop).
--   3. admin_edit_log — every change made in Admin → Content → listing →
--      Content: what changed, before and after, and when. Service role only:
--      RLS on, no policies.
--   4. A claim stops the listing's journey. When an account is linked to a
--      listing (an instant claim, or an admin approving one), any running or
--      paused journey to it is stopped with stop_reason 'claimed' at once,
--      not at the next daily run.
--   5. Andrea Kennedy is locked (her items were removed on 18 Nov 2026).
--
-- No existing grant or policy changes. Dev first, then live. Run once; it's
-- safe to run again. Check row at the end.


-- 1. The lock -------------------------------------------------------------
-- Its own table rather than columns on healers: healers is public, and the
-- note is the admin's. One row per locked listing; switching the lock off
-- deletes the row (the edit log keeps the history).

CREATE TABLE IF NOT EXISTS public.listing_locks (
  healer_slug TEXT PRIMARY KEY REFERENCES public.healers(healer_slug) ON UPDATE CASCADE ON DELETE CASCADE,
  note        TEXT NOT NULL,
  locked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_by   TEXT
);

COMMENT ON TABLE public.listing_locks IS
  'Listings locked "keep minimal" (0053), e.g. at the owner''s request: while a row is here no video, book, offering or free resource can be added. Set in Admin → Content → listing → Content; shown there and in Admin → Ops. Service role only: RLS on, no policies.';

ALTER TABLE public.listing_locks ENABLE ROW LEVEL SECURITY;


-- 2. Nothing added to a locked listing ------------------------------------

CREATE OR REPLACE FUNCTION public.refuse_items_on_locked_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked RECORD;
BEGIN
  IF TG_TABLE_NAME IN ('videos', 'books') THEN
    SELECT h.name, l.note INTO locked FROM public.listing_locks l
      JOIN public.healers h ON h.healer_slug = l.healer_slug
      WHERE l.healer_slug = NEW.healer_slug;
  ELSE
    SELECT h.name, l.note INTO locked FROM public.listing_locks l
      JOIN public.healers h ON h.healer_slug = l.healer_slug
      WHERE h.id = NEW.healer_id;
  END IF;
  IF FOUND THEN
    RAISE EXCEPTION 'listing_locked: % is locked (%). Switch the lock off in Admin → Content first.',
      locked.name, locked.note
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.refuse_items_on_locked_listing() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS videos_refuse_locked ON public.videos;
CREATE TRIGGER videos_refuse_locked BEFORE INSERT ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.refuse_items_on_locked_listing();
DROP TRIGGER IF EXISTS books_refuse_locked ON public.books;
CREATE TRIGGER books_refuse_locked BEFORE INSERT ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.refuse_items_on_locked_listing();
DROP TRIGGER IF EXISTS courses_refuse_locked ON public.courses;
CREATE TRIGGER courses_refuse_locked BEFORE INSERT ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.refuse_items_on_locked_listing();
DROP TRIGGER IF EXISTS free_resources_refuse_locked ON public.free_resources;
CREATE TRIGGER free_resources_refuse_locked BEFORE INSERT ON public.free_resources
  FOR EACH ROW EXECUTE FUNCTION public.refuse_items_on_locked_listing();


-- 3. The edit log ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_edit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  healer_slug TEXT NOT NULL,
  -- videos, books, courses, free_resources or listing_locks.
  table_name  TEXT NOT NULL,
  -- The row changed; null for a change to several rows at once.
  record_id   TEXT,
  action      TEXT NOT NULL CHECK (action IN ('edit', 'remove', 'remove_all', 'lock', 'unlock')),
  summary     TEXT NOT NULL,
  -- The row (or rows) before, and the changed fields after. Enough to put
  -- back by hand anything removed.
  before      JSONB,
  after       JSONB,
  note        TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_edit_log_listing_idx
  ON public.admin_edit_log (healer_slug, created_at DESC);

COMMENT ON TABLE public.admin_edit_log IS
  'Changes made in Admin → Content → listing (0053): edits and removals of videos, books, offerings and free resources, and the keep-minimal lock, with the rows before. Service role only: RLS on, no policies.';

ALTER TABLE public.admin_edit_log ENABLE ROW LEVEL SECURITY;


-- 4. A claim stops the journey --------------------------------------------

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
      WHERE healer_slug = NEW.linked_healer_slug AND status IN ('running', 'paused');
  END IF;
  IF NEW.linked_publisher_id IS NOT NULL
     AND NEW.linked_publisher_id IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.linked_publisher_id END) THEN
    UPDATE public.healer_journeys SET status = 'stopped', stop_reason = 'claimed'
      WHERE publisher_id = NEW.linked_publisher_id AND status IN ('running', 'paused');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stop_journey_on_claim() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_profiles_stop_journey_on_claim ON public.user_profiles;
CREATE TRIGGER user_profiles_stop_journey_on_claim
  AFTER INSERT OR UPDATE OF linked_healer_slug, linked_publisher_id ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.stop_journey_on_claim();

-- Anything claimed before this ran and still running.
UPDATE public.healer_journeys j SET status = 'stopped', stop_reason = 'claimed'
  WHERE j.status IN ('running', 'paused')
    AND EXISTS (SELECT 1 FROM public.user_profiles p
      WHERE (j.healer_slug IS NOT NULL AND p.linked_healer_slug = j.healer_slug)
         OR (j.publisher_id IS NOT NULL AND p.linked_publisher_id = j.publisher_id));


-- 5. Andrea Kennedy -------------------------------------------------------

INSERT INTO public.listing_locks (healer_slug, note, locked_at, locked_by)
SELECT 'andrea-kennedy', 'owner request — keep minimal (18 Nov 2026)', '2026-11-18T14:45:00Z', 'migration 0053'
WHERE EXISTS (SELECT 1 FROM public.healers WHERE healer_slug = 'andrea-kennedy')
ON CONFLICT (healer_slug) DO NOTHING;

INSERT INTO public.admin_edit_log (healer_slug, table_name, action, summary, note, created_by, created_at)
SELECT 'andrea-kennedy', 'healers', 'lock', 'Locked: keep minimal',
  'Owner request, 18 Nov 2026: 6 offerings and 3 free resources removed, bio shortened, website kept. Backups in docs/owner-requests/.',
  'migration 0053', '2026-11-18T14:45:00Z'
WHERE EXISTS (SELECT 1 FROM public.healers WHERE healer_slug = 'andrea-kennedy')
  AND NOT EXISTS (SELECT 1 FROM public.admin_edit_log WHERE healer_slug = 'andrea-kennedy' AND action = 'lock');


-- Check -------------------------------------------------------------------
-- Expect: true, 4, true, 1, 1, 0 (Andrea Kennedy is the one lock).

SELECT
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.listing_locks'::regclass) AS locks_rls_on,
  (SELECT count(*) FROM pg_trigger WHERE tgname IN
    ('videos_refuse_locked', 'books_refuse_locked', 'courses_refuse_locked', 'free_resources_refuse_locked')) AS lock_triggers,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.admin_edit_log'::regclass) AS log_rls_on,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'user_profiles_stop_journey_on_claim') AS claim_trigger,
  (SELECT count(*) FROM public.listing_locks) AS locked_listings,
  (SELECT count(*) FROM public.healer_journeys j WHERE j.status = 'running'
    AND EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.linked_healer_slug = j.healer_slug
      OR (j.publisher_id IS NOT NULL AND p.linked_publisher_id = j.publisher_id))) AS running_but_claimed;
