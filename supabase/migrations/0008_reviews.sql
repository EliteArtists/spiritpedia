CREATE TABLE IF NOT EXISTS public.reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_slug TEXT NOT NULL,
  rating SMALLINT NOT NULL,
  body TEXT,
  author_name TEXT,
  author_healer_slug TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT reviews_body_length CHECK (body IS NULL OR char_length(body) <= 4000),
  CONSTRAINT reviews_status_known CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT reviews_content_type_known CHECK (
    content_type IN ('healer', 'publisher', 'book', 'video', 'course', 'free_resource')
  ),
  CONSTRAINT reviews_one_per_item UNIQUE (user_id, content_type, content_slug)
);

COMMENT ON TABLE public.reviews IS
  'Community reviews. One row per user per item. Public read of approved rows only, author-only write.';

COMMENT ON COLUMN public.reviews.content_type IS
  'healer, publisher, book, video, course or free_resource. Same vocabulary as user_favourites.content_type. Every row in the courses table is course here, whatever its product_type: course, retreat, download, membership, meditation and podcast all share the /offerings/[slug] page.';

COMMENT ON COLUMN public.reviews.content_slug IS
  'The slug column of the table named by content_type, which is how every detail page resolves its item. ALWAYS a text slug, unlike user_favourites.content_slug, which is a slug for healers and publishers, a bigint for books and videos and a UUID for courses and free resources.';

COMMENT ON COLUMN public.reviews.author_name IS
  'Display name captured at submission. Denormalised on purpose: user_profiles is readable only by its owner, so a public list cannot join for it, and a review should keep the name it was posted under.';

COMMENT ON COLUMN public.reviews.author_healer_slug IS
  'healers.healer_slug of the reviewer, when they are a practitioner with an approved claim. Derived by the trigger from user_profiles.linked_healer_slug, never sent by the client. Null for everyone else, whose name renders as plain text.';

COMMENT ON COLUMN public.reviews.status IS
  'pending, approved or rejected. Every review is moderated before it is public. Admin-set only: the trigger pins it against the author and the read policy hides anything not approved.';

COMMENT ON COLUMN public.reviews.rating IS 'Whole stars, 1 to 5. No half stars.';

COMMENT ON CONSTRAINT reviews_one_per_item ON public.reviews IS
  'One review per person per item. A second submission is an edit of the first, not a new row.';

CREATE INDEX IF NOT EXISTS reviews_content_idx
  ON public.reviews (content_type, content_slug, status, created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_status_idx
  ON public.reviews (status, created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_user_idx
  ON public.reviews (user_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public read approved reviews" ON public.reviews;
CREATE POLICY "Public read approved reviews"
ON public.reviews FOR SELECT
TO anon, authenticated
USING (status = 'approved');

DROP POLICY IF EXISTS "Users can read own reviews" ON public.reviews;
CREATE POLICY "Users can read own reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
CREATE POLICY "Users can insert own reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews"
ON public.reviews FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.reviews_pin_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claim TEXT;
  v_role TEXT;
BEGIN
  BEGIN
    v_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  EXCEPTION WHEN others THEN
    v_role := 'authenticated';
  END;

  IF v_role IS DISTINCT FROM 'authenticated' AND v_role IS DISTINCT FROM 'anon' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.user_id := COALESCE(auth.uid(), NEW.user_id);
    NEW.created_at := now();
    NEW.status := 'pending';

    SELECT linked_healer_slug INTO v_claim
      FROM public.user_profiles
     WHERE id = NEW.user_id;
    NEW.author_healer_slug := v_claim;
  ELSE
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
    NEW.content_type := OLD.content_type;
    NEW.content_slug := OLD.content_slug;
    NEW.status := OLD.status;
    NEW.author_healer_slug := OLD.author_healer_slug;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.reviews_pin_author() IS
  'Pins the columns an author must not control. On insert: user_id, created_at, status forced to pending, and author_healer_slug derived from the users own profile rather than taken from the payload, so nobody can link their name to someone elses healer page. On update: all of those plus the identity columns are frozen, so an edit cannot approve itself or move onto another item. Yields to any role that is not anon or authenticated, which is what lets the service role moderate: a BEFORE UPDATE trigger runs for every role, and the service role bypasses RLS, not triggers. The first version of this function lacked that exemption and no review could be approved by anything.';

DROP TRIGGER IF EXISTS reviews_pin_author_trigger ON public.reviews;
CREATE TRIGGER reviews_pin_author_trigger
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_pin_author();

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'reviews'
ORDER BY ordinal_position;

SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'reviews'
ORDER BY policyname;
