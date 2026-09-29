CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_type TEXT NOT NULL DEFAULT 'explorer',
  full_name TEXT,
  modality TEXT,
  website_url TEXT,
  booking_url TEXT,
  bio TEXT,
  location_city TEXT,
  location_country TEXT,
  availability_type TEXT,
  youtube_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  twitter_url TEXT,
  subject_slugs TEXT[],
  image_urls TEXT[],
  linked_healer_slug TEXT,
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.user_profiles IS 'Spiritpedia profile data for an auth user. One row per auth.users row.';
COMMENT ON COLUMN public.user_profiles.user_type IS 'explorer or practitioner';
COMMENT ON COLUMN public.user_profiles.linked_healer_slug IS 'healers.healer_slug once a claim is approved. Admin-set only.';
COMMENT ON COLUMN public.user_profiles.verification_status IS 'pending, approved or rejected. Admin-set only.';

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.user_profiles_protect_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
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

DROP TRIGGER IF EXISTS user_profiles_protect_admin_fields ON public.user_profiles;
CREATE TRIGGER user_profiles_protect_admin_fields
BEFORE INSERT OR UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.user_profiles_protect_admin_fields();
