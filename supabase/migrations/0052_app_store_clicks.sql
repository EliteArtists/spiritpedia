-- 0052: "Get the app" taps (owner, 16 Nov 2026;
-- docs/reports/2026-11-16-app-links-plan.md).
--
-- Dev first, then live. Safe to run twice.
--
-- How often someone tapped a link to the App Store or Google Play on the
-- website, per day, placement (footer, teacher page, …), store, kind of device
-- and action, and how often the Android "Get the app" strip or the welcome
-- card was closed. The same shape as the Amazon clicks in 0046: no user,
-- session or IP, and nothing that could show what any one person did. It
-- counts taps, not installs; the stores' own consoles say what was installed.
--
-- Written by ONE function, log_app_store_click(), which only the service role
-- may call: the website's /get-app/<store> redirect and /api/app-store-click
-- check the tap first. Read by Admin → Activity → Get the app, totals only.


-- 1. The table ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_store_clicks_daily (
  day       DATE NOT NULL,
  placement TEXT NOT NULL CHECK (placement IN ('footer', 'about', 'after_signup', 'welcome_email', 'teacher_page', 'library', 'android_banner', 'get_app_page')),
  store     TEXT NOT NULL CHECK (store IN ('app_store', 'google_play', 'both')),
  device    TEXT NOT NULL CHECK (device IN ('iphone', 'ipad', 'android', 'desktop', 'other')),
  action    TEXT NOT NULL CHECK (action IN ('tap', 'dismiss')),
  count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, placement, store, device, action)
);

COMMENT ON TABLE public.app_store_clicks_daily IS
  'Taps on the website''s App Store / Google Play links, and closes of the Android strip and welcome card, per day, placement, store, kind of device and action. Taps, not installs. No user, session or IP. Kept 25 months. Service role only.';

ALTER TABLE public.app_store_clicks_daily ENABLE ROW LEVEL SECURITY;


-- 2. The only writer ---------------------------------------------------------
-- 'both' is a store only for a dismiss (a card that showed both badges).

CREATE OR REPLACE FUNCTION public.log_app_store_click(p_placement TEXT, p_store TEXT, p_device TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_placement IS NULL OR p_placement NOT IN ('footer', 'about', 'after_signup', 'welcome_email', 'teacher_page', 'library', 'android_banner', 'get_app_page')
     OR p_action IS NULL OR p_action NOT IN ('tap', 'dismiss')
     OR p_store IS NULL OR p_store NOT IN ('app_store', 'google_play', 'both')
     OR (p_store = 'both' AND p_action <> 'dismiss')
     OR p_device IS NULL OR p_device NOT IN ('iphone', 'ipad', 'android', 'desktop', 'other') THEN
    RETURN false;
  END IF;

  INSERT INTO public.app_store_clicks_daily AS c (day, placement, store, device, action, count)
  VALUES ((now() AT TIME ZONE 'UTC')::date, p_placement, p_store, p_device, p_action, 1)
  ON CONFLICT (day, placement, store, device, action) DO UPDATE SET count = c.count + 1;
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.log_app_store_click(TEXT, TEXT, TEXT, TEXT) IS
  'The only writer of app_store_clicks_daily. Service role only (the website''s /get-app/<store> and /api/app-store-click).';

REVOKE ALL ON FUNCTION public.log_app_store_click(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_app_store_click(TEXT, TEXT, TEXT, TEXT) TO service_role;


-- 3. Admin's read (totals only; service role only) ---------------------------

CREATE OR REPLACE FUNCTION public.app_store_clicks_totals(p_from DATE, p_to DATE)
RETURNS TABLE (placement TEXT, store TEXT, device TEXT, action TEXT, total BIGINT)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT c.placement, c.store, c.device, c.action, sum(c.count) AS total
    FROM public.app_store_clicks_daily c
   WHERE c.day BETWEEN p_from AND p_to
   GROUP BY c.placement, c.store, c.device, c.action;
$$;

REVOKE ALL ON FUNCTION public.app_store_clicks_totals(DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_store_clicks_totals(DATE, DATE) TO service_role;


-- 4. Retention: 25 months, like the Amazon clicks ----------------------------
-- Run by the daily /api/cron/activity-purge, which reads null until this runs.

CREATE OR REPLACE FUNCTION public.purge_app_store_clicks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_rows INTEGER;
BEGIN
  DELETE FROM public.app_store_clicks_daily WHERE day < (current_date - interval '25 months')::date;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_app_store_clicks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_app_store_clicks() TO service_role;


-- Check: the table exists and is empty until the first tap; the writer and the
-- read exist (expected on dev and live straight after running: 0, true, true).
SELECT
  (SELECT count(*) FROM public.app_store_clicks_daily) AS clicks_rows,
  (SELECT count(*) = 1 FROM pg_proc WHERE proname = 'log_app_store_click') AS writer_exists,
  (SELECT count(*) = 1 FROM pg_proc WHERE proname = 'app_store_clicks_totals') AS read_exists;
