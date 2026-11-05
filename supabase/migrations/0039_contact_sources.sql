-- 0039 — Where a listing's contact route comes from (email pass, 5 Nov 2026;
-- README open job #16 and §18.4).
--
-- Two new columns on healers, both public data already published by the
-- listing itself (healers is public-read, as before; no policy changes):
-- - contact_email_source: the page where contact_email is published, so
--   every address can be traced and none is ever guessed;
-- - contact_form_url: the listing's own contact form, the fallback when no
--   email is published. Admin's "No email" filter reads it.
--
-- Run order (dev first, then live): this whole file, after 0038. Safe to run
-- again. Check row at the end.

ALTER TABLE public.healers ADD COLUMN IF NOT EXISTS contact_email_source text;
ALTER TABLE public.healers ADD COLUMN IF NOT EXISTS contact_form_url text;

COMMENT ON COLUMN public.healers.contact_email_source IS
  'URL of the page where contact_email is published (never guessed or constructed). Set by the email pass and by ingestion.';
COMMENT ON COLUMN public.healers.contact_form_url IS
  'The listing''s own contact form, recorded when no email is published. Admin''s "No email" filter reads it.';

-- Check row: both columns present (expect 2), and listings still
-- without an email (expect 220 on both before the email pass is applied).
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'healers'
      AND column_name IN ('contact_email_source', 'contact_form_url')) AS new_columns,
  (SELECT count(*) FROM public.healers
    WHERE death_year IS NULL AND tier <> 'ascended_master'
      AND coalesce(contact_email, '') = '') AS without_email;
