CREATE TABLE IF NOT EXISTS public.healer_journeys (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  healer_slug      TEXT NOT NULL REFERENCES public.healers(healer_slug) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'running',
  stop_reason      TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_1_sent_at  TIMESTAMPTZ,
  email_2_sent_at  TIMESTAMPTZ,
  email_3_sent_at  TIMESTAMPTZ,
  email_4_sent_at  TIMESTAMPTZ,
  email_5_sent_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT healer_journeys_status_known CHECK (status IN ('running', 'paused', 'stopped'))
);

COMMENT ON TABLE public.healer_journeys IS
  'Outreach sequence to practitioners who have a listing but have not claimed it. Five emails at 0, 21, 42, 63 and 84 days. Service role only: there are no policies, as with admin_notes.';

COMMENT ON COLUMN public.healer_journeys.status IS
  'running, paused or stopped. Only running journeys are considered by the daily cron.';

COMMENT ON COLUMN public.healer_journeys.stop_reason IS
  'Why it ended. claimed and healer_removed are set automatically; sequence_complete when email 5 has gone; anything else is typed by an admin.';

COMMENT ON COLUMN public.healer_journeys.started_at IS
  'The clock every later email is measured from, NOT created_at. Days 21, 42, 63 and 84 are counted from here.';

-- ONE ACTIVE JOURNEY PER HEALER, AND AS MANY FINISHED ONES AS YOU LIKE.
--
-- A plain UNIQUE on healer_slug would make "restart" impossible: the second
-- journey would collide with the first forever, so either restarting fails or
-- the history has to be destroyed to allow it. A partial index says what is
-- actually meant — a healer may not be in two live sequences at once — while
-- leaving every stopped journey in place as a record of what was sent and why
-- it ended.
--
-- This is also what makes the start route's 409 correct: the conflict fires
-- only when a running or paused journey already exists.
CREATE UNIQUE INDEX IF NOT EXISTS healer_journeys_one_active_idx
  ON public.healer_journeys (healer_slug)
  WHERE status <> 'stopped';

CREATE INDEX IF NOT EXISTS healer_journeys_due_idx
  ON public.healer_journeys (status, started_at);

ALTER TABLE public.healer_journeys ENABLE ROW LEVEL SECURITY;

-- NO POLICIES, deliberately. RLS is on and nothing is granted, so the anon and
-- authenticated keys read nothing and write nothing. Every access goes through
-- the service role on the server. Same shape as admin_notes: this is a record
-- of what was sent to somebody, and the somebody must not be able to read it.
DROP POLICY IF EXISTS "Public read healer_journeys" ON public.healer_journeys;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'healer_journeys'
ORDER BY ordinal_position;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'healer_journeys';
