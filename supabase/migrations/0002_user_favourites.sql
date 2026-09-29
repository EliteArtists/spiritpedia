CREATE TABLE IF NOT EXISTS public.user_favourites (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_slug TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_favourites_unique UNIQUE (user_id, content_type, content_slug)
);

COMMENT ON TABLE public.user_favourites IS 'Saved items per user. Migrated from localStorage on first sign-in.';
COMMENT ON COLUMN public.user_favourites.content_type IS 'healer, publisher, book, video, course or free_resource';
COMMENT ON COLUMN public.user_favourites.content_slug IS 'Whatever identifier the heart stored: a slug for healers, publishers and books, a numeric id for videos, courses and free resources. Not always a slug despite the name.';

CREATE INDEX IF NOT EXISTS user_favourites_user_id_idx ON public.user_favourites (user_id);

ALTER TABLE public.user_favourites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own favourites" ON public.user_favourites;
CREATE POLICY "Users can read own favourites"
ON public.user_favourites FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favourites" ON public.user_favourites;
CREATE POLICY "Users can insert own favourites"
ON public.user_favourites FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favourites" ON public.user_favourites;
CREATE POLICY "Users can delete own favourites"
ON public.user_favourites FOR DELETE
USING (auth.uid() = user_id);
