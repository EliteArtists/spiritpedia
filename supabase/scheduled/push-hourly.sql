-- The push notifications' hourly run, called by Supabase (owner's choice,
-- 3 Nov 2026: Vercel's Hobby plan allows daily crons only).
--
-- LIVE ONLY, and only after migration 0032 is on live and the website with
-- /api/cron/push is deployed. Dev has no deployed website to call; on dev the
-- run is started by hand (README §9.11).
--
-- Before running: Supabase → Database → Extensions → turn on pg_cron and
-- pg_net (both free). Then replace PASTE_CRON_SECRET_HERE below with the
-- CRON_SECRET from Vercel → Settings → Environment Variables, run the whole
-- file once in the SQL editor, and DON'T save the query with the secret in
-- it. The secret is kept in Supabase Vault, encrypted, not in the job.
--
-- Safe to run again: the secret and the job are replaced, not duplicated.

-- 1. The secret, in Vault.
DO $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'cron_secret';
  IF v_id IS NULL THEN
    PERFORM vault.create_secret('PASTE_CRON_SECRET_HERE', 'cron_secret', 'CRON_SECRET for /api/cron/push');
  ELSE
    PERFORM vault.update_secret(v_id, 'PASTE_CRON_SECRET_HERE');
  END IF;
END $$;

-- 2. At five past every hour, call the website's run.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'push-hourly';

SELECT cron.schedule(
  'push-hourly',
  '5 * * * *',
  $job$
    SELECT net.http_get(
      url := 'https://www.spiritpedia.co/api/cron/push',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
      ),
      timeout_milliseconds := 60000
    );
  $job$
);

-- Check -------------------------------------------------------------------
-- Expect one row: push-hourly, 5 * * * *, true.
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'push-hourly';

-- Later, to see the last runs (status 200 means it ran):
--   SELECT status_code, created FROM net._http_response ORDER BY created DESC LIMIT 5;
