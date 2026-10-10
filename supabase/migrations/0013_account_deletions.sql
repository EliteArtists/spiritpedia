-- 0013 — a record that an account was deleted, for the admin Inbox.
--
-- Self-serve deletion (POST /api/account/delete, from the website's account
-- page and the app) removes the auth user, and with it — by ON DELETE CASCADE —
-- the profile, saved items, reviews and every admin note about them. What it
-- does NOT remove is a claimed public listing: healers has no foreign key onto
-- the account, and the directory is editorial content. An approved
-- practitioner's contact details (email, booking link, photos) were copied onto
-- that listing, so the Inbox needs to say "this listing's owner has gone —
-- remove what they added".
--
-- An admin_notes row cannot carry that: it would be deleted with the account.
-- Hence this table, which holds NO personal data — no email, no user id, no
-- name. Only what kind of account it was, which listing (if any) it had
-- claimed, and how many uploaded photos were kept because the listing still
-- shows them.
--
-- Service role only: RLS on, no policies, so neither the anon key nor a signed
-- in user can read or write it — the same arrangement as broken_images.

CREATE TABLE IF NOT EXISTS public.account_deletions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL CHECK (source IN ('website', 'app')),
  user_type TEXT,
  linked_healer_slug TEXT,
  kept_image_count INTEGER NOT NULL DEFAULT 0,
  resolved_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE public.account_deletions IS
  'One row per account with a claimed listing deleted by its owner, for the admin Inbox. No personal data. Service role only.';
COMMENT ON COLUMN public.account_deletions.linked_healer_slug IS
  'The public listing the account had claimed, now unclaimed. Its contact details and photos came from the owner and are reviewed for removal.';
COMMENT ON COLUMN public.account_deletions.kept_image_count IS
  'Uploaded photos NOT deleted with the account because the listing still displays them.';
COMMENT ON COLUMN public.account_deletions.resolved_at IS
  'Set when an admin has reviewed the listing. NULL = still in the Inbox.';

CREATE INDEX IF NOT EXISTS account_deletions_open_idx
  ON public.account_deletions (deleted_at)
  WHERE resolved_at IS NULL;

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;
