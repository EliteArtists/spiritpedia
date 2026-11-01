-- 0031 — shared offering links (owner decision, 1 Nov 2026).
--
-- A hub often has one page for a programme several teachers lead (IMS's
-- Forest Refuge schedule, a shared online course). Until now courses.course_url
-- was unique across the whole table, so only the first teacher could have it.
-- Now the same link may sit on more than one listing, but still only once per
-- listing:
--
--   courses_url_unique (course_url)  →  courses_url_healer_unique (course_url, healer_id)
--
-- No rows change, and no grants or policies change.
--
-- Dev first, then live. Run once; it's safe to run again.


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_url_healer_unique') THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_url_healer_unique UNIQUE (course_url, healer_id);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_url_unique') THEN
    ALTER TABLE public.courses DROP CONSTRAINT courses_url_unique;
  END IF;
END $$;
