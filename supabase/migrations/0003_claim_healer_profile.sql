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
    NEW.created_at          := now();
  ELSE
    NEW.verification_status := OLD.verification_status;
    NEW.linked_healer_slug  := OLD.linked_healer_slug;
    NEW.id                  := OLD.id;
    NEW.created_at          := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.user_profiles_protect_admin_fields() IS
  'Pins verification_status, linked_healer_slug, id and created_at against ordinary API callers. Yields to app.claim_verified, which only claim_healer_profile() can set.';

CREATE OR REPLACE FUNCTION public.claim_healer_profile(p_slug TEXT)
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
  v_matched BOOLEAN := FALSE;
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

  PERFORM 1 FROM public.healers
   WHERE healer_slug = p_slug
     AND lower(contact_email) = v_email
   LIMIT 1;
  v_matched := FOUND;

  IF NOT v_matched AND NOT (v_domain = ANY (v_free_domains)) THEN
    PERFORM 1 FROM public.healers
     WHERE healer_slug = p_slug
       AND (website_url ILIKE '%' || v_domain || '%' OR youtube_url ILIKE '%' || v_domain || '%')
     LIMIT 1;
    v_matched := FOUND;
  END IF;

  IF NOT v_matched THEN
    RAISE EXCEPTION 'That profile does not match your email address.';
  END IF;

  PERFORM set_config('app.claim_verified', 'true', true);

  INSERT INTO public.user_profiles (id, user_type, linked_healer_slug, verification_status)
  VALUES (v_uid, 'practitioner', p_slug, 'approved')
  ON CONFLICT (id) DO UPDATE
    SET user_type = 'practitioner',
        linked_healer_slug = EXCLUDED.linked_healer_slug,
        verification_status = 'approved'
  RETURNING * INTO v_row;

  PERFORM set_config('app.claim_verified', 'false', true);

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.claim_healer_profile(TEXT) IS
  'Links the caller to a healer profile after re-checking their email against it server side. The only path that may set linked_healer_slug or verification_status from the browser.';

REVOKE ALL ON FUNCTION public.claim_healer_profile(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_healer_profile(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_healer_profile(TEXT) TO authenticated;
