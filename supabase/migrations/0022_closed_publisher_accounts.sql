-- 0022 — a deleted publisher account flags its listing for review too.
--
-- 0013 made account_deletions for a claimed healer listing (linked_healer_slug).
-- Since 0020 an account can manage a publisher instead (linked_publisher_id),
-- and deleting that account left the publisher listing — with the description
-- and website its owner edited — unreviewed. This adds the publisher beside the
-- healer slug, so the Inbox can say "this publisher's owner has gone".
--
-- Still no personal data: a publisher is a public listing, not a person.
-- ON DELETE SET NULL: deleting the publisher later keeps the note.
-- Service role only, as before (RLS on, no policies). Safe to re-run.

ALTER TABLE public.account_deletions
  ADD COLUMN IF NOT EXISTS linked_publisher_id UUID
    REFERENCES public.publishers(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.account_deletions.linked_publisher_id IS
  'The publisher listing the account managed (migration 0020), now unclaimed. What its owner edited (description, website) is reviewed.';

COMMENT ON TABLE public.account_deletions IS
  'One row per account with a claimed listing (a healer or a publisher) deleted by its owner, for the admin Inbox. No personal data. Service role only.';

-- Check: the new column exists, RLS is still on, and there are no policies.
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'account_deletions'
      AND column_name = 'linked_publisher_id' AND data_type = 'uuid'
  ) AS has_publisher_column,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.account_deletions'::regclass) AS rls_on,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'account_deletions') AS policies;
