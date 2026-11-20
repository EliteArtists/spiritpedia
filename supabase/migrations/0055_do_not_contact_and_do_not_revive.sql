-- 0055 — Never again: do-not-contact addresses and the do-not-revive list
-- (owner, 20 Nov 2026, after BSWA asked to be removed).
--
--   1. do_not_contact_emails — addresses Spiritpedia never writes to again,
--      whatever listing they are on, and even after the listing is deleted.
--      Set by Admin → "Do not contact this email address" (a listing's
--      Outreach tab, and Admin → Outreach). The website checks it before
--      every email it sends (utils/email.js → sendEmail), Up next leaves
--      the address out, and Start and the daily job refuse it.
--   2. A listing can't be given a do-not-contact address. A trigger on
--      healers and publishers clears contact_email (and where it was found)
--      when it is one, whatever writes it: the admin, an ingest, a sprint.
--   3. do_not_revive — listings removed at the owner's request, never to be
--      researched, planned or added again (README §18.7). Set by Admin →
--      Delete → "Removed at owner's request — never re-add". Seeded with the
--      three named on 5 Nov 2026 and BSWA.
--   4. A healer can't be created again from that list. A trigger refuses an
--      insert with the same slug, the same name, or the same website (the
--      address as written, without http(s)://, www. or a trailing slash).
--      scripts/ingest.mjs checks first and says so; this is the backstop.
--   5. BSWA: admin@bswa.org is do not contact and comes off every listing
--      (Ajahn Brahm's and Ajahn Brahmali's were cleared by hand on live and
--      dev on 20 Nov 2026; on dev it is also on BSWA's own listing, which
--      the owner deleted on live only). Any running or paused journey to an
--      address on the list is stopped (none on 20 Nov 2026).
--
-- Both tables are service role only: RLS on, no policies. No existing grant
-- or policy changes. Dev first, then live. Safe to run again. Check row at
-- the end.


-- 1. Do-not-contact addresses ----------------------------------------------

CREATE TABLE IF NOT EXISTS public.do_not_contact_emails (
  -- Lower case, no spaces: compared exactly.
  email     TEXT PRIMARY KEY CHECK (email = lower(btrim(email)) AND email LIKE '%@%'),
  note      TEXT,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by  TEXT
);

COMMENT ON TABLE public.do_not_contact_emails IS
  'Addresses Spiritpedia never emails again (0055), whatever listing they are on. Set in Admin with "Do not contact this email address". sendEmail checks it before every send; a trigger keeps them off healers and publishers. Service role only: RLS on, no policies.';

ALTER TABLE public.do_not_contact_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.do_not_contact_emails FROM anon, authenticated;


-- 2. Never on a listing ----------------------------------------------------

CREATE OR REPLACE FUNCTION public.clear_do_not_contact_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contact_email IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.do_not_contact_emails d WHERE d.email = lower(btrim(NEW.contact_email))) THEN
    RAISE NOTICE 'do_not_contact: % is not to be contacted; contact_email cleared', NEW.contact_email;
    NEW.contact_email := NULL;
    NEW.contact_email_source := NULL;
    NEW.contact_recipient_type := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_do_not_contact_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS healers_clear_do_not_contact_email ON public.healers;
CREATE TRIGGER healers_clear_do_not_contact_email
  BEFORE INSERT OR UPDATE OF contact_email ON public.healers
  FOR EACH ROW EXECUTE FUNCTION public.clear_do_not_contact_email();

DROP TRIGGER IF EXISTS publishers_clear_do_not_contact_email ON public.publishers;
CREATE TRIGGER publishers_clear_do_not_contact_email
  BEFORE INSERT OR UPDATE OF contact_email ON public.publishers
  FOR EACH ROW EXECUTE FUNCTION public.clear_do_not_contact_email();


-- 3. Do not revive ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.do_not_revive (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         TEXT NOT NULL,
  healer_slug  TEXT,
  website_url  TEXT,
  youtube_url  TEXT,
  contact_email TEXT,
  reason       TEXT NOT NULL,
  removed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by     TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS do_not_revive_name_idx ON public.do_not_revive (lower(name));

COMMENT ON TABLE public.do_not_revive IS
  'Listings removed at the owner''s request and never added again (0055; README §18.7). Set in Admin → Delete with "Removed at owner''s request — never re-add". A trigger refuses a new healer with the same slug, name or website. Service role only: RLS on, no policies.';

ALTER TABLE public.do_not_revive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.do_not_revive FROM anon, authenticated;

-- The same rule as utils/neverAgain.js → siteKey.
CREATE OR REPLACE FUNCTION public.site_key(url TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(regexp_replace(regexp_replace(lower(btrim(COALESCE(url, ''))), '^https?://(www\.)?', ''), '/+$', ''), '');
$$;


-- 4. Never created again ---------------------------------------------------

CREATE OR REPLACE FUNCTION public.refuse_do_not_revive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hit RECORD;
BEGIN
  SELECT d.name, d.reason INTO hit FROM public.do_not_revive d
    WHERE d.healer_slug = NEW.healer_slug
       OR lower(d.name) = lower(btrim(NEW.name))
       OR (public.site_key(d.website_url) IS NOT NULL AND public.site_key(d.website_url) = public.site_key(NEW.website_url))
    LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'do_not_revive: % was removed at the owner''s request (%) and is never added again (README §18.7).',
      hit.name, hit.reason
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.refuse_do_not_revive() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS healers_refuse_do_not_revive ON public.healers;
CREATE TRIGGER healers_refuse_do_not_revive
  BEFORE INSERT ON public.healers
  FOR EACH ROW EXECUTE FUNCTION public.refuse_do_not_revive();


-- 5. The lists today, and BSWA ---------------------------------------------

INSERT INTO public.do_not_contact_emails (email, note, added_by) VALUES
  ('admin@bswa.org', 'BSWA asked to be removed (owner, 20 Nov 2026)', 'migration 0055')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.do_not_revive (name, healer_slug, website_url, youtube_url, contact_email, reason, removed_at, added_by) VALUES
  ('Buddhist Society of Western Australia', 'buddhist-society-of-western-australia', 'https://bswa.org/', NULL, 'admin@bswa.org',
   'Removed at their request (owner, 20 Nov 2026)', '2026-11-20', 'migration 0055'),
  ('Nandhiji', 'nandhiji', 'https://nandhiji.com/', 'https://www.youtube.com/@nandhi108', NULL,
   'Dropped by the owner 1 Nov 2026, again 5 Nov: probable bought growth, healing claims', '2026-11-05', 'migration 0055'),
  ('Devon Kerns', 'devon-kerns', 'https://devonkkerns.com', 'https://www.youtube.com/@DevonKerns', NULL,
   'Dropped by the owner 1 Nov 2026: mainly a life and leadership coach', '2026-11-01', 'migration 0055'),
  ('Ipek Williamson', 'ipek-williamson', 'https://ipekwilliamsoncoaching.com/', 'https://www.youtube.com/@insightcoachipek', NULL,
   'Dropped by the owner 1 Nov 2026, on fit', '2026-11-01', 'migration 0055')
ON CONFLICT ((lower(name))) DO NOTHING;

-- Any running or paused journey to a listing with an address on the list.
UPDATE public.healer_journeys j SET status = 'stopped', stop_reason = 'do_not_contact_email'
WHERE j.status IN ('running', 'paused')
  AND (
    (j.publisher_id IS NULL AND EXISTS (SELECT 1 FROM public.healers h JOIN public.do_not_contact_emails d
      ON d.email = lower(btrim(h.contact_email)) WHERE h.healer_slug = j.healer_slug))
    OR (j.publisher_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.publishers p JOIN public.do_not_contact_emails d
      ON d.email = lower(btrim(p.contact_email)) WHERE p.id = j.publisher_id))
  );

-- Then off every listing (the trigger clears it).
UPDATE public.healers SET contact_email = contact_email
  WHERE lower(btrim(contact_email)) IN (SELECT email FROM public.do_not_contact_emails);
UPDATE public.publishers SET contact_email = contact_email
  WHERE lower(btrim(contact_email)) IN (SELECT email FROM public.do_not_contact_emails);


-- Check -------------------------------------------------------------------
-- Expect on dev and live: 1, 4, 0, 3.

SELECT
  (SELECT count(*) FROM public.do_not_contact_emails) AS do_not_contact,
  (SELECT count(*) FROM public.do_not_revive) AS do_not_revive,
  (SELECT count(*) FROM public.healers WHERE lower(btrim(contact_email)) IN (SELECT email FROM public.do_not_contact_emails))
    + (SELECT count(*) FROM public.publishers WHERE lower(btrim(contact_email)) IN (SELECT email FROM public.do_not_contact_emails))
    AS listings_with_blocked_address,
  (SELECT count(*) FROM pg_trigger WHERE tgname IN
    ('healers_clear_do_not_contact_email', 'publishers_clear_do_not_contact_email', 'healers_refuse_do_not_revive')) AS triggers;
