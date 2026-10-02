CREATE TABLE IF NOT EXISTS public.admin_notes (
  id BIGSERIAL PRIMARY KEY,
  subject_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.admin_notes IS 'Internal admin notes about a user. Never shown to the user. Readable and writable only by the service role.';
COMMENT ON COLUMN public.admin_notes.subject_user_id IS 'The user the note is about, not its author.';
COMMENT ON COLUMN public.admin_notes.created_by IS 'Admin display name from ADMIN_NAME. There is no admin user table yet.';

CREATE INDEX IF NOT EXISTS admin_notes_subject_idx ON public.admin_notes (subject_user_id, created_at DESC);

ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.admin_notes;
DROP POLICY IF EXISTS "Anyone can read admin notes" ON public.admin_notes;
