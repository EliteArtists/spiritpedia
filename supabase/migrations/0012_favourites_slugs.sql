-- 0012 — every user_favourites.content_slug becomes a slug.
--
-- Until October 2026 the website's hearts stored whatever identifier was to
-- hand, and signing in copied it into this table as it was: the numeric id for
-- books (from cards) and videos, the UUID for courses and free resources, and
-- the slug for healers, publishers and books saved from the book page. The app
-- saves slugs, so the two could never agree. This rewrites every id to its
-- slug; the website now saves slugs too (utils/favorites.js).
--
-- Also records 'book_read' — a book marked as read — as a content type. There
-- is no CHECK constraint on content_type, so that is a comment change only.
--
-- SAFE TO RE-RUN: a second run finds nothing left to convert. Rows whose id
-- matches no content (since deleted) are left untouched. Where converting would
-- duplicate a slug the same person already saved, the converted copy is
-- dropped — the save itself is kept.
--
-- Counted read-only against production on 10 Oct 2026: 11 rows, 1 account;
-- 6 to convert (2 book, 1 course, 3 free_resource), 0 duplicates, 0 unmatched.

BEGIN;

-- What each legacy row becomes. An id is only converted when it is not itself
-- a slug of that table, and the numeric casts are guarded by CASE so a text
-- slug is never cast.
CREATE TEMP TABLE favourite_slug_map ON COMMIT DROP AS
SELECT f.id, f.user_id, f.content_type, f.content_slug,
       COALESCE(h.healer_slug, b.slug, v.slug, c.slug, r.slug) AS new_slug
FROM public.user_favourites f
LEFT JOIN public.healers h
  ON f.content_type = 'healer'
 AND h.id = CASE WHEN f.content_slug ~ '^\d{1,18}$' THEN f.content_slug::bigint END
 AND NOT EXISTS (SELECT 1 FROM public.healers x WHERE x.healer_slug = f.content_slug)
LEFT JOIN public.books b
  ON f.content_type IN ('book', 'book_read')
 AND b.id = CASE WHEN f.content_slug ~ '^\d{1,18}$' THEN f.content_slug::bigint END
 AND NOT EXISTS (SELECT 1 FROM public.books x WHERE x.slug = f.content_slug)
LEFT JOIN public.videos v
  ON f.content_type = 'video'
 AND v.id = CASE WHEN f.content_slug ~ '^\d{1,18}$' THEN f.content_slug::bigint END
 AND NOT EXISTS (SELECT 1 FROM public.videos x WHERE x.slug = f.content_slug)
LEFT JOIN public.courses c
  ON f.content_type = 'course'
 AND c.id::text = f.content_slug
LEFT JOIN public.free_resources r
  ON f.content_type = 'free_resource'
 AND r.id::text = f.content_slug;

DELETE FROM favourite_slug_map
WHERE new_slug IS NULL OR new_slug = '' OR new_slug = content_slug;

-- Converted copies that would collide with the unique (user, type, slug):
-- either the person already saved the slug, or two legacy rows map to it.
DELETE FROM public.user_favourites f
USING favourite_slug_map m
WHERE f.id = m.id
  AND (
    EXISTS (
      SELECT 1 FROM public.user_favourites o
      WHERE o.user_id = m.user_id
        AND o.content_type = m.content_type
        AND o.content_slug = m.new_slug
    )
    OR EXISTS (
      SELECT 1 FROM favourite_slug_map m2
      WHERE m2.user_id = m.user_id
        AND m2.content_type = m.content_type
        AND m2.new_slug = m.new_slug
        AND m2.id < m.id
    )
  );

UPDATE public.user_favourites f
SET content_slug = m.new_slug
FROM favourite_slug_map m
WHERE f.id = m.id;

COMMENT ON COLUMN public.user_favourites.content_type IS
  'healer, publisher, book, book_read (a book marked as read), video, course or free_resource';

COMMENT ON COLUMN public.user_favourites.content_slug IS
  'The item''s slug — healers.healer_slug for healers, the slug column for every other type. Since migration 0012 (Oct 2026); before it, books and videos held numeric ids and courses and free resources UUIDs.';

COMMIT;

-- Check afterwards (read-only). Expect zero rows in both, unless content was
-- deleted before its saves were converted:
--
--   SELECT content_type, count(*) FROM public.user_favourites
--   WHERE content_slug ~ '^\d+$'
--      OR content_slug ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
--   GROUP BY content_type;
