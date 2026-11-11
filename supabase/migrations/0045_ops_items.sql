-- 0045: Ops items (owner, 11 Nov 2026).
--
-- Dev first, then live. Safe to run twice.
--
-- What the content work leaves waiting lives in the repo, which the live site
-- can't read: plans held for the owner, listings on dev that never reached
-- live, the README's retry list and the sprint reports. scripts/ops-sync.mjs
-- reads the repo and both databases and writes them here, replacing the last
-- sync whole; Admin → Ops shows them. Nothing here is a source of truth: the
-- plan files and the README are, and the next sync overwrites every row.
--
-- Service role only (RLS on, no policies): written by the sync script, read by
-- the website's /api/admin/ops.


CREATE TABLE IF NOT EXISTS public.ops_items (
  id          BIGSERIAL PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('held_plan', 'dev_only_plan', 'retry', 'sprint_report', 'sync_run')),
  item_key    TEXT NOT NULL,           -- what makes the row unique within its kind: a path, a slug, a name
  title       TEXT NOT NULL,
  slug        TEXT,                    -- the listing's healer_slug, when there is one
  reason      TEXT,                    -- why it's held, what to retry, a report's first line
  path        TEXT,                    -- the file in the repo, relative to its root
  source_date DATE,                    -- the plan's sprint day or the report's date, when known
  detail      JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind, item_key)
);

COMMENT ON TABLE public.ops_items IS
  'Admin → Ops: held plans, dev-only listings, the retry list and sprint reports, copied from the repo by scripts/ops-sync.mjs. Replaced whole on every sync; the repo is the source of truth. Service role only.';

CREATE INDEX IF NOT EXISTS ops_items_kind_idx ON public.ops_items (kind, source_date DESC NULLS LAST);

ALTER TABLE public.ops_items ENABLE ROW LEVEL SECURITY;


-- Check: the table is in and empty until the first sync (expected on dev and
-- live straight after running: 0 rows, RLS on).
SELECT
  (SELECT count(*) FROM public.ops_items) AS ops_rows,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.ops_items'::regclass) AS rls_on;
