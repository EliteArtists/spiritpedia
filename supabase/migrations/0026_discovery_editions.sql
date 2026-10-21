-- 0026 — personal discovery editions for explorers (docs/emails.md, B3).
--
-- One row per edition the system builds for a person: sent, skipped because
-- there wasn't enough, failed, or a test-send from the admin preview. It holds
-- WHAT was picked (references, not copies of the content and not the HTML), so
-- that:
--   - later editions never repeat a featured discovery, and not the other
--     picks within three editions;
--   - "View this edition online" can draw the edition again from its token,
--     until view_expires_at;
--   - the admin's send log can say what went, and why a section was left out;
--   - the monthly cadence (edition 2 onwards, not built yet) can count from
--     the last edition sent and skip a month when there isn't enough new.
--
-- Each pick records its source. A pick that came from activity learning
-- ('learning') is never shown to the team: the Privacy Policy promises that
-- what is learned is never shown to them, so the admin's preview and log hide
-- it.
--
-- Service role only (RLS on, no policies), like email_sends. Deleted with the
-- account. No existing policy changes.
--
-- Dev first, then live. Run once; it's safe to run again.


CREATE TABLE IF NOT EXISTS public.discovery_editions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 1 for the Day 10 edition, then 2, 3 … A skipped attempt carries the
  -- number it would have had; only a sent edition uses the number up.
  edition_number   INTEGER NOT NULL CHECK (edition_number >= 1),
  status           TEXT NOT NULL,
  -- For a skipped edition: why ('not_enough', …). For a failed one: the error.
  status_reason    TEXT,
  -- [{ "section": "featured" | "videos" | "nearby" | "teacher" | "free",
  --    "type": "healer" | "video" | "free_resource",
  --    "ref": "<slug or id>",
  --    "subject": "<subject slug or null>",
  --    "source": "more_of" | "saves" | "learning" | "popular" | "area" | "online",
  --    "reason": "<which approved 'why' line>" }]
  picks            JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Sections looked at and left out, with why: { "nearby": "no_area_no_online", … }
  dropped          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at          TIMESTAMPTZ,
  -- "View this edition online". Not guessable; the page shows no name.
  view_token       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  view_expires_at  TIMESTAMPTZ,
  CONSTRAINT discovery_editions_status_known
    CHECK (status IN ('sent', 'skipped', 'failed', 'test')),
  CONSTRAINT discovery_editions_picks_is_list
    CHECK (jsonb_typeof(picks) = 'array'),
  CONSTRAINT discovery_editions_sent_has_time
    CHECK (status <> 'sent' OR sent_at IS NOT NULL)
);

COMMENT ON TABLE public.discovery_editions IS
  'Each personal discovery edition built for an explorer: sent, skipped, failed or an admin test (0026). Holds references to what was picked and why, never the HTML. Picks with source learning are never shown to the team. Service role only: RLS on, no policies. Deleted with the account.';

-- Edition n goes to a person once.
CREATE UNIQUE INDEX IF NOT EXISTS discovery_editions_one_sent_per_number
  ON public.discovery_editions (user_id, edition_number)
  WHERE status = 'sent';

-- "Their last editions", for the repeat rules and the monthly cadence.
CREATE INDEX IF NOT EXISTS discovery_editions_by_person
  ON public.discovery_editions (user_id, created_at DESC);

ALTER TABLE public.discovery_editions ENABLE ROW LEVEL SECURITY;


-- Check -------------------------------------------------------------------
-- Expect: true, true, 0, 2.

SELECT
  to_regclass('public.discovery_editions') IS NOT NULL AS editions_table,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.discovery_editions'::regclass) AS editions_rls,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discovery_editions') AS editions_policies,
  (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'discovery_editions'
     AND indexname IN ('discovery_editions_one_sent_per_number', 'discovery_editions_by_person')) AS editions_indexes;
