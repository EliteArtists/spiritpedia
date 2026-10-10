-- 0014 — push notifications (Phase 3a): device tokens, preferences, and a
-- record of one-off sends.
--
-- Signed-in accounts only. A token exists only after the person has said yes
-- to notifications in the app (Firebase auto-init is off until then), and it
-- belongs to exactly one account. Every table cascades off auth.users, so
-- deleting an account removes its tokens, preferences and send records.
--
-- Sending is server-side only (web/utils/push.js, with the Firebase service
-- account in Vercel). The app can register and remove its OWN token and edit
-- its OWN preferences; it cannot read anyone else's, and it cannot send.

-- ── Device tokens ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE CHECK (length(token) BETWEEN 1 AND 4096),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version TEXT CHECK (app_version IS NULL OR length(app_version) <= 40),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.push_tokens IS
  'Firebase Cloud Messaging tokens, one per app install that has allowed notifications, each tied to one signed-in account. Written only through register_push_token(); removed on sign-out, when Firebase reports it dead, and (cascade) with the account.';

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own push tokens" ON public.push_tokens;
CREATE POLICY "Users can read own push tokens"
ON public.push_tokens FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push tokens" ON public.push_tokens;
CREATE POLICY "Users can delete own push tokens"
ON public.push_tokens FOR DELETE
USING (auth.uid() = user_id);

-- No INSERT or UPDATE policy: registering goes through the function below,
-- because a token can legitimately move between accounts (one phone, a
-- different person signs in) and the old row belongs to someone else.

-- Register this install's token for the CALLER'S account. If the token was
-- held by another account (the phone changed hands without a sign-out), it
-- moves — a token is the device's address, and the device now belongs to the
-- caller. It can only ever write auth.uid(); nothing else can be named.
-- Keeps the 10 most recently seen tokens per account; older installs drop off.
CREATE OR REPLACE FUNCTION public.register_push_token(
  p_token TEXT,
  p_platform TEXT,
  p_app_version TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;
  IF p_platform NOT IN ('ios', 'android') THEN
    RAISE EXCEPTION 'unknown platform' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.push_tokens (user_id, token, platform, app_version)
  VALUES (v_user, p_token, p_platform, p_app_version)
  ON CONFLICT (token) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        app_version = EXCLUDED.app_version,
        last_seen_at = NOW();

  DELETE FROM public.push_tokens
  WHERE user_id = v_user
    AND id NOT IN (
      SELECT id FROM public.push_tokens
      WHERE user_id = v_user
      ORDER BY last_seen_at DESC
      LIMIT 10
    );
END;
$$;

COMMENT ON FUNCTION public.register_push_token(TEXT, TEXT, TEXT) IS
  'Registers the calling account''s device token (moving it from another account if needed). Signed-in callers only; writes only auth.uid().';

REVOKE ALL ON FUNCTION public.register_push_token(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(TEXT, TEXT, TEXT) TO authenticated;

-- ── Preferences ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  general BOOLEAN NOT NULL DEFAULT TRUE,
  iam_affirmations BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notification_preferences IS
  'Which kinds of notification an account wants. No row = the defaults (general on, IAM affirmations off). iam_affirmations is reserved for the IAM system and not sent yet.';

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can read own notification preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own notification preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ── One-off sends ───────────────────────────────────────────────────────────

-- The duplicate guard for notifications that go out once per account (the
-- welcome). The server inserts the row FIRST and sends only if the insert
-- succeeded; the unique constraint makes a second send impossible however many
-- times, from however many devices, it is asked for.
CREATE TABLE IF NOT EXISTS public.notification_sends (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('welcome')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_sends_once UNIQUE (user_id, kind)
);

COMMENT ON TABLE public.notification_sends IS
  'One row per once-only notification sent to an account (kind = welcome). Service role only.';

-- Service role only: RLS on, no policies.
ALTER TABLE public.notification_sends ENABLE ROW LEVEL SECURITY;
