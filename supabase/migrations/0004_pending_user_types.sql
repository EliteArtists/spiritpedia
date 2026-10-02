CREATE TABLE IF NOT EXISTS public.pending_user_types (
  email TEXT PRIMARY KEY,
  user_type TEXT NOT NULL DEFAULT 'explorer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT pending_user_types_email_is_lower CHECK (email = lower(email)),
  CONSTRAINT pending_user_types_user_type_valid CHECK (user_type IN ('explorer', 'practitioner'))
);

COMMENT ON TABLE public.pending_user_types IS 'Holds the practitioner/explorer choice between submitting an email and verifying it, so the answer survives a magic link click or a different device. Consumed and deleted once the profile row is created.';

CREATE INDEX IF NOT EXISTS pending_user_types_created_at_idx ON public.pending_user_types (created_at);

ALTER TABLE public.pending_user_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can record a pending choice" ON public.pending_user_types;
CREATE POLICY "Anyone can record a pending choice"
ON public.pending_user_types FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can change a pending choice" ON public.pending_user_types;
CREATE POLICY "Anyone can change a pending choice"
ON public.pending_user_types FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read their own pending choice" ON public.pending_user_types;
CREATE POLICY "Users can read their own pending choice"
ON public.pending_user_types FOR SELECT
TO authenticated
USING (lower(auth.jwt() ->> 'email') = email);

DROP POLICY IF EXISTS "Users can clear their own pending choice" ON public.pending_user_types;
CREATE POLICY "Users can clear their own pending choice"
ON public.pending_user_types FOR DELETE
TO authenticated
USING (lower(auth.jwt() ->> 'email') = email);
