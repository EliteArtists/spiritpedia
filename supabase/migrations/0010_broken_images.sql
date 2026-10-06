-- Broken image audit queue.
--
-- ALREADY APPLIED IN PRODUCTION. This file is the migration record, not the
-- act: the table was created by hand in the Supabase SQL editor on 2026-10-06
-- and this is the same DDL, written idempotently so re-running it against that
-- database is a no-op rather than an error.
--
-- WHAT IT IS FOR. 2,513 rows across books, courses and free_resources point at
-- an image on somebody else's host, and 577 of them point at
-- encrypted-tbn0.gstatic.com — Google's image cache rather than a publisher's
-- own server. Those resolve today. Nothing will announce the day they stop:
-- the public cards fall back to a placeholder and say nothing, so a shelf
-- quietly empties of pictures and the first report is a visitor's. A daily
-- audit writes its failures here and the admin Inbox reads them.
--
-- AMENDED. The CHECK constraint below names the three content tables, which is
-- what was applied first. Healer profile photos were added to the audit
-- afterwards and the constraint was altered in production to accept a fourth
-- table_name, 'healers'. That ALTER is the second statement in this file
-- rather than an edit to the CREATE above, so the file reads in the order the
-- database actually received it and re-running it still lands on the live
-- schema either way.

CREATE TABLE IF NOT EXISTS public.broken_images (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name    TEXT NOT NULL,
  record_id     TEXT NOT NULL,
  healer_slug   TEXT,
  title         TEXT,
  image_url     TEXT NOT NULL,
  status_code   INTEGER,
  failures      INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT broken_images_table_known
    CHECK (table_name IN ('books', 'courses', 'free_resources')),
  -- One row per content record, which is what lets the audit upsert on
  -- (table_name, record_id) instead of reading before every write.
  CONSTRAINT broken_images_one_per_record UNIQUE (table_name, record_id)
);

COMMENT ON TABLE public.broken_images IS
  'Images that failed their most recent audit. Service role only: no policies, as with healer_journeys and admin_notes.';

-- TEXT, NOT BIGINT, and this is the one column that would have had to be
-- migrated later if it were guessed. books.id is a bigint (371), but
-- courses.id and free_resources.id are UUIDs
-- ('683fcedb-86ed-429a-b25f-5b756c11c003'). One column holds all three, so it
-- holds them as text.
COMMENT ON COLUMN public.broken_images.record_id IS
  'TEXT because books.id is a bigint while courses.id and free_resources.id are UUIDs.';

-- Resolved at audit time so the Inbox row can link straight to the healer's
-- Content tab without a second query. NULLABLE because only books carry the
-- slug on the row itself — courses and free resources reach it through
-- healer_id, and an orphaned row with no matching healer would otherwise fail
-- the insert and lose the finding entirely.
COMMENT ON COLUMN public.broken_images.healer_slug IS
  'Resolved at audit time. Nullable: only books carry the slug directly; courses and free resources join healers through healer_id.';

COMMENT ON COLUMN public.broken_images.failures IS
  'Consecutive failed audits. The queue reads failures >= 2 so a single network blip cannot fill the inbox.';

CREATE INDEX IF NOT EXISTS broken_images_healer_idx
  ON public.broken_images (healer_slug);

CREATE INDEX IF NOT EXISTS broken_images_detected_idx
  ON public.broken_images (detected_at DESC);

-- RLS on with no policy at all, which is deny-by-default for the anon and
-- authenticated roles: the service role bypasses RLS, and nothing else should
-- read a maintenance queue. Same posture as healer_journeys and admin_notes.
ALTER TABLE public.broken_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read broken_images" ON public.broken_images;

/* ─────────────────────────────────────────────────────────────────────────
   AMENDMENT — healer profile photos join the audit.
   Applied in production after the table was already live.
   ───────────────────────────────────────────────────────────────────────── */

-- A healer's portrait is the first thing a visitor sees, and it is the most
-- exposed image on the site: 274 of 377 point at encrypted-tbn0.gstatic.com,
-- against 23% for content images.
--
-- It is not one column but three URLs. healers.image_urls is a text ARRAY and
-- every element is on screen — the healer page runs a crossfade rotator over
-- all three and the homepage card picks one by an index seeded on the active
-- subject filter. record_id stays healers.id::text and one row covers the
-- record, because a healer with a dead portrait is one healer to go and fix.
ALTER TABLE public.broken_images
  DROP CONSTRAINT IF EXISTS broken_images_table_known;

ALTER TABLE public.broken_images
  ADD CONSTRAINT broken_images_table_known
  CHECK (table_name IN ('books', 'courses', 'free_resources', 'healers'));
