-- 0023 — badges that set themselves, publisher tiers, and Official reviews.
--
-- Dev first, then live. Safe to run twice.
--
-- What it does:
--   1. healers.verified, publishers.verified — ✓ Verified: the listing has an
--      owner whose account is approved and linked to it. Automatic.
--   2. healers.official — ✦ OFFICIAL, now automatic too: the listing owned by
--      love@spiritpedia.co. Nobody sets it, not even the admin.
--      Both are kept up to date by a trigger on user_profiles: approving a
--      claim or a sign-up, unlinking, rejecting, and deleting the account all
--      recompute them.
--   3. publishers.tier — publishers get tiers like everyone else (shown as
--      Superstar, Shining Star, Rising Star). Hay House and Sounds True start
--      as Superstar; change them in admin.
--   4. reviews.author_official — a review from the Official account is marked
--      Official and named "Spiritpedia" by the database, never by the device.
--      The name is reserved: anyone else calling themselves "Spiritpedia" is
--      saved with no name ("A Spiritpedia member").
--   5. The Spiritpedia listing: a Channel, its links with https.
--
-- Nothing here loosens a policy. healers and publishers stay service-role
-- write only (0006/0007); reviews keep their read policy (0015).


-- 1 and 2. Verified and Official ----------------------------------------

ALTER TABLE public.healers
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.publishers
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.healers.verified IS
  '✓ Verified: an approved account is linked to this listing (user_profiles.linked_healer_slug). Set only by refresh_listing_badges() (0023), which the user_profiles trigger runs.';

COMMENT ON COLUMN public.publishers.verified IS
  '✓ Verified: an approved account is linked to this publisher (user_profiles.linked_publisher_id). Set only by refresh_listing_badges() (0023).';

COMMENT ON COLUMN public.healers.official IS
  '✦ OFFICIAL: the listing linked to the love@spiritpedia.co account. Set only by refresh_listing_badges() (0023); the admin cannot set it. No tier is shown.';

-- Recomputes every listing's badges. The tables are small (hundreds of rows),
-- so recomputing all of them is simpler and safer than tracking which changed.
-- SECURITY DEFINER: it reads auth.users for the Official account's email.
CREATE OR REPLACE FUNCTION public.refresh_listing_badges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM set_config('app.listing_badges', 'on', true);

  UPDATE public.healers h
     SET verified = v.verified, official = v.official
    FROM (
      SELECT h2.healer_slug,
             EXISTS (
               SELECT 1 FROM public.user_profiles p
                WHERE p.linked_healer_slug = h2.healer_slug
                  AND p.verification_status = 'approved'
             ) AS verified,
             EXISTS (
               SELECT 1 FROM public.user_profiles p
                 JOIN auth.users u ON u.id = p.id
                WHERE p.linked_healer_slug = h2.healer_slug
                  AND p.verification_status = 'approved'
                  AND lower(u.email) = 'love@spiritpedia.co'
             ) AS official
        FROM public.healers h2
    ) v
   WHERE h.healer_slug = v.healer_slug
     AND (h.verified IS DISTINCT FROM v.verified OR h.official IS DISTINCT FROM v.official);

  UPDATE public.publishers pub
     SET verified = v.verified
    FROM (
      SELECT p2.id,
             EXISTS (
               SELECT 1 FROM public.user_profiles p
                WHERE p.linked_publisher_id = p2.id
                  AND p.verification_status = 'approved'
             ) AS verified
        FROM public.publishers p2
    ) v
   WHERE pub.id = v.id
     AND pub.verified IS DISTINCT FROM v.verified;

  PERFORM set_config('app.listing_badges', '', true);
END;
$$;

COMMENT ON FUNCTION public.refresh_listing_badges() IS
  'Recomputes healers.verified, healers.official and publishers.verified from the accounts linked to them (0023). Run by the user_profiles trigger; nobody calls it directly.';

REVOKE ALL ON FUNCTION public.refresh_listing_badges() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.user_profiles_refresh_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.refresh_listing_badges();
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.user_profiles_refresh_badges() FROM PUBLIC, anon, authenticated;

-- Once per statement: approving, unlinking, rejecting, deleting the account
-- (its profile goes with it) all land here.
DROP TRIGGER IF EXISTS user_profiles_refresh_badges ON public.user_profiles;
CREATE TRIGGER user_profiles_refresh_badges
  AFTER INSERT OR DELETE OR UPDATE OF linked_healer_slug, linked_publisher_id, verification_status
  ON public.user_profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.user_profiles_refresh_badges();

-- The badges can only come from refresh_listing_badges(): any other write
-- (the admin's included) keeps what was there, and a new listing starts with
-- neither.
CREATE OR REPLACE FUNCTION public.listings_pin_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('app.listing_badges', true) IS DISTINCT FROM 'on' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.verified := false;
      IF TG_TABLE_NAME = 'healers' THEN NEW.official := false; END IF;
    ELSE
      NEW.verified := OLD.verified;
      IF TG_TABLE_NAME = 'healers' THEN NEW.official := OLD.official; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS healers_pin_badges ON public.healers;
CREATE TRIGGER healers_pin_badges
  BEFORE INSERT OR UPDATE ON public.healers
  FOR EACH ROW EXECUTE FUNCTION public.listings_pin_badges();

DROP TRIGGER IF EXISTS publishers_pin_badges ON public.publishers;
CREATE TRIGGER publishers_pin_badges
  BEFORE INSERT OR UPDATE ON public.publishers
  FOR EACH ROW EXECUTE FUNCTION public.listings_pin_badges();


-- 3. Publisher tiers ------------------------------------------------------
-- The same stored values as healers.tier; only the names shown differ.

ALTER TABLE public.publishers
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'local_hero';

ALTER TABLE public.publishers
  DROP CONSTRAINT IF EXISTS publishers_tier_known;
ALTER TABLE public.publishers
  ADD CONSTRAINT publishers_tier_known CHECK (tier IN ('superhero', 'luminary', 'local_hero'));

COMMENT ON COLUMN public.publishers.tier IS
  'superhero, luminary or local_hero, shown as Superstar, Shining Star or Rising Star. Set by the admin; never for sale.';

UPDATE public.publishers SET tier = 'superhero'
 WHERE slug IN ('hay-house', 'sounds-true') AND tier = 'local_hero';


-- 4. Official reviews -----------------------------------------------------

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS author_official BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.reviews.author_official IS
  'Posted by Spiritpedia''s own account (the healers.official listing): shown as Spiritpedia ✦ OFFICIAL. Set by reviews_pin_author() at posting, never by the client, and frozen after.';

-- "Spiritpedia", whatever the capitals, spaces or punctuation.
CREATE OR REPLACE FUNCTION public.review_name_reserved(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT regexp_replace(lower(coalesce(p_name, '')), '[^a-z]', '', 'g') LIKE '%spiritpedia%';
$$;

-- The 0015 trigger, now also deciding who is Official and keeping the name.
CREATE OR REPLACE FUNCTION public.reviews_pin_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claim TEXT;
  v_official BOOLEAN;
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

  -- review_bans has no policies, so ask through the definer function.
  IF public.review_posting_banned() THEN
    RAISE EXCEPTION 'review posting is not available for this account'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.user_id := COALESCE(auth.uid(), NEW.user_id);
    NEW.created_at := now();
    NEW.status := 'pending';

    SELECT linked_healer_slug INTO v_claim
      FROM public.user_profiles
     WHERE id = NEW.user_id;
    NEW.author_healer_slug := v_claim;

    SELECT official INTO v_official
      FROM public.healers
     WHERE healer_slug = v_claim;
    NEW.author_official := COALESCE(v_official, false);
  ELSE
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
    NEW.content_type := OLD.content_type;
    NEW.content_slug := OLD.content_slug;
    NEW.status := OLD.status;
    NEW.author_healer_slug := OLD.author_healer_slug;
    NEW.author_official := OLD.author_official;
  END IF;

  IF NEW.author_official THEN
    NEW.author_name := 'Spiritpedia';
  ELSIF public.review_name_reserved(NEW.author_name) THEN
    NEW.author_name := NULL;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.reviews_pin_author() IS
  'Pins the columns an author must not control, and refuses any insert or edit from an account in review_bans (0015). On insert: user_id, created_at, status forced to pending, author_healer_slug derived from the users own profile, and author_official from that listing''s healers.official (0023). On update all of those are frozen. An Official review is always named Spiritpedia; anyone else using that name is saved with none. Yields to any role that is not anon or authenticated, which is what lets the service role moderate.';


-- 5. The Spiritpedia listing -------------------------------------------

UPDATE public.healers
   SET entity_type = 'channel',
       website_url = 'https://www.spiritpedia.co',
       booking_url = CASE WHEN booking_url IS NULL THEN NULL ELSE 'https://www.spiritpedia.co' END
 WHERE healer_slug = 'spiritpedia';

-- Everyone's badges, now.
SELECT public.refresh_listing_badges();


-- Check -----------------------------------------------------------------
-- verified_listings: on live, 1 (Spiritpedia). official_listings: 1 on live, 0 on dev.

SELECT
  (SELECT count(*) FROM public.healers WHERE verified) AS verified_listings,
  (SELECT count(*) FROM public.healers WHERE official) AS official_listings,
  (SELECT string_agg(name || ' ' || tier, ', ') FROM public.publishers) AS publisher_tiers,
  EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'author_official'
  ) AS reviews_have_official,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reviews') AS review_policies;
