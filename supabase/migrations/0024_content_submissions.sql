-- 0024 — owners manage their own content.
--
-- A verified owner (an approved account linked to its listing) can add a
-- video, book, course, retreat, membership or free resource, edit anything
-- live on their listing, and remove it. Adding and editing wait for the admin;
-- removing doesn't. A publisher adds books for one of its linked authors.
--
--   1. content_submissions — new items and edits, waiting in the Inbox. The
--      live row is never touched until the admin approves.
--   2. content_removals — what an owner removed: who, what and when, and the
--      link, so ingestion doesn't add it back.
--   3. remove_owned_content() — the removal itself, in one transaction: the
--      item, its reviews, its saves, its broken-image row, any edit waiting
--      on it, and the record.
--   4. The content-submissions storage bucket: private, for images waiting on
--      a decision. Approved images are copied to practitioner-images.
--
-- Every write goes through the website's server routes with the service role,
-- which check that the account owns the listing. Owners may read their own
-- submissions; nothing else. No existing policy changes.
--
-- Dev first, then live. Run once; it's safe to run again.


-- 1. Submissions ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.content_submissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The listing it goes on. NULL only for a publisher's book whose author
  -- isn't on Spiritpedia yet: the admin creates the author, then approves.
  healer_slug        TEXT REFERENCES public.healers(healer_slug) ON DELETE CASCADE,
  -- Set when a publisher submitted it.
  publisher_id       UUID REFERENCES public.publishers(id) ON DELETE CASCADE,
  kind               TEXT NOT NULL,
  content_type       TEXT NOT NULL,
  -- For an edit: the live row's id (a bigint for videos and books, a UUID for
  -- courses and free resources). For a new item, once approved: what it became.
  target_id          TEXT,
  fields             JSONB NOT NULL DEFAULT '{}'::jsonb,
  suggested_subjects TEXT[] NOT NULL DEFAULT '{}',
  notes              TEXT,
  author_pending     BOOLEAN NOT NULL DEFAULT false,
  -- An uploaded image waiting in the content-submissions bucket.
  image_path         TEXT,
  status             TEXT NOT NULL DEFAULT 'pending',
  reject_reason      TEXT,
  admin_note         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at         TIMESTAMPTZ,
  CONSTRAINT content_submissions_kind_known CHECK (kind IN ('new', 'edit')),
  CONSTRAINT content_submissions_type_known CHECK (content_type IN ('video', 'book', 'course', 'free_resource')),
  CONSTRAINT content_submissions_status_known CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  CONSTRAINT content_submissions_edit_has_target CHECK (kind = 'new' OR target_id IS NOT NULL),
  CONSTRAINT content_submissions_has_listing CHECK (healer_slug IS NOT NULL OR (publisher_id IS NOT NULL AND author_pending)),
  CONSTRAINT content_submissions_author_pending_books CHECK (NOT author_pending OR (content_type = 'book' AND publisher_id IS NOT NULL)),
  CONSTRAINT content_submissions_notes_length CHECK (notes IS NULL OR char_length(notes) <= 2000),
  CONSTRAINT content_submissions_subjects_count CHECK (cardinality(suggested_subjects) <= 5)
);

COMMENT ON TABLE public.content_submissions IS
  'Content an owner added or changed, waiting for the admin (migration 0024). The owner may read their own rows; every write is the service role (the website''s server routes, which check ownership). Deleted 12 months after a decision.';
COMMENT ON COLUMN public.content_submissions.fields IS
  'The values they proposed, in the target table''s column names. For an edit, the whole form; approving applies only what differs from the live row.';
COMMENT ON COLUMN public.content_submissions.author_pending IS
  'A publisher''s book by an author not on Spiritpedia yet (named in notes). Can''t be approved until the admin has created the author and set healer_slug.';

-- One edit waiting per live item.
CREATE UNIQUE INDEX IF NOT EXISTS content_submissions_one_open_edit_idx
  ON public.content_submissions (content_type, target_id)
  WHERE kind = 'edit' AND status = 'pending';
CREATE INDEX IF NOT EXISTS content_submissions_pending_idx
  ON public.content_submissions (created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS content_submissions_user_idx
  ON public.content_submissions (user_id, created_at DESC);

ALTER TABLE public.content_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read their own submissions" ON public.content_submissions;
CREATE POLICY "Owners can read their own submissions"
ON public.content_submissions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- No insert, update or delete policies: submitting, withdrawing and deciding
-- all go through the server, which checks the listing is theirs.
REVOKE INSERT, UPDATE, DELETE ON public.content_submissions FROM anon, authenticated;


-- 2. Removals -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.content_removals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type  TEXT NOT NULL,
  title         TEXT,
  -- The item's own link (platform_url, amazon_url, course_url or
  -- resource_url), which is what ingestion's duplicate check compares.
  url           TEXT,
  healer_slug   TEXT,
  -- Who removed it. Kept as a name, not the account: the account may go.
  removed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  removed_by_name TEXT,
  reviews_deleted INTEGER NOT NULL DEFAULT 0,
  saves_deleted INTEGER NOT NULL DEFAULT 0,
  removed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_removals_type_known CHECK (content_type IN ('video', 'book', 'course', 'free_resource'))
);

COMMENT ON TABLE public.content_removals IS
  'What owners removed from their own listings (migration 0024): shown in admin, and checked by ingestion so a removed item isn''t added back. Service role only.';

CREATE INDEX IF NOT EXISTS content_removals_url_idx ON public.content_removals (url);
CREATE INDEX IF NOT EXISTS content_removals_removed_at_idx ON public.content_removals (removed_at DESC);

ALTER TABLE public.content_removals ENABLE ROW LEVEL SECURITY;
-- No policies at all: the admin reads it through the service role.
REVOKE ALL ON public.content_removals FROM anon, authenticated;


-- 3. Removing an item -----------------------------------------------------
-- The route has already checked that p_user owns it. One transaction, so a
-- half-removed item can't be left behind. → the removal record's id, or NULL
-- when the item was already gone.

CREATE OR REPLACE FUNCTION public.remove_owned_content(
  p_type TEXT,
  p_id   TEXT,
  p_user UUID,
  p_user_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug    TEXT;
  v_title   TEXT;
  v_url     TEXT;
  v_healer  TEXT;
  v_reviews INTEGER := 0;
  v_saves   INTEGER := 0;
  v_id      UUID;
BEGIN
  IF p_type = 'video' THEN
    DELETE FROM public.videos WHERE id::text = p_id
      RETURNING slug, title, platform_url, healer_slug INTO v_slug, v_title, v_url, v_healer;
  ELSIF p_type = 'book' THEN
    DELETE FROM public.books WHERE id::text = p_id
      RETURNING slug, title, amazon_url, healer_slug INTO v_slug, v_title, v_url, v_healer;
  ELSIF p_type = 'course' THEN
    DELETE FROM public.courses c WHERE c.id::text = p_id
      RETURNING c.slug, c.title, c.course_url, (SELECT h.healer_slug FROM public.healers h WHERE h.id = c.healer_id)
      INTO v_slug, v_title, v_url, v_healer;
  ELSIF p_type = 'free_resource' THEN
    DELETE FROM public.free_resources r WHERE r.id::text = p_id
      RETURNING r.slug, r.title, r.resource_url, (SELECT h.healer_slug FROM public.healers h WHERE h.id = r.healer_id)
      INTO v_slug, v_title, v_url, v_healer;
  ELSE
    RAISE EXCEPTION 'unknown content type %', p_type;
  END IF;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Its reviews and saves (both keyed by type and slug since 0012).
  IF v_slug IS NOT NULL THEN
    DELETE FROM public.reviews WHERE content_type = p_type AND content_slug = v_slug;
    GET DIAGNOSTICS v_reviews = ROW_COUNT;
    DELETE FROM public.user_favourites WHERE content_type = p_type AND content_slug = v_slug;
    GET DIAGNOSTICS v_saves = ROW_COUNT;
  END IF;

  -- A broken-image report about it has nothing left to fix.
  DELETE FROM public.broken_images
   WHERE record_id::text = p_id
     AND table_name = CASE p_type
       WHEN 'video' THEN 'videos' WHEN 'book' THEN 'books'
       WHEN 'course' THEN 'courses' ELSE 'free_resources' END;

  -- An edit waiting on it has nothing left to change.
  UPDATE public.content_submissions
     SET status = 'withdrawn', decided_at = now(), updated_at = now(),
         admin_note = 'The item was removed.'
   WHERE kind = 'edit' AND status = 'pending' AND content_type = p_type AND target_id = p_id;

  INSERT INTO public.content_removals
    (content_type, title, url, healer_slug, removed_by, removed_by_name, reviews_deleted, saves_deleted)
  VALUES
    (p_type, v_title, v_url, v_healer, p_user, p_user_name, v_reviews, v_saves)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.remove_owned_content(TEXT, TEXT, UUID, TEXT) IS
  'Removes a video, book, course or free resource with its reviews, saves, broken-image row and any waiting edit, and records who removed it (0024). Service role only: the website checks ownership first.';

REVOKE ALL ON FUNCTION public.remove_owned_content(TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_owned_content(TEXT, TEXT, UUID, TEXT) TO service_role;


-- 4. The holding bucket ---------------------------------------------------
-- Private, with no policies: only the service role reads or writes it. The
-- website uploads to {user id}/{uuid}.{ext} and copies an approved image to
-- practitioner-images/content/.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('content-submissions', 'content-submissions', false, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;


-- Check -------------------------------------------------------------------
-- Expect: true, true, true, false, 1, 0.

SELECT
  to_regclass('public.content_submissions') IS NOT NULL AS submissions_table,
  to_regclass('public.content_removals') IS NOT NULL AS removals_table,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'remove_owned_content') AS remove_function,
  (SELECT public FROM storage.buckets WHERE id = 'content-submissions') AS bucket_public,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'content_submissions') AS submission_policies,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'content_removals') AS removal_policies;
