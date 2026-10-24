-- 0027 — co-authors for books (README §17, §18).
--
-- A book has one main author (books.healer_slug, unchanged) and, from now on,
-- any number of co-authors: co_healer_slugs, the other authors' healer slugs.
-- A co-written book then shows on every author's teacher page and publisher
-- shelf, and its page names them all. Editing stays with the main author.
--
-- Books link to healers by the text slug, not an id, so co-authors do too.
-- The GIN index serves "books where this healer is a co-author" (the
-- @> / && array operators the website and app use).
--
-- Content stays read-only for everyone but the service role: this adds a
-- column to a table whose policies (0007) already cover every column. No
-- policy changes.
--
-- Dev first, then live. Run once; it's safe to run again.


ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS co_healer_slugs TEXT[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.books.co_healer_slugs IS
  'Healer slugs of the book''s co-authors (0027). healer_slug stays the main author; editing stays with them. Empty for a book with one author.';

-- The main author is never also listed as a co-author.
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_co_authors_not_main;
ALTER TABLE public.books
  ADD CONSTRAINT books_co_authors_not_main
  CHECK (healer_slug IS NULL OR NOT (healer_slug = ANY (co_healer_slugs)));

CREATE INDEX IF NOT EXISTS books_co_healer_slugs_idx
  ON public.books USING GIN (co_healer_slugs);


-- Check (read-only): the column, its default, and that no book has a
-- co-author yet.
SELECT
  (SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'co_healer_slugs') AS column_type,
  (SELECT count(*) FROM public.books WHERE cardinality(co_healer_slugs) > 0) AS books_with_co_authors,
  (SELECT count(*) FROM pg_indexes WHERE indexname = 'books_co_healer_slugs_idx') AS index_present;
