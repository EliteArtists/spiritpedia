-- 0016 — how many people saved each book or video, for Spiritpedia Suggests.
--
-- The app's search picks one video and one book to suggest, by relevance; save
-- counts become a small tie-breaking signal there. user_favourites is readable
-- only by its owner, so the counts come from this definer function, which
-- returns totals and nothing else: never who saved, never when, and only for
-- the slugs asked about. A slug nobody saved is simply absent (0).
--
-- Books count "Want to Read" saves (content_type 'book'), not "Mark as Read".
-- Read-only, and open to signed-out visitors, since search works without an
-- account. Idempotent: safe to run twice.

CREATE OR REPLACE FUNCTION public.save_counts(
  p_type TEXT,
  p_slugs TEXT[]
) RETURNS TABLE (content_slug TEXT, saves INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT f.content_slug, count(*)::INTEGER
    FROM public.user_favourites f
   WHERE p_type IN ('book', 'video')
     AND f.content_type = p_type
     AND f.content_slug = ANY (p_slugs[1:200])
   GROUP BY f.content_slug;
$$;

COMMENT ON FUNCTION public.save_counts(TEXT, TEXT[]) IS
  'How many accounts saved each of the given books or videos (p_type book or video; at most 200 slugs). Totals only — never who or when. For the app''s Spiritpedia Suggests.';

REVOKE ALL ON FUNCTION public.save_counts(TEXT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_counts(TEXT, TEXT[]) TO anon, authenticated;

-- ── Check ───────────────────────────────────────────────────────────────────

SELECT * FROM public.save_counts('book', ARRAY(
  SELECT content_slug FROM public.user_favourites WHERE content_type = 'book'
));
