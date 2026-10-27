-- Broken-image check, round two: video thumbnails, placeholder pictures, and a
-- record of every run.
--
-- 1. VIDEOS JOIN THE QUEUE. A video has no image column; its thumbnail is
--    img.youtube.com/vi/<id>/mqdefault.jpg, which answers 404 once the video is
--    deleted or made private. The check now asks, and a 404 is queued as
--    "video removed". The CHECK on table_name gains 'videos'.
--
-- 2. WHAT KIND OF PROBLEM. `problem` says what the row is:
--      broken         the picture does not load (every row before this one)
--      placeholder    it loads, but it is a stand-in, e.g. Goodreads'
--                     no-cover.png. A soft problem: listed, not counted in
--                     the Inbox badge.
--      video_removed  the YouTube video behind a videos row is gone.
--    Existing rows default to 'broken', which is what they are.
--
-- 3. A RECORD OF EVERY RUN. broken_image_runs keeps one row per scheduled run,
--    so the Inbox can say when the check last ran, which seventh it covered,
--    and whether it was cut short. Until 27 October 2026 every run checked the
--    same seventh and nothing showed it; this is so that cannot hide again.
--    Service role only, like broken_images. The check deletes runs older than
--    60 days.
--
-- RLS: both tables stay on with no policy (service role only). Nothing is
-- loosened.

ALTER TABLE public.broken_images
  DROP CONSTRAINT IF EXISTS broken_images_table_known;

ALTER TABLE public.broken_images
  ADD CONSTRAINT broken_images_table_known
  CHECK (table_name IN ('books', 'courses', 'free_resources', 'healers', 'videos'));

ALTER TABLE public.broken_images
  ADD COLUMN IF NOT EXISTS problem TEXT NOT NULL DEFAULT 'broken';

ALTER TABLE public.broken_images
  DROP CONSTRAINT IF EXISTS broken_images_problem_known;

ALTER TABLE public.broken_images
  ADD CONSTRAINT broken_images_problem_known
  CHECK (problem IN ('broken', 'placeholder', 'video_removed'));

COMMENT ON COLUMN public.broken_images.problem IS
  'broken: does not load. placeholder: loads but is a stand-in (soft, not in the badge). video_removed: the YouTube video is gone.';

CREATE TABLE IF NOT EXISTS public.broken_image_runs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ran_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shard         INTEGER,
  shards        INTEGER,
  checked       INTEGER,
  records       INTEGER,
  undetermined  INTEGER,
  skipped       INTEGER,
  broken        INTEGER,
  queued        INTEGER,
  recovered     INTEGER,
  elapsed_ms    INTEGER,
  error         TEXT
);

COMMENT ON TABLE public.broken_image_runs IS
  'One row per scheduled broken-image check, for the Inbox status line. Service role only: no policies.';

CREATE INDEX IF NOT EXISTS broken_image_runs_ran_at_idx
  ON public.broken_image_runs (ran_at DESC);

ALTER TABLE public.broken_image_runs ENABLE ROW LEVEL SECURITY;


/* ─────────────────────────────────────────────────────────────────────────
   CHECK — one row.
   Expect: videos_allowed = true, problem_column = 1, existing_rows_broken =
   every row in the queue, runs_table = 1, runs_rls = true, runs_policies = 0.
   ───────────────────────────────────────────────────────────────────────── */
SELECT
  (SELECT pg_get_constraintdef(oid) LIKE '%videos%' FROM pg_constraint
    WHERE conname = 'broken_images_table_known')                         AS videos_allowed,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'broken_images'
      AND column_name = 'problem')                                       AS problem_column,
  (SELECT count(*) FROM public.broken_images WHERE problem = 'broken')  AS existing_rows_broken,
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'broken_image_runs')  AS runs_table,
  (SELECT relrowsecurity FROM pg_class
    WHERE oid = 'public.broken_image_runs'::regclass)                    AS runs_rls,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'broken_image_runs')     AS runs_policies;
