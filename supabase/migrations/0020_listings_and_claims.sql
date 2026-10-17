-- 0020: one sign-up for everyone who shares their work; listings of every
-- kind; claims of every kind.
--
-- Dev first, then live. Safe to run twice.
--
-- What it does:
--   1. user_profiles.described_as   — the optional "What best describes you?"
--   2. user_profiles.linked_publisher_id — an account's claimed publisher,
--      pinned like linked_healer_slug (admin or a verified claim only)
--   3. healers.entity_type          — a known list, now with 'organisation'
--   4. healers.official             — the Spiritpedia Official badge
--   5. publishers.contact_email     — so publishers can be claimed and emailed
--   6. claim_publisher_profile()    — the publisher twin of
--      claim_healer_profile(), same email/domain rule
--   7. claim_requests               — "Request to claim it", for the admin Inbox
--   8. healer_journeys              — may point at a publisher instead
--
-- user_type is unchanged: 'explorer' or 'practitioner', where 'practitioner'
-- now means "shares their work". The kind of listing lives on the listing
-- (healers.entity_type, or a publishers row), set by the admin at approval.


-- 1. "What best describes you?" ------------------------------------------
-- Self-described, optional, only a hint for the admin's choice at approval.
-- 'podcast' is offered because people say it; it is listed as a channel.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS described_as TEXT;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_described_as_known;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_described_as_known CHECK (
    described_as IS NULL OR described_as IN
      ('practitioner', 'channel', 'podcast', 'app', 'publisher', 'organisation', 'not_sure')
  );

COMMENT ON COLUMN public.user_profiles.described_as IS
  'The applicant''s own answer to "What best describes you?" (optional). A hint only: the admin sets the listing''s type at approval.';

COMMENT ON COLUMN public.user_profiles.user_type IS
  'explorer, or practitioner — which now means anyone who shares their work (practitioner, channel, podcast, app, publisher or organisation). The kind of listing is on the listing.';


-- 2. An account's publisher ---------------------------------------------

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS linked_publisher_id UUID
  REFERENCES public.publishers(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.user_profiles.linked_publisher_id IS
  'publishers.id once a claim is approved. Admin-set, or by claim_publisher_profile(); never by the browser.';

-- The 0003 trigger, now pinning linked_publisher_id as well.
CREATE OR REPLACE FUNCTION public.user_profiles_protect_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
BEGIN
  IF current_setting('app.claim_verified', true) = 'true' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  EXCEPTION WHEN others THEN
    v_role := 'authenticated';
  END;

  IF v_role IS DISTINCT FROM 'authenticated' AND v_role IS DISTINCT FROM 'anon' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := 'pending';
    NEW.linked_healer_slug  := NULL;
    NEW.linked_publisher_id := NULL;
    NEW.created_at          := now();
  ELSE
    NEW.verification_status := OLD.verification_status;
    NEW.linked_healer_slug  := OLD.linked_healer_slug;
    NEW.linked_publisher_id := OLD.linked_publisher_id;
    NEW.id                  := OLD.id;
    NEW.created_at          := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.user_profiles_protect_admin_fields() IS
  'Pins verification_status, linked_healer_slug, linked_publisher_id, id and created_at against ordinary API callers. Yields to app.claim_verified, which only the claim functions set.';


-- 3. Listing types --------------------------------------------------------
-- There was no check before; live holds only individual, channel and app.

ALTER TABLE public.healers
  DROP CONSTRAINT IF EXISTS healers_entity_type_known;
ALTER TABLE public.healers
  ADD CONSTRAINT healers_entity_type_known CHECK (
    entity_type IS NULL OR entity_type IN ('individual', 'channel', 'app', 'organisation')
  );

COMMENT ON COLUMN public.healers.entity_type IS
  'individual (a practitioner or teacher), channel (YouTube or podcast), app, or organisation (a network or school). Set by the admin at approval; can be changed later. Publishers are their own table.';


-- 4. Spiritpedia Official ----------------------------------------------
-- healers is written only by the service role (0006/0007), so only the admin
-- can set this.

ALTER TABLE public.healers
  ADD COLUMN IF NOT EXISTS official BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.healers.official IS
  'Spiritpedia''s own profile: the Official badge, first in Explore These Channels, never in the paid tiers. Admin only.';


-- 5. Publishers can be claimed and contacted ---------------------------
-- Public read, like healers.contact_email: the website's claim match reads it.

ALTER TABLE public.publishers
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

COMMENT ON COLUMN public.publishers.contact_email IS
  'The publisher''s published contact address: the claim match and the outreach journey use it.';


-- 6. Claiming a publisher -------------------------------------------------
-- The same rule as claim_healer_profile (0003): the sign-in email equals the
-- contact email, or its own domain (never a free-mail one) is in the website.

CREATE OR REPLACE FUNCTION public.claim_publisher_profile(p_slug TEXT)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_free_domains TEXT[] := ARRAY[
    'gmail.com','googlemail.com','outlook.com','hotmail.com','hotmail.co.uk',
    'live.com','live.co.uk','msn.com','yahoo.com','yahoo.co.uk','ymail.com',
    'icloud.com','me.com','mac.com','aol.com','proton.me','protonmail.com',
    'pm.me','gmx.com','gmx.co.uk','mail.com','yandex.com','zoho.com',
    'btinternet.com','sky.com','virginmedia.com','talktalk.net','tutanota.com'
  ];
  v_uid UUID;
  v_email TEXT;
  v_domain TEXT;
  v_publisher UUID;
  v_row public.user_profiles;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to claim a profile.';
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'No usable email address on this account.';
  END IF;

  v_domain := split_part(v_email, '@', 2);

  SELECT id INTO v_publisher FROM public.publishers
   WHERE slug = p_slug
     AND lower(contact_email) = v_email
   LIMIT 1;

  IF v_publisher IS NULL AND NOT (v_domain = ANY (v_free_domains)) THEN
    SELECT id INTO v_publisher FROM public.publishers
     WHERE slug = p_slug
       AND website_url ILIKE '%' || v_domain || '%'
     LIMIT 1;
  END IF;

  IF v_publisher IS NULL THEN
    RAISE EXCEPTION 'That profile does not match your email address.';
  END IF;

  PERFORM set_config('app.claim_verified', 'true', true);

  INSERT INTO public.user_profiles (id, user_type, linked_publisher_id, verification_status)
  VALUES (v_uid, 'practitioner', v_publisher, 'approved')
  ON CONFLICT (id) DO UPDATE
    SET user_type = 'practitioner',
        linked_publisher_id = EXCLUDED.linked_publisher_id,
        verification_status = 'approved'
  RETURNING * INTO v_row;

  PERFORM set_config('app.claim_verified', 'false', true);

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.claim_publisher_profile(TEXT) IS
  'Links the caller to a publisher after re-checking their email against it server side. The only path that may set linked_publisher_id from the browser.';

-- Supabase grants new functions to anon by default; claim_healer_profile has
-- no anon grant either.
REVOKE ALL ON FUNCTION public.claim_publisher_profile(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_publisher_profile(TEXT) TO authenticated, service_role;


-- 7. Claim requests ------------------------------------------------------
-- "Is your work already on Spiritpedia? Request to claim it", when the email
-- doesn't match. The admin confirms by emailing the listing's own address
-- first (or, failing that, a code in the channel's About text or website),
-- then approves through the service role.

CREATE TABLE IF NOT EXISTS public.claim_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  healer_slug   TEXT REFERENCES public.healers(healer_slug) ON DELETE CASCADE,
  publisher_id  UUID REFERENCES public.publishers(id) ON DELETE CASCADE,
  connection    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  proof         TEXT,
  proof_code    TEXT,
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT claim_requests_one_listing CHECK ((healer_slug IS NULL) <> (publisher_id IS NULL)),
  CONSTRAINT claim_requests_status_known CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  CONSTRAINT claim_requests_proof_known CHECK (proof IS NULL OR proof IN ('listing_email', 'code', 'other')),
  CONSTRAINT claim_requests_connection_length CHECK (char_length(connection) BETWEEN 1 AND 1000)
);

COMMENT ON TABLE public.claim_requests IS
  'Requests to manage a listing the sign-in email did not match. The owner may make and read their own; status, proof and decisions are service role only (the admin Inbox). Deleted 12 months after a decision.';
COMMENT ON COLUMN public.claim_requests.connection IS
  'In their words: how they are connected to the listing.';
COMMENT ON COLUMN public.claim_requests.proof IS
  'How the admin confirmed it: listing_email (the listing''s published address replied), code (placed in the About text or website), or other.';

-- One open request per person per listing.
CREATE UNIQUE INDEX IF NOT EXISTS claim_requests_one_open_healer_idx
  ON public.claim_requests (user_id, healer_slug)
  WHERE status = 'pending' AND healer_slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS claim_requests_one_open_publisher_idx
  ON public.claim_requests (user_id, publisher_id)
  WHERE status = 'pending' AND publisher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS claim_requests_pending_idx
  ON public.claim_requests (created_at) WHERE status = 'pending';

ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can request a claim" ON public.claim_requests;
CREATE POLICY "Users can request a claim"
ON public.claim_requests FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND proof IS NULL
  AND proof_code IS NULL
  AND decided_at IS NULL
);

DROP POLICY IF EXISTS "Users can read their own claim requests" ON public.claim_requests;
CREATE POLICY "Users can read their own claim requests"
ON public.claim_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- No update or delete policies: withdrawing or deciding goes through the
-- server, so a request can't approve itself.


-- 8. Journeys can be to a publisher -----------------------------------

ALTER TABLE public.healer_journeys
  ALTER COLUMN healer_slug DROP NOT NULL;

ALTER TABLE public.healer_journeys
  ADD COLUMN IF NOT EXISTS publisher_id UUID
  REFERENCES public.publishers(id) ON DELETE CASCADE;

ALTER TABLE public.healer_journeys
  DROP CONSTRAINT IF EXISTS healer_journeys_one_listing;
ALTER TABLE public.healer_journeys
  ADD CONSTRAINT healer_journeys_one_listing CHECK ((healer_slug IS NULL) <> (publisher_id IS NULL));

CREATE UNIQUE INDEX IF NOT EXISTS healer_journeys_one_active_publisher_idx
  ON public.healer_journeys (publisher_id)
  WHERE status <> 'stopped' AND publisher_id IS NOT NULL;

COMMENT ON TABLE public.healer_journeys IS
  'Outreach sequence to a listing nobody has claimed: a healers row (any type) or a publisher, exactly one. Five emails at 0, 21, 42, 63 and 84 days. Service role only: there are no policies, as with admin_notes.';


-- Check ------------------------------------------------------------------

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
    ('user_profiles', 'described_as'),
    ('user_profiles', 'linked_publisher_id'),
    ('healers', 'official'),
    ('publishers', 'contact_email'),
    ('healer_journeys', 'publisher_id'),
    ('healer_journeys', 'healer_slug'),
    ('claim_requests', 'connection')
  )
ORDER BY table_name, column_name;
