-- 0046: Amazon "buy" clicks (owner, 11 Nov 2026).
--
-- Dev first, then live. Safe to run twice.
--
-- How often someone tapped a "Buy on Amazon" button (a book's, or an offering
-- whose link is an Amazon product), per day, platform and Amazon store. The
-- same shape as the anonymous totals in 0021: no user, device, session or IP,
-- and nothing that could show what any one person did. It counts clicks, not
-- purchases; Amazon's own reports say what sold.
--
-- Written by ONE function, log_amazon_click(), which only the service role may
-- call: the website's /api/amazon-click route checks the click first. The app
-- sends the same call in 1.0.2. Read by Admin → Activity, totals only.


-- 1. The table ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.amazon_clicks_daily (
  day          DATE NOT NULL,
  platform     TEXT NOT NULL CHECK (platform IN ('web', 'app')),
  content_type TEXT NOT NULL CHECK (content_type IN ('book', 'course')),
  content_slug TEXT NOT NULL CHECK (char_length(content_slug) BETWEEN 1 AND 200),
  store        TEXT NOT NULL CHECK (store ~ '^amazon\.[a-z.]{2,8}$'),
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, platform, content_type, content_slug, store)
);

COMMENT ON TABLE public.amazon_clicks_daily IS
  'Taps on a Buy on Amazon button, per day, platform, item and Amazon store (amazon.com, amazon.co.uk, …). Clicks, not sales. No user, device, session or IP. Kept 25 months. Service role only.';

ALTER TABLE public.amazon_clicks_daily ENABLE ROW LEVEL SECURITY;


-- 2. The only writer ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_amazon_click(p_platform TEXT, p_content_type TEXT, p_content_slug TEXT, p_store TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_platform NOT IN ('web', 'app')
     OR p_content_type NOT IN ('book', 'course')
     OR p_content_slug IS NULL OR p_content_slug !~ '^[a-z0-9][a-z0-9-]{0,199}$'
     OR p_store IS NULL OR p_store !~ '^amazon\.[a-z.]{2,8}$' THEN
    RETURN false;
  END IF;

  INSERT INTO public.amazon_clicks_daily AS c (day, platform, content_type, content_slug, store, count)
  VALUES ((now() AT TIME ZONE 'UTC')::date, p_platform, p_content_type, p_content_slug, p_store, 1)
  ON CONFLICT (day, platform, content_type, content_slug, store) DO UPDATE SET count = c.count + 1;
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.log_amazon_click(TEXT, TEXT, TEXT, TEXT) IS
  'The only writer of amazon_clicks_daily. Service role only (the website''s /api/amazon-click).';

REVOKE ALL ON FUNCTION public.log_amazon_click(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_amazon_click(TEXT, TEXT, TEXT, TEXT) TO service_role;


-- 3. Admin's read (totals only; service role only) ---------------------------
-- p_platform: 'web', 'app', or NULL for both.

CREATE OR REPLACE FUNCTION public.amazon_clicks_top(p_from DATE, p_to DATE, p_platform TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (content_type TEXT, content_slug TEXT, store TEXT, total BIGINT)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT c.content_type, c.content_slug, c.store, sum(c.count) AS total
    FROM public.amazon_clicks_daily c
   WHERE c.day BETWEEN p_from AND p_to
     AND (p_platform IS NULL OR c.platform = p_platform)
   GROUP BY c.content_type, c.content_slug, c.store
   ORDER BY total DESC, c.content_slug
   LIMIT least(coalesce(p_limit, 20), 100);
$$;

REVOKE ALL ON FUNCTION public.amazon_clicks_top(DATE, DATE, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.amazon_clicks_top(DATE, DATE, TEXT, INTEGER) TO service_role;


-- 4. Retention: 25 months, like activity_daily -------------------------------
-- Folded into purge_activity() would change 0021's function; a separate one is
-- simpler. Run by the same daily cron once it is wired (see README §18).

CREATE OR REPLACE FUNCTION public.purge_amazon_clicks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_rows INTEGER;
BEGIN
  DELETE FROM public.amazon_clicks_daily WHERE day < (current_date - interval '25 months')::date;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_amazon_clicks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_amazon_clicks() TO service_role;


-- Check: the table exists and is empty until the first click; the writer and the
-- read exist (expected on dev and live straight after running: 0, true, true).
SELECT
  (SELECT count(*) FROM public.amazon_clicks_daily) AS clicks_rows,
  (SELECT count(*) = 1 FROM pg_proc WHERE proname = 'log_amazon_click') AS writer_exists,
  (SELECT count(*) = 1 FROM pg_proc WHERE proname = 'amazon_clicks_top') AS read_exists;
