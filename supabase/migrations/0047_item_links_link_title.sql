-- 0047 — items are unique on link + title (owner decision, 11 Nov 2026).
--
-- When one real page sells several things (five audiobooks on one Audible
-- author page, two seminars on one booking page), only the first could be
-- listed, because the link alone had to be unique. Sprints worked round it by
-- inventing #fragments, which the owner has stopped. Now two different things
-- on one page can both be listed with the page's real link; the same thing
-- still can't go in twice:
--
--   courses_url_healer_unique (course_url, healer_id)
--     →  courses_url_healer_title_unique (course_url, healer_id, title)
--   free_resources_url_unique (resource_url)
--     →  free_resources_url_title_unique (resource_url, title)
--
-- The link stays the first column, so looking an item up by its link (the
-- ingest's duplicate check, the admin) still uses the index. Titles are NOT
-- NULL in both tables, so the new keys are as strict as they read. Every row
-- that satisfies the old key satisfies the new one: no rows change, and no
-- grants or policies change. scripts/ingest.mjs already checks link + title.
--
-- Dev first, then live. Run once; it's safe to run again.


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_url_healer_title_unique') THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_url_healer_title_unique UNIQUE (course_url, healer_id, title);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_url_healer_unique') THEN
    ALTER TABLE public.courses DROP CONSTRAINT courses_url_healer_unique;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'free_resources_url_title_unique') THEN
    ALTER TABLE public.free_resources
      ADD CONSTRAINT free_resources_url_title_unique UNIQUE (resource_url, title);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'free_resources_url_unique') THEN
    ALTER TABLE public.free_resources DROP CONSTRAINT free_resources_url_unique;
  END IF;
END $$;


-- Check: the new keys are in, the old ones gone (expected on dev and live: 2, 0).
SELECT
  (SELECT count(*) FROM pg_constraint
    WHERE conname IN ('courses_url_healer_title_unique', 'free_resources_url_title_unique')) AS new_keys,
  (SELECT count(*) FROM pg_constraint
    WHERE conname IN ('courses_url_healer_unique', 'free_resources_url_unique')) AS old_keys;
